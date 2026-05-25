using System;
using System.Reflection;
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
using System.Linq;

namespace Quartermaster.Bot;

public class DiscordBotService : BackgroundService
{
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

        // Initialize services that need to hook into events
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

        // Wire up events
        _client.MessageReceived += HandleMessageAsync;
        _client.InteractionCreated += HandleInteractionAsync;
        _client.ReactionAdded += HandleReactionAddedAsync;
        _client.ReactionRemoved += HandleReactionRemovedAsync;
        _client.UserJoined += HandleUserJoinedAsync;

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
        if (rawMessage is not SocketUserMessage message || message.Author.IsBot) return;

        // Create a scope for message-level services (DB, etc.)
        using var scope = _services.CreateScope();
        
        // 1. Auto-Moderation (High Priority)
        var automod = scope.ServiceProvider.GetRequiredService<Services.AutomodService>();
        if (await automod.IsMessageBlockedAsync(message)) return;

        // 2. Advanced Triggers (Smart Responses)
        var triggers = scope.ServiceProvider.GetRequiredService<Core.Services.TriggerService>();
        if (await triggers.HandleTriggersAsync(message)) return;

        // 3. Leveling & XP
        var leveling = scope.ServiceProvider.GetRequiredService<Core.Services.LevelingService>();
        // Award 15-25 XP
        var xpAmount = new Random().Next(15, 26);
        var guild = ((SocketGuildChannel)message.Channel).Guild;
        var result = await leveling.AddXpAsync(message.Author.Id.ToString(), guild.Id.ToString(), xpAmount);

        if (result.LeveledUp)
        {
            var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
            var settings = await db.GetGuildSettingsOrDefaultAsync(guild.Id.ToString());
            
            var targetChannel = settings.LevelUpChannel != null 
                ? (guild.GetTextChannel(ulong.Parse(settings.LevelUpChannel)) ?? (IMessageChannel)message.Channel)
                : message.Channel;

            await targetChannel.SendMessageAsync($"Congratulations {message.Author.Mention}, you just advanced to level {result.NewLevel}!");
        }
        
        var argPos = 0;
        if (message.HasStringPrefix(_config.Prefix, ref argPos))
        {
            var context = new SocketCommandContext(_client, message);
            await _commands.ExecuteAsync(context, argPos, scope.ServiceProvider);
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
                await interaction.GetOriginalResponseAsync().ContinueWith(async (msg) => await msg.Result.DeleteAsync());
            }
        }
    }

    private async Task HandleReactionAddedAsync(Cacheable<IUserMessage, ulong> cachedMessage, Cacheable<IMessageChannel, ulong> cachedChannel, SocketReaction reaction)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
        
        // 1. Starboard
        var starboard = scope.ServiceProvider.GetRequiredService<Core.Services.StarboardService>();
        await starboard.HandleReactionAsync(cachedMessage, cachedChannel, reaction);
        
        // 2. Reaction Roles
        if (reaction.User.Value is not IGuildUser user || user.IsBot) return;
        
        var guildId = user.Guild.Id.ToString();
        var reactionRoles = await db.GetReactionRolesAsync(guildId);
        
        var match = reactionRoles.FirstOrDefault(rr => 
            rr.MessageId == reaction.MessageId.ToString() && 
            rr.Emoji == reaction.Emote.Name);

        if (match != null)
        {
            var role = user.Guild.GetRole(ulong.Parse(match.RoleId));
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

        if (match != null)
        {
            var role = user.Guild.GetRole(ulong.Parse(match.RoleId));
            if (role != null) await user.RemoveRoleAsync(role);
        }
    }

    private async Task HandleUserJoinedAsync(SocketGuildUser user)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Core.Data.IDatabaseService>();
        var visuals = scope.ServiceProvider.GetRequiredService<Core.Services.VisualService>();
        
        var guildId = user.Guild.Id.ToString();
        var settings = await db.GetGuildSettingsOrDefaultAsync(guildId);

        // 1. Auto-Role
        if (!string.IsNullOrEmpty(settings.AutoRole))
        {
            var role = user.Guild.GetRole(ulong.Parse(settings.AutoRole));
            if (role != null) await user.AddRoleAsync(role);
        }

        // 2. Welcome Message & Card
        if (!string.IsNullOrEmpty(settings.WelcomeChannel))
        {
            var channel = user.Guild.TextChannels.FirstOrDefault(c => c.Name == settings.WelcomeChannel);
            if (channel != null)
            {
                var imageBytes = await visuals.CreateWelcomeCardAsync(
                    user.Username,
                    user.Guild.MemberCount,
                    user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl(),
                    settings.WelcomeBackground
                );

                using var ms = new System.IO.MemoryStream(imageBytes);
                await channel.SendFileAsync(ms, "welcome.png", $"Welcome {user.Mention} to **{user.Guild.Name}**!");
            }
        }
    }
}
