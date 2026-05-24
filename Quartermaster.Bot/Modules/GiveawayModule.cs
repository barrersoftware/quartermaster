using System;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

[Group("giveaway", "Manage community giveaways")]
public class GiveawayModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public GiveawayModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("start", "Start a new giveaway")]
    [RequireUserPermission(GuildPermission.ManageMessages)]
    public async Task StartAsync(string duration, int winners, string prize)
    {
        // Simple duration parser: 1h, 1d, 10m
        var unit = duration[^1];
        if (!int.TryParse(duration[..^1], out int amount))
        {
            await RespondAsync("Invalid duration format! Use e.g., 1h, 1d.", ephemeral: true);
            return;
        }

        var timeSpan = unit switch
        {
            's' => TimeSpan.FromSeconds(amount),
            'm' => TimeSpan.FromMinutes(amount),
            'h' => TimeSpan.FromHours(amount),
            'd' => TimeSpan.FromDays(amount),
            _ => TimeSpan.Zero
        };

        if (timeSpan == TimeSpan.Zero)
        {
            await RespondAsync("Invalid unit! Use s, m, h, or d.", ephemeral: true);
            return;
        }

        var endTime = DateTimeOffset.UtcNow.Add(timeSpan).ToUnixTimeSeconds();

        var embed = new EmbedBuilder()
            .WithColor(Color.Blue)
            .WithTitle("🎁 GIVEAWAY STARTING!")
            .WithDescription($"Prize: **{prize}**\nReact with 🎉 to enter!\n\nEnds: <t:{endTime}:R>\nHosted by: {Context.User.Mention}")
            .WithFooter($"{winners} winner(s)")
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed);
        var message = await GetOriginalResponseAsync();
        await message.AddReactionAsync(new Emoji("🎉"));

        await _db.AddGiveawayAsync(new Giveaway
        {
            GuildId = Context.Guild.Id.ToString(),
            ChannelId = Context.Channel.Id.ToString(),
            MessageId = message.Id.ToString(),
            Prize = prize,
            WinnerCount = winners,
            EndTime = endTime
        });
    }
}
