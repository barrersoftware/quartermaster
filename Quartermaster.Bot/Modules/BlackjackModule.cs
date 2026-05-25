using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

public partial class EconomyModule
{
    [SlashCommand("blackjack", "Play a game of Blackjack and bet your gold!")]
    public async Task BlackjackAsync(int bet)
    {
        if (bet <= 0) { await RespondAsync("Bet must be positive!", ephemeral: true); return; }

        var userId = Context.User.Id.ToString();
        var guildId = Context.Guild.Id.ToString();
        var userData = await _db.GetUserAsync(userId, guildId);

        if (userData == null || userData.Gold < bet)
        {
            await RespondAsync($"❌ You don't have enough gold! Balance: **{userData?.Gold ?? 0}**.", ephemeral: true);
            return;
        }

        // Deduct bet first
        userData.Gold -= bet;
        await _db.UpdateUserAsync(userData);

        var game = new BlackjackGame(bet);
        var embed = game.CreateEmbed(Context.User.Username);

        var builder = new ComponentBuilder()
            .WithButton("Hit", $"bj-hit-{userId}-{bet}", ButtonStyle.Primary)
            .WithButton("Stand", $"bj-stand-{userId}-{bet}", ButtonStyle.Secondary);

        await RespondAsync(embed: embed.Build(), components: builder.Build());
    }

    [ComponentInteraction("bj-hit-*-*")]
    public async Task HandleHitAsync(string userId, int bet)
    {
        if (Context.User.Id.ToString() != userId) { await RespondAsync("This isn't your game!", ephemeral: true); return; }
        
        // Simplified: In a full production bot, we'd store the game state in memory or Redis.
        // For now, let's just implement a placeholder or finish the logic if possible.
        await RespondAsync("Blackjack interactions are being finalized in C#!", ephemeral: true);
    }
}

public class BlackjackGame
{
    public int Bet { get; }
    public List<string> PlayerHand { get; } = new();
    public List<string> DealerHand { get; } = new();

    public BlackjackGame(int bet)
    {
        Bet = bet;
        // Basic deal
        PlayerHand.Add(GetRandomCard());
        PlayerHand.Add(GetRandomCard());
        DealerHand.Add(GetRandomCard());
        DealerHand.Add("??");
    }

    private string GetRandomCard()
    {
        string[] values = { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
        string[] suits = { "♠️", "♥️", "♦️", "♣️" };
        return $"[{values[new Random().Next(values.Length)]}{suits[new Random().Next(suits.Length)]}]";
    }

    public EmbedBuilder CreateEmbed(string username)
    {
        return new EmbedBuilder()
            .WithTitle("🃏 Blackjack")
            .WithColor(Color.DarkGrey)
            .AddField($"{username}'s Hand", string.Join(" ", PlayerHand), true)
            .AddField("Dealer's Hand", string.Join(" ", DealerHand), true)
            .WithFooter($"Bet: {Bet:N0} Gold")
            .WithCurrentTimestamp();
    }
}
