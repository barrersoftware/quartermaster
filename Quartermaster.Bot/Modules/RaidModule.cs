using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;

namespace Quartermaster.Bot.Modules;

public class RaidModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public RaidModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("raidprotection", "Enable or disable raid protection")]
    [RequireUserPermission(GuildPermission.Administrator)]
    public async Task RaidProtectionAsync(bool enabled)
    {
        var settings = await _db.GetRaidSettingsOrDefaultAsync(Context.Guild.Id.ToString());
        settings.Enabled = enabled ? 1 : 0;
        await _db.UpdateRaidSettingsAsync(settings);
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "RAID_PROTECTION", Context.User.Id.ToString(), enabled ? "Raid protection enabled" : "Raid protection disabled");
        await RespondAsync(enabled ? "🛡️ Raid protection enabled." : "⛔ Raid protection disabled.", ephemeral: true);
    }

    [SlashCommand("endlockdown", "Remove lockdown slowmode from all text channels")]
    [RequireUserPermission(GuildPermission.Administrator)]
    [RequireBotPermission(GuildPermission.ManageChannels)]
    public async Task EndLockdownAsync()
    {
        foreach (var channel in Context.Guild.TextChannels)
        {
            await channel.ModifyAsync(properties => properties.SlowModeInterval = 0);
        }

        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "RAID_LOCKDOWN_END", Context.User.Id.ToString(), "Manual lockdown end");
        await RespondAsync("✅ Lockdown ended and slowmode removed from all text channels.", ephemeral: true);
    }

    [SlashCommand("raidlogs", "Show recent raid incidents")]
    [RequireUserPermission(GuildPermission.ModerateMembers)]
    public async Task RaidLogsAsync()
    {
        var logs = (await _db.GetAuditLogsAsync(Context.Guild.Id.ToString(), 50))
            .Where(log => log.Type.StartsWith("RAID", System.StringComparison.OrdinalIgnoreCase))
            .Take(10)
            .ToList();

        if (logs.Count == 0)
        {
            await RespondAsync("No raid incidents have been logged yet.", ephemeral: true);
            return;
        }

        var embed = new EmbedBuilder()
            .WithTitle("🚨 Recent Raid Incidents")
            .WithColor(Color.Orange)
            .WithDescription(string.Join("\n\n", logs.Select(log => $"**{log.Type}**\n{log.Content}\n<t:{log.Timestamp}:f>")))
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed, ephemeral: true);
    }
}
