using System;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

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

        var guildId = Context.Guild.Id.ToString();
        var messageReason = reason ?? "No reason provided";
        await _db.AddWarningAsync(new Warning
        {
            UserId = user.Id.ToString(),
            GuildId = guildId,
            ModeratorId = Context.User.Id.ToString(),
            Reason = messageReason,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
        var warnings = (await _db.GetWarningsAsync(guildId, user.Id.ToString())).ToList();
        await _db.AddAuditLogAsync(guildId, "MOD_WARN", user.Id.ToString(), $"Reason: {messageReason}");

        var embed = new EmbedBuilder()
            .WithColor(Color.Gold)
            .WithTitle("⚠️ User Warned")
            .WithDescription($"{user.Mention} has been warned.")
            .AddField("Moderator", Context.User.Mention, true)
            .AddField("Total Warnings", warnings.Count.ToString(), true)
            .AddField("Reason", messageReason, false)
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed, ephemeral: true);

        try
        {
            await user.SendMessageAsync($"⚠️ You have been warned in **{Context.Guild.Name}** for: {messageReason}\nTotal warnings: {warnings.Count}");
        }
        catch
        {
        }
    }

    [SlashCommand("kick", "Remove a member from the server")]
    [RequireUserPermission(GuildPermission.KickMembers)]
    [RequireBotPermission(GuildPermission.KickMembers)]
    public async Task KickAsync(IGuildUser user, string? reason = null)
    {
        await user.KickAsync(reason);
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_KICK", user.Id.ToString(), reason ?? "No reason provided");
        await RespondAsync($"👢 {user.Username} has been kicked from the server.", ephemeral: true);
    }

    [SlashCommand("ban", "Ban a member from the server")]
    [RequireUserPermission(GuildPermission.BanMembers)]
    [RequireBotPermission(GuildPermission.BanMembers)]
    public async Task BanAsync(IGuildUser user, string? reason = null)
    {
        var messageReason = reason ?? "No reason provided";
        await user.SendMessageAsync($"You have been banned from **{Context.Guild.Name}**. Reason: {messageReason}").ContinueWith(_ => Task.CompletedTask);
        await user.Guild.AddBanAsync(user, 0, messageReason);
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_BAN", user.Id.ToString(), messageReason);
        await RespondAsync($"🔨 {user.Username} has been banned. Reason: {messageReason}", ephemeral: true);
    }

    [SlashCommand("mute", "Add the configured mute role to a member")]
    [RequireUserPermission(GuildPermission.ModerateMembers)]
    [RequireBotPermission(GuildPermission.ManageRoles)]
    public async Task MuteAsync(IGuildUser user, string? reason = null)
    {
        var settings = await _db.GetGuildSettingsOrDefaultAsync(Context.Guild.Id.ToString());
        if (string.IsNullOrWhiteSpace(settings.MuteRole) || !ulong.TryParse(settings.MuteRole, out var muteRoleId))
        {
            await RespondAsync("Mute role is not configured for this server.", ephemeral: true);
            return;
        }

        var muteRole = Context.Guild.GetRole(muteRoleId);
        if (muteRole == null)
        {
            await RespondAsync("Configured mute role could not be found.", ephemeral: true);
            return;
        }

        await user.AddRoleAsync(muteRole);
        var messageReason = reason ?? "No reason provided";
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_MUTE", user.Id.ToString(), messageReason);
        await RespondAsync($"🔇 {user.Mention} has been muted with {muteRole.Mention}.", ephemeral: true);
    }

    [SlashCommand("unmute", "Remove the configured mute role from a member")]
    [RequireUserPermission(GuildPermission.ModerateMembers)]
    [RequireBotPermission(GuildPermission.ManageRoles)]
    public async Task UnmuteAsync(IGuildUser user)
    {
        var settings = await _db.GetGuildSettingsOrDefaultAsync(Context.Guild.Id.ToString());
        if (string.IsNullOrWhiteSpace(settings.MuteRole) || !ulong.TryParse(settings.MuteRole, out var muteRoleId))
        {
            await RespondAsync("Mute role is not configured for this server.", ephemeral: true);
            return;
        }

        var muteRole = Context.Guild.GetRole(muteRoleId);
        if (muteRole == null)
        {
            await RespondAsync("Configured mute role could not be found.", ephemeral: true);
            return;
        }

        await user.RemoveRoleAsync(muteRole);
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_UNMUTE", user.Id.ToString(), "Mute role removed");
        await RespondAsync($"🔊 {user.Mention} has been unmuted.", ephemeral: true);
    }

    [SlashCommand("tempban", "Temporarily ban a member")]
    [RequireUserPermission(GuildPermission.BanMembers)]
    [RequireBotPermission(GuildPermission.BanMembers)]
    public async Task TempbanAsync(IGuildUser user, int durationHours, string? reason = null)
    {
        if (durationHours <= 0)
        {
            await RespondAsync("Duration must be at least 1 hour.", ephemeral: true);
            return;
        }

        var messageReason = reason ?? "No reason provided";
        var expiresAt = DateTimeOffset.UtcNow.AddHours(durationHours);
        await user.Guild.AddBanAsync(user, 0, $"{messageReason} | Tempban for {durationHours} hour(s)");
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_TEMPBAN", user.Id.ToString(), $"{messageReason} | Expires {expiresAt:O}");
        await RespondAsync($"⏳ {user.Username} has been banned for {durationHours} hour(s).", ephemeral: true);
    }

    [SlashCommand("warnings", "Show warnings for a member")]
    [RequireUserPermission(GuildPermission.ManageMessages)]
    public async Task WarningsAsync(IGuildUser user)
    {
        var warnings = (await _db.GetWarningsAsync(Context.Guild.Id.ToString(), user.Id.ToString())).ToList();
        if (warnings.Count == 0)
        {
            await RespondAsync($"{user.Mention} has no warnings.", ephemeral: true);
            return;
        }

        var description = string.Join("\n\n", warnings.Select((warning, index) =>
            $"**{index + 1}.** {warning.Reason ?? "No reason provided"}\n*By <@{warning.ModeratorId}> on <t:{warning.Timestamp}:f>*"));

        var embed = new EmbedBuilder()
            .WithColor(Color.Orange)
            .WithTitle($"Warnings for {user.Username}")
            .WithDescription(description)
            .WithFooter($"Total warnings: {warnings.Count}")
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed, ephemeral: true);
    }

    [SlashCommand("clearwarnings", "Clear all warnings for a member")]
    [RequireUserPermission(GuildPermission.Administrator)]
    public async Task ClearWarningsAsync(IGuildUser user)
    {
        await _db.ClearWarningsAsync(Context.Guild.Id.ToString(), user.Id.ToString());
        await _db.AddAuditLogAsync(Context.Guild.Id.ToString(), "MOD_CLEARWARNINGS", user.Id.ToString(), "All warnings cleared");
        await RespondAsync($"✅ Cleared all warnings for {user.Mention}.", ephemeral: true);
    }
}
