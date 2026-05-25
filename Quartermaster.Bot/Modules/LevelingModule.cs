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
        
        // Calculate Actual Rank
        int rank = await _db.GetUserRankAsync(user.Id.ToString(), guildId);

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
        await DeferAsync();
        var guildId = Context.Guild.Id.ToString();
        var topUsers = await _db.GetLeaderboardAsync(guildId, 10);

        var embed = new EmbedBuilder()
            .WithTitle($"🏆 {Context.Guild.Name} Leaderboard")
            .WithColor(Color.Gold)
            .WithThumbnailUrl(Context.Guild.IconUrl)
            .WithCurrentTimestamp();

        int pos = 1;
        var description = "";
        foreach (var user in topUsers)
        {
            var discordUser = await Context.Client.GetUserAsync(ulong.Parse(user.UserId));
            var name = discordUser?.Username ?? "Unknown User";
            description += $"**{pos}. {name}** — Level {user.Level} ({user.Xp:N0} XP)\n";
            pos++;
        }

        if (string.IsNullOrEmpty(description)) description = "No users found on the leaderboard.";
        embed.WithDescription(description);

        await FollowupAsync(embed: embed.Build());
    }
}
