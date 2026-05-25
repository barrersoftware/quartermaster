using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Discord.WebSocket;

namespace Quartermaster.Bot.Modules;

public partial class EconomyModule
{
    private static readonly ConcurrentDictionary<string, BlackjackGameState> BlackjackGames = new();

    [SlashCommand("blackjack", "Play a game of Blackjack and bet your gold!")]
    public async Task BlackjackAsync(int bet)
    {
        if (bet <= 0)
        {
            await RespondAsync("Bet must be positive!", ephemeral: true);
            return;
        }

        var userId = Context.User.Id.ToString();
        var guildId = Context.Guild.Id.ToString();
        var userData = await _db.GetUserAsync(userId, guildId);

        if (userData == null || userData.Gold < bet)
        {
            await RespondAsync($"❌ You don't have enough gold! Balance: **{userData?.Gold ?? 0}**.", ephemeral: true);
            return;
        }

        userData.Gold -= bet;
        await _db.UpdateUserAsync(userData);

        var game = BlackjackGameState.Create(userId, guildId, bet);
        BlackjackGames[userId] = game;

        await RespondAsync(embed: game.CreateEmbed(Context.User.Username).Build(), components: CreateBlackjackButtons(userId, bet).Build());
    }

    [ComponentInteraction("bj-hit-*-*")]
    public async Task HandleHitAsync(string userId, int bet)
    {
        if (Context.User.Id.ToString() != userId)
        {
            await RespondAsync("This isn't your game!", ephemeral: true);
            return;
        }

        if (!BlackjackGames.TryGetValue(userId, out var game) || game.Bet != bet)
        {
            await RespondAsync("This blackjack game has expired.", ephemeral: true);
            return;
        }

        game.PlayerHand.Add(game.DrawCard());
        if (BlackjackGame.CalculateHandValue(game.PlayerHand) >= 21)
        {
            await ResolveBlackjackAsync(userId, game, standRequested: false);
            return;
        }

        if (Context.Interaction is SocketMessageComponent component)
        {
            await component.UpdateAsync(msg =>
            {
                msg.Embed = game.CreateEmbed(Context.User.Username).Build();
                msg.Components = CreateBlackjackButtons(userId, bet).Build();
            });
        }
    }

    [ComponentInteraction("bj-stand-*-*")]
    public async Task HandleStandAsync(string userId, int bet)
    {
        if (Context.User.Id.ToString() != userId)
        {
            await RespondAsync("This isn't your game!", ephemeral: true);
            return;
        }

        if (!BlackjackGames.TryGetValue(userId, out var game) || game.Bet != bet)
        {
            await RespondAsync("This blackjack game has expired.", ephemeral: true);
            return;
        }

        await ResolveBlackjackAsync(userId, game, standRequested: true);
    }

    private static ComponentBuilder CreateBlackjackButtons(string userId, int bet) =>
        new ComponentBuilder()
            .WithButton("Hit", $"bj-hit-{userId}-{bet}", ButtonStyle.Primary)
            .WithButton("Stand", $"bj-stand-{userId}-{bet}", ButtonStyle.Secondary);

    private async Task ResolveBlackjackAsync(string userId, BlackjackGameState game, bool standRequested)
    {
        var guildId = game.GuildId;
        var userData = await _db.GetUserAsync(userId, guildId);
        if (userData == null)
        {
            BlackjackGames.TryRemove(userId, out _);
            await RespondAsync("Could not resolve your blackjack game.", ephemeral: true);
            return;
        }

        var playerTotal = BlackjackGame.CalculateHandValue(game.PlayerHand);
        if (standRequested)
        {
            while (BlackjackGame.CalculateHandValue(game.DealerHand) < 17)
            {
                game.DealerHand.Add(game.DrawCard());
            }
        }

        var dealerTotal = BlackjackGame.CalculateHandValue(game.DealerHand);
        var embed = game.CreateEmbed(Context.User.Username, true);

        if (playerTotal > 21)
        {
            embed.WithColor(Color.Red).WithDescription("💀 **Bust!** You lost your bet.");
        }
        else if (dealerTotal > 21 || playerTotal > dealerTotal)
        {
            userData.Gold += game.Bet * 2;
            await _db.UpdateUserAsync(userData);
            embed.WithColor(Color.Green).WithDescription($"🎉 **You Win!** You won **{game.Bet * 2:N0}** gold!");
        }
        else if (playerTotal == dealerTotal)
        {
            userData.Gold += game.Bet;
            await _db.UpdateUserAsync(userData);
            embed.WithColor(Color.Gold).WithDescription("🤝 **Push!** Your bet has been returned.");
        }
        else
        {
            embed.WithColor(Color.Red).WithDescription("💀 **Dealer Wins!** You lost your bet.");
        }

        BlackjackGames.TryRemove(userId, out _);
        if (Context.Interaction is SocketMessageComponent component)
        {
            await component.UpdateAsync(msg =>
            {
                msg.Embed = embed.Build();
                msg.Components = new ComponentBuilder().Build();
            });
        }
    }
}

