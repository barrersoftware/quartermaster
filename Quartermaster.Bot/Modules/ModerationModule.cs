using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;

namespace Quartermaster.Bot.Modules;

public class ModerationModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public ModerationModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("warn", "Issue a warning to a member")]
    [RequireUserPermission(GuildPermission.ManageMessages)]
    public async Task WarnAsync(IGuildUser user, string? reason = null)
    {
        if (user.IsBot)
        {
            await RespondAsync("You cannot warn a bot!", ephemeral: true);
            return;
        }

        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_WARN", user.Id.ToString(), $"Reason: {reason ?? "No reason provided"}");
        
        await RespondAsync($"✅ {user.Mention} has been warned. Reason: {reason ?? "None"}", ephemeral: true);
        
        try {
            await user.SendMessageAsync($"⚠️ You have been warned in **{Context.Guild.Name}** for: {reason ?? "No reason provided"}");
        } catch { /* Ignore DM block */ }
    }

    [SlashCommand("kick", "Remove a member from the server")]
    [RequireUserPermission(GuildPermission.KickMembers)]
    [RequireBotPermission(GuildPermission.KickMembers)]
    public async Task KickAsync(IGuildUser user, string? reason = null)
    {
        await user.KickAsync(reason);
        await RespondAsync($"👢 {user.Username} has been kicked from the server.", ephemeral: true);
    }
}
