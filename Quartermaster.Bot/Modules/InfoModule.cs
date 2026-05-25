using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;

namespace Quartermaster.Bot.Modules;

public class InfoModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public InfoModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("server-summary", "View a detailed summary of this server")]
    public async Task ServerSummaryAsync()
    {
        await DeferAsync();
        var guild = Context.Guild;
        var guildId = guild.Id.ToString();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        var automod = await _db.GetAutomodSettingsOrDefaultAsync(guildId);
        var triggers = await _db.GetTriggersAsync(guildId);
        var reactionRoles = await _db.GetReactionRolesAsync(guildId);
        var leaderboard = await _db.GetLeaderboardAsync(guildId, 1000);
        
        long totalXp = leaderboard.Sum(u => u.Xp);

        var embed = new EmbedBuilder()
            .WithTitle($"📊 Server Summary: {guild.Name}")
            .WithColor(Color.Blue)
            .WithThumbnailUrl(guild.IconUrl)
            .AddField("👥 Members", guild.MemberCount.ToString(), true)
            .AddField("📈 Total XP", totalXp.ToString("N0"), true)
            .AddField("🏆 Active Chatters", leaderboard.Count().ToString(), true)
            .AddField("💎 Engagement", $"Triggers: {triggers.Count()}\nReaction Roles: {reactionRoles.Count()}", true)
            .WithFooter("Quartermaster .NET • Community Managed")
            .WithCurrentTimestamp()
            .Build();

        await FollowupAsync(embed: embed);
    }
}
