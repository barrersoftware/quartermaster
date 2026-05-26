using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Discord;
using Discord.Commands;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Quartermaster.Bot;

public class DiscordBotService : BackgroundService
{
    private static readonly ConcurrentDictionary<string, Queue<DateTimeOffset>> JoinTracker = new();

    private readonly ILogger<DiscordBotService> _logger;
    private readonly IServiceProvider _services;
    private readonly DiscordSocketClient _client;
    private readonly CommandService _commands;
    private readonly InteractionService _interactions;
    private readonly BotConfiguration _config;

    public DiscordBotService(
        ILogger<DiscordBotService> logger,
        IServiceProvider services,
        DiscordSocketClient client,
        CommandService commands,
        InteractionService interactions,
        IOptions<BotConfiguration> config)
    {
        _logger = logger;
        _services = services;
        _client = client;
        _commands = commands;
        _interactions = interactions;
        _config = config.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _client.Log += LogAsync;
        _commands.Log += LogAsync;
        _interactions.Log += LogAsync;

        using (var scope = _services.CreateScope())
        {
            await _commands.AddModulesAsync(Assembly.GetExecutingAssembly(), scope.ServiceProvider);
            await _interactions.AddModulesAsync(Assembly.GetExecutingAssembly(), scope.ServiceProvider);
        }

        _client.Ready += async () =>
        {
            _logger.LogInformation("Bot is ready! Connected as {User}", _client.CurrentUser);
            await _interactions.RegisterCommandsGloballyAsync();
        };

        _client.MessageReceived += HandleMessageAsync;
        _client.InteractionCreated += HandleInteractionAsync;
        _client.ReactionAdded += HandleReactionAddedAsync;
        _client.ReactionRemoved += HandleReactionRemovedAsync;
        _client.UserJoined += HandleUserJoinedAsync;
        _client.UserLeft += HandleUserLeftAsync;

        try
        {
            await _client.LoginAsync(TokenType.Bot, _config.Token);
            await _client.StartAsync();
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Failed to start the Discord bot. Please check your token in appsettings.json.");
            return;
        }

        try
        {
            await Task.Delay(-1, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            _logger.LogInformation("Bot is shutting down...");
        }
        finally
        {
            await _client.StopAsync();
        }
    }

    private Task LogAsync(LogMessage msg)
    {
        var logLevel = msg.Severity switch
        {
            LogSeverity.Critical => LogLevel.Critical,
            LogSeverity.Error => LogLevel.Error,
            LogSeverity.Warning => LogLevel.Warning,
            LogSeverity.Info => LogLevel.Information,
            LogSeverity.Verbose => LogLevel.Debug,
            LogSeverity.Debug => LogLevel.Trace,
            _ => LogLevel.Information
        };

        _logger.Log(logLevel, msg.Exception, "{Source}: {Message}", msg.Source, msg.Message);
        return Task.CompletedTask;
    }

    private async Task HandleMessageAsync(SocketMessage rawMessage)
    {
        if (rawMessage is not SocketUserMessage message || message.Author.IsBot || message.Channel is not SocketGuildChannel guildChannel) return;

        using var scope = _services.CreateScope();

        var automod = scope.ServiceProvider.GetRequiredService<Services.AutomodService>();
        if (await automod.IsMessageBlockedAsync(message)) return;

        var triggers = scope.ServiceProvider.GetRequiredService<Core.Services.TriggerService>();
        if (await triggers.HandleTriggersAsync(message)) return;

        var leveling = scope.ServiceProvider.GetRequiredService<Core.Services.LevelingService>();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
        var guild = guildChannel.Guild;
        var settings = await db.GetGuildSettingsOrDefaultAsync(guild.Id.ToString());

        if (settings.LevelingEnabled == 1)
        {
            var result = await leveling.AddXpAsync(message.Author.Id.ToString(), guild.Id.ToString(), Random.Shared.Next(15, 26));

            if (result.LeveledUp)
            {
                var targetChannel = TryGetTextChannel(guild, settings.LevelUpChannel) ?? (IMessageChannel)message.Channel;
                var levelUpMessage = string.IsNullOrWhiteSpace(settings.LevelUpMessage)
                    ? "Congratulations {user}, you just advanced to level {level}!"
                    : settings.LevelUpMessage;

                await targetChannel.SendMessageAsync(levelUpMessage
                    .Replace("{user}", message.Author.Mention, StringComparison.OrdinalIgnoreCase)
                    .Replace("{level}", result.NewLevel.ToString(), StringComparison.OrdinalIgnoreCase));

                var reward = (await db.GetRoleRewardsAsync(guild.Id.ToString())).FirstOrDefault(rr => rr.Level == result.NewLevel);
                if (reward != null && ulong.TryParse(reward.RoleId, out var roleId) && guild.GetUser(message.Author.Id) is { } member)
                {
                    var role = guild.GetRole(roleId);
                    if (role != null && !member.Roles.Any(existingRole => existingRole.Id == role.Id))
                    {
                        await member.AddRoleAsync(role);
                    }
                }
            }
        }

        var argPos = 0;
        if (!message.HasStringPrefix(_config.Prefix, ref argPos)) return;

        var context = new SocketCommandContext(_client, message);
        var commandName = message.Content[argPos..].Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.ToLowerInvariant();
        var resultCommand = await _commands.ExecuteAsync(context, argPos, scope.ServiceProvider);
        if (resultCommand.IsSuccess || string.IsNullOrWhiteSpace(commandName) || resultCommand.Error != CommandError.UnknownCommand) return;

        var customCommand = (await db.GetCustomCommandsAsync(guild.Id.ToString()))
            .FirstOrDefault(cmd => string.Equals(cmd.CommandName, commandName, StringComparison.OrdinalIgnoreCase));
        if (customCommand != null)
        {
            await message.Channel.SendMessageAsync(customCommand.Response);
        }
    }

    private async Task HandleInteractionAsync(SocketInteraction interaction)
    {
        try
        {
            var context = new SocketInteractionContext(_client, interaction);
            await _interactions.ExecuteCommandAsync(context, _services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling interaction");
            if (interaction.Type == InteractionType.ApplicationCommand)
            {
                await interaction.GetOriginalResponseAsync().ContinueWith(async msg => await msg.Result.DeleteAsync());
            }
        }
    }

    private async Task HandleReactionAddedAsync(Cacheable<IUserMessage, ulong> cachedMessage, Cacheable<IMessageChannel, ulong> cachedChannel, SocketReaction reaction)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();

        var starboard = scope.ServiceProvider.GetRequiredService<Core.Services.StarboardService>();
        await starboard.HandleReactionAsync(cachedMessage, cachedChannel, reaction);

        if (reaction.User.Value is not IGuildUser user || user.IsBot) return;

        var guildId = user.Guild.Id.ToString();
        var reactionRoles = await db.GetReactionRolesAsync(guildId);

        var match = reactionRoles.FirstOrDefault(rr =>
            rr.MessageId == reaction.MessageId.ToString() &&
            rr.Emoji == reaction.Emote.Name);

        if (match != null && ulong.TryParse(match.RoleId, out var roleId))
        {
            var role = user.Guild.GetRole(roleId);
            if (role != null) await user.AddRoleAsync(role);
        }
    }

    private async Task HandleReactionRemovedAsync(Cacheable<IUserMessage, ulong> cachedMessage, Cacheable<IMessageChannel, ulong> cachedChannel, SocketReaction reaction)
    {
        if (!reaction.User.IsSpecified || reaction.User.Value is not IGuildUser user || user.IsBot) return;

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();

        var guildId = user.Guild.Id.ToString();
        var reactionRoles = await db.GetReactionRolesAsync(guildId);

        var match = reactionRoles.FirstOrDefault(rr =>
            rr.MessageId == reaction.MessageId.ToString() &&
            rr.Emoji == reaction.Emote.Name);

        if (match != null && ulong.TryParse(match.RoleId, out var roleId))
        {
            var role = user.Guild.GetRole(roleId);
            if (role != null) await user.RemoveRoleAsync(role);
        }
    }

    private async Task HandleUserJoinedAsync(SocketGuildUser user)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
        var visuals = scope.ServiceProvider.GetRequiredService<Core.Services.VisualService>();

        var guildId = user.Guild.Id.ToString();
        if (await HandleRaidDetectionAsync(user, db))
        {
            return;
        }

        var settings = await db.GetGuildSettingsOrDefaultAsync(guildId);

        if (!string.IsNullOrEmpty(settings.AutoRole) && ulong.TryParse(settings.AutoRole, out var autoRoleId))
        {
            var role = user.Guild.GetRole(autoRoleId);
            if (role != null) await user.AddRoleAsync(role);
        }

        var channel = TryGetTextChannel(user.Guild, settings.WelcomeChannel);
        if (channel == null) return;

        var imageBytes = await visuals.CreateWelcomeCardAsync(
            user.Username,
            user.Guild.MemberCount,
            user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl(),
            settings.WelcomeBackground);

        var welcomeMessage = string.IsNullOrWhiteSpace(settings.WelcomeMessage)
            ? $"Welcome {user.Mention} to **{user.Guild.Name}**!"
            : settings.WelcomeMessage
                .Replace("{user}", user.Mention, StringComparison.OrdinalIgnoreCase)
                .Replace("{server}", user.Guild.Name, StringComparison.OrdinalIgnoreCase)
                .Replace("{memberCount}", user.Guild.MemberCount.ToString(), StringComparison.OrdinalIgnoreCase);

        using var ms = new System.IO.MemoryStream(imageBytes);
        await channel.SendFileAsync(ms, "welcome.png", welcomeMessage);
    }

