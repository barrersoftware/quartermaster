using System;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

public partial class EconomyModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public EconomyModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("balance", "Check your current gold balance")]
    public async Task BalanceAsync(IUser? user = null)
    {
        user ??= Context.User;
        var userData = await _db.GetUserAsync(user.Id.ToString(), Context.Guild.Id.ToString());
        int gold = userData?.Gold ?? 0;

        await RespondAsync($"💰 {user.Mention} has **{gold:N0}** Pirate Gold.");
    }

    [SlashCommand("daily", "Claim your daily gold allowance")]
    public async Task DailyAsync()
    {
        var guildId = Context.Guild.Id.ToString();
        var userId = Context.User.Id.ToString();
        var userData = await _db.GetUserAsync(userId, guildId) ?? new User { UserId = userId, GuildId = guildId };

        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        long cooldown = 24 * 60 * 60 * 1000;

        if (now - userData.LastDaily < cooldown)
        {
            var nextClaim = DateTimeOffset.FromUnixTimeMilliseconds(userData.LastDaily + cooldown);
            var timeLeft = nextClaim - DateTimeOffset.UtcNow;
            await RespondAsync($"⏳ You've already claimed your daily rations! Come back in **{timeLeft.Hours}h {timeLeft.Minutes}m**.", ephemeral: true);
            return;
        }

        int amount = 250;
        userData.Gold += amount;
        userData.LastDaily = now;

        await _db.UpdateUserAsync(userData);
        await RespondAsync($"💰 **Daily Rations Claimed!** You received **{amount}** Pirate Gold. New balance: **{userData.Gold:N0}**.");
    }

    [SlashCommand("coinflip", "Bet your gold on a coin flip!")]
    public async Task CoinflipAsync(int bet, [Choice("Heads", "heads"), Choice("Tails", "tails")] string side)
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

        userData.Gold -= bet;
        bool win = new Random().Next(0, 2) == 0;
        string result = win ? side : (side == "heads" ? "tails" : "heads");

        if (win)
        {
            userData.Gold += bet * 2;
            await RespondAsync($"🪙 The coin landed on **{result.ToUpper()}**! 🎉 You won **{bet:N0}** gold! New balance: **{userData.Gold:N0}**.");
        }
        else
        {
            await RespondAsync($"🪙 The coin landed on **{result.ToUpper()}**! 💀 You lost **{bet:N0}** gold. New balance: **{userData.Gold:N0}**.");
        }

        await _db.UpdateUserAsync(userData);
    }
}
