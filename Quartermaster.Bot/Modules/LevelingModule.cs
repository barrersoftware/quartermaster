using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Services;

namespace Quartermaster.Bot.Modules;

public class LevelingModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;
    private readonly LevelingService _leveling;
    private readonly VisualService _visuals;

    public LevelingModule(IDatabaseService db, LevelingService leveling, VisualService visuals)
    {
        _db = db;
        _leveling = leveling;
        _visuals = visuals;
    }

    [SlashCommand("rank", "View your current rank and XP")]
    public async Task RankAsync(IUser? user = null)
    {
        await DeferAsync();
        user ??= Context.User;
        var guildId = Context.Guild.Id.ToString();
        var userData = await _db.GetUserAsync(user.Id.ToString(), guildId);

        if (userData == null)
        {
            await FollowupAsync($"{user.Mention} hasn't earned any XP yet!", ephemeral: true);
            return;
        }

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        
        // Calculate Rank (placeholder logic for now)
        int rank = 1; 

        var imageBytes = await _visuals.CreateRankCardAsync(
            user.Username,
            userData.Level,
            rank,
            userData.Xp,
            _leveling.CalculateXpForLevel(userData.Level + 1),
            user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl(),
            settings.RankCardColor,
            settings.RankBackground
        );

        using var ms = new System.IO.MemoryStream(imageBytes);
        await FollowupWithFileAsync(ms, "rank.png");
    }

    [SlashCommand("leaderboard", "View the server leaderboard")]
    public async Task LeaderboardAsync()
    {
        // For now, let's just implement a placeholder
        // In the real one, we'd fetch top users from DB
        await RespondAsync("Leaderboard logic coming soon in C#!", ephemeral: true);
    }
}