    private async Task HandleUserLeftAsync(SocketGuild guild, SocketUser user)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
        var settings = await db.GetGuildSettingsOrDefaultAsync(guild.Id.ToString());
        var channel = TryGetTextChannel(guild, settings.LeaveChannel);
        if (channel == null) return;

        var leaveMessage = string.IsNullOrWhiteSpace(settings.LeaveMessage)
            ? $"{user.Username} has left the server. We now have {guild.MemberCount} members."
            : settings.LeaveMessage
                .Replace("{user}", user.Username, StringComparison.OrdinalIgnoreCase)
                .Replace("{server}", guild.Name, StringComparison.OrdinalIgnoreCase)
                .Replace("{memberCount}", guild.MemberCount.ToString(), StringComparison.OrdinalIgnoreCase);

        await channel.SendMessageAsync(leaveMessage);
    }

    private async Task<bool> HandleRaidDetectionAsync(SocketGuildUser user, Core.Data.IDatabaseService db)
    {
        var guildId = user.Guild.Id.ToString();
        var settings = await db.GetRaidSettingsOrDefaultAsync(guildId);
        var queue = JoinTracker.GetOrAdd(guildId, _ => new Queue<DateTimeOffset>());
        var now = DateTimeOffset.UtcNow;
        var timeWindow = settings.TimeWindow > 0 ? settings.TimeWindow : 10;
        var threshold = settings.JoinThreshold > 0 ? settings.JoinThreshold : 5;
        var recentCount = 0;

        lock (queue)
        {
            queue.Enqueue(now);
            while (queue.Count > 0 && (now - queue.Peek()).TotalSeconds > timeWindow)
            {
                queue.Dequeue();
            }

            recentCount = queue.Count;
        }

        if (settings.Enabled != 1 || recentCount <= threshold)
        {
            return false;
        }

        var content = $"Detected {recentCount} joins within {timeWindow} seconds. Action: {settings.Action}. User: {user.Id}";
        await db.AddAuditLogAsync(guildId, "RAID_DETECTED", user.Id.ToString(), content);
        await db.AddRaidIncidentAsync(guildId, recentCount, settings.Action, JsonSerializer.Serialize(new[] { user.Id.ToString() }));

        var alertChannel = TryGetTextChannel(user.Guild, settings.AlertChannel);
        if (alertChannel != null)
        {
            var embed = new EmbedBuilder()
                .WithTitle("🚨 Raid Detected")
                .WithColor(Color.Red)
                .WithDescription($"{recentCount} joins detected in {timeWindow} seconds.")
                .AddField("Action", settings.Action, true)
                .AddField("Latest User", user.Mention, true)
                .WithCurrentTimestamp()
                .Build();
            await alertChannel.SendMessageAsync(embed: embed);
        }

        switch ((settings.Action ?? "kick").ToLowerInvariant())
        {
            case "kick":
                await user.KickAsync("Raid protection triggered");
                break;
            case "ban":
                await user.BanAsync(0, "Raid protection triggered");
                break;
            case "lockdown":
                foreach (var channel in user.Guild.TextChannels)
                {
                    await channel.ModifyAsync(props => props.SlowModeInterval = 10);
                }
                await db.AddAuditLogAsync(guildId, "RAID_LOCKDOWN", user.Id.ToString(), "Applied 10-second slowmode to all text channels");
                break;
        }

        return true;
    }

    private static SocketTextChannel? TryGetTextChannel(SocketGuild guild, string? channelIdOrName)
    {
        if (string.IsNullOrWhiteSpace(channelIdOrName)) return null;
        if (ulong.TryParse(channelIdOrName, out var channelId))
        {
            return guild.GetTextChannel(channelId);
        }

        return guild.TextChannels.FirstOrDefault(channel =>
            string.Equals(channel.Name, channelIdOrName, StringComparison.OrdinalIgnoreCase));
    }
}
