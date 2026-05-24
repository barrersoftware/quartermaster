using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Core.Services;

public class GiveawayService
{
    private readonly IDatabaseService _db;
    private readonly DiscordSocketClient _client;

    public GiveawayService(IDatabaseService db, DiscordSocketClient client)
    {
        _db = db;
        _client = client;
    }

    public async Task CheckGiveawaysAsync()
    {
        var active = await _db.GetActiveGiveawaysAsync();
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        foreach (var g in active)
        {
            if (g.EndTime <= now)
            {
                await EndGiveawayAsync(g);
            }
        }
    }

    public async Task EndGiveawayAsync(Giveaway g)
    {
        try
        {
            var channel = await _client.GetChannelAsync(ulong.Parse(g.ChannelId)) as IMessageChannel;
            if (channel == null) return;

            var message = await channel.GetMessageAsync(ulong.Parse(g.MessageId)) as IUserMessage;
            if (message == null) return;

            var reaction = message.Reactions.FirstOrDefault(r => r.Key.Name == "🎉");
            var users = await message.GetReactionUsersAsync(new Emoji("🎉"), 1000).FlattenAsync();
            var entries = users.Where(u => !u.IsBot).Select(u => u.Id.ToString()).ToList();

            if (!entries.Any())
            {
                await channel.SendMessageAsync($"❌ No one entered the giveaway for **{g.Prize}**.");
                await _db.EndGiveawayAsync(g.MessageId, "[]");
                return;
            }

            var winners = new List<string>();
            var random = new Random();
            for (int i = 0; i < Math.Min(g.WinnerCount, entries.Count); i++)
            {
                int index = random.Next(entries.Count);
                winners.Add(entries[index]);
                entries.RemoveAt(index);
            }

            var winnerMentions = string.Join(", ", winners.Select(id => $"<@{id}>"));
            
            var embed = new EmbedBuilder()
                .WithColor(Color.Green)
                .WithTitle("🎁 GIVEAWAY ENDED!")
                .WithDescription($"Prize: **{g.Prize}**\nWinner(s): {winnerMentions}")
                .WithCurrentTimestamp()
                .Build();

            await message.ModifyAsync(m => m.Embed = embed);
            await channel.SendMessageAsync($"🎊 Congratulations {winnerMentions}! You won the **{g.Prize}**!");

            await _db.EndGiveawayAsync(g.MessageId, JsonSerializer.Serialize(winners));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GIVEAWAY] Error ending giveaway {g.Id}: {ex.Message}");
        }
    }
}