public sealed class BlackjackGameState
{
    public string UserId { get; init; } = string.Empty;
    public string GuildId { get; init; } = string.Empty;
    public int Bet { get; init; }
    public Stack<BlackjackCard> Deck { get; init; } = new();
    public List<BlackjackCard> PlayerHand { get; init; } = new();
    public List<BlackjackCard> DealerHand { get; init; } = new();

    public static BlackjackGameState Create(string userId, string guildId, int bet)
    {
        var deck = BlackjackGame.CreateDeck();
        var state = new BlackjackGameState
        {
            UserId = userId,
            GuildId = guildId,
            Bet = bet,
            Deck = new Stack<BlackjackCard>(deck)
        };

        state.PlayerHand.Add(state.DrawCard());
        state.PlayerHand.Add(state.DrawCard());
        state.DealerHand.Add(state.DrawCard());
        state.DealerHand.Add(state.DrawCard());
        return state;
    }

    public BlackjackCard DrawCard() => Deck.Pop();

    public EmbedBuilder CreateEmbed(string username, bool revealDealer = false)
    {
        var playerTotal = BlackjackGame.CalculateHandValue(PlayerHand);
        var dealerHand = revealDealer ? BlackjackGame.FormatHand(DealerHand) : $"{DealerHand[0]} [?]";
        var dealerTotal = revealDealer ? BlackjackGame.CalculateHandValue(DealerHand).ToString() : "?";

        return new EmbedBuilder()
            .WithTitle("🃏 Blackjack")
            .WithColor(Color.DarkGrey)
            .AddField($"{username}'s Hand ({playerTotal})", BlackjackGame.FormatHand(PlayerHand), true)
            .AddField($"Dealer's Hand ({dealerTotal})", dealerHand, true)
            .WithFooter($"Bet: {Bet:N0} Gold")
            .WithCurrentTimestamp();
    }
}

public readonly record struct BlackjackCard(string Value, string Suit)
{
    public override string ToString() => $"[{Value}{Suit}]";
}

public static class BlackjackGame
{
    private static readonly string[] Suits = ["♠️", "♥️", "♦️", "♣️"];
    private static readonly string[] Values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    public static List<BlackjackCard> CreateDeck()
    {
        var cards = new List<BlackjackCard>();
        foreach (var suit in Suits)
        {
            foreach (var value in Values)
            {
                cards.Add(new BlackjackCard(value, suit));
            }
        }

        return cards.OrderBy(_ => Random.Shared.Next()).ToList();
    }

    public static int CalculateHandValue(IEnumerable<BlackjackCard> hand)
    {
        var total = 0;
        var aces = 0;
        foreach (var card in hand)
        {
            switch (card.Value)
            {
                case "A":
                    aces++;
                    total += 11;
                    break;
                case "J":
                case "Q":
                case "K":
                    total += 10;
                    break;
                default:
                    total += int.Parse(card.Value);
                    break;
            }
        }

        while (total > 21 && aces > 0)
        {
            total -= 10;
            aces--;
        }

        return total;
    }

    public static string FormatHand(IEnumerable<BlackjackCard> hand) => string.Join(" ", hand.Select(card => card.ToString()));
}
