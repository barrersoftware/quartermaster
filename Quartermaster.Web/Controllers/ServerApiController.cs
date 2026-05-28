using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Quartermaster.Web.Controllers;

[Authorize]
[Route("api/server/{guildId}")]
[ApiController]
[IgnoreAntiforgeryToken]
public class ServerApiController : ControllerBase
{
    private readonly IDatabaseService _db;

    public ServerApiController(IDatabaseService db)
    {
        _db = db;
    }

    private async Task SaveSettings(string guildId, GuildSetting s)
    {
        await _db.UpdateGuildSettingsAsync(s);
    }

    [HttpPost("settings/visuals")]
    public async Task<IActionResult> UpdateVisuals(string guildId, [FromBody] VisualUpdateModel model)
    {
        try
        {
            var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
            if (!string.IsNullOrEmpty(model.RankCardColor)) settings.RankCardColor = model.RankCardColor;
            if (model.RankBackground != null) settings.RankBackground = model.RankBackground;
            if (model.WelcomeBackground != null) settings.WelcomeBackground = model.WelcomeBackground;
            await SaveSettings(guildId, settings);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("settings/leveling")]
    public async Task<IActionResult> UpdateLeveling(string guildId, [FromBody] LevelingUpdateModel model)
    {
        try
        {
            var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
            if (model.Enabled.HasValue) settings.LevelingEnabled = model.Enabled.Value ? 1 : 0;
            if (model.LevelUpMessage != null) settings.LevelUpMessage = model.LevelUpMessage;
            if (model.UpdateChannel) settings.LevelUpChannel = model.LevelUpChannel;
            
            await SaveSettings(guildId, settings);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpGet("leveling/role-rewards")]
    public async Task<IActionResult> GetRoleRewards(string guildId)
    {
        try
        {
            var rewards = await _db.GetRoleRewardsAsync(guildId);
            return Ok(rewards);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("leveling/role-rewards")]
    public async Task<IActionResult> AddRoleReward(string guildId, [FromBody] RoleRewardRequest model)
    {
        try
        {
            await _db.AddRoleRewardAsync(new RoleReward
            {
                GuildId = guildId,
                Level = model.Level,
                RoleId = model.RoleId
            });
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("leveling/role-rewards/{level}")]
    public async Task<IActionResult> DeleteRoleReward(string guildId, int level)
    {
        try
        {
            await _db.DeleteRoleRewardAsync(guildId, level);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("automod")]
    public async Task<IActionResult> UpdateAutomod(string guildId, [FromBody] AutomodSetting model)
    {
        model.GuildId = guildId;
        await _db.UpdateAutomodSettingsAsync(model);
        return Ok(new { success = true });
    }

    [HttpPost("automod/blacklist")]
    public async Task<IActionResult> AddBlacklist(string guildId, [FromBody] JsonElement body)
    {
        var word = body.GetProperty("word").GetString();
        if (string.IsNullOrEmpty(word)) return BadRequest();
        await _db.AddBlacklistWordAsync(guildId, word);
        return Ok(new { success = true });
    }

    [HttpDelete("automod/blacklist/{word}")]
    public async Task<IActionResult> RemoveBlacklist(string guildId, string word)
    {
        await _db.RemoveBlacklistWordAsync(guildId, word);
        return Ok(new { success = true });
    }

    [HttpGet("moderation/warnings/{userId}")]
    public async Task<IActionResult> GetWarnings(string guildId, string userId)
    {
        try
        {
            var warnings = await _db.GetWarningsAsync(guildId, userId);
            return Ok(warnings);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("moderation/warnings/{userId}")]
    public async Task<IActionResult> ClearWarnings(string guildId, string userId)
    {
        try
        {
            await _db.ClearWarningsAsync(guildId, userId);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("raid")]
    public async Task<IActionResult> UpdateRaid(string guildId, [FromBody] RaidSetting model)
    {
        model.GuildId = guildId;
        await _db.UpdateRaidSettingsAsync(model);
        return Ok(new { success = true });
    }

    [HttpPost("welcome")]
    public async Task<IActionResult> UpdateWelcome(string guildId, [FromBody] JsonElement body)
    {
        try
        {
            var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
            if (body.TryGetProperty("welcomeChannel", out var wc)) settings.WelcomeChannel = wc.GetString();
            if (body.TryGetProperty("auto_role", out var ar)) settings.AutoRole = ar.GetString();
            if (body.TryGetProperty("welcome_background", out var wb)) settings.WelcomeBackground = wb.GetString();
            if (body.TryGetProperty("leave_channel", out var lc)) settings.LeaveChannel = lc.GetString();
            if (body.TryGetProperty("leaveChannel", out var lc2)) settings.LeaveChannel = lc2.GetString();
            if (body.TryGetProperty("welcome_message", out var wm)) settings.WelcomeMessage = wm.GetString();
            if (body.TryGetProperty("welcomeMessage", out var wm2)) settings.WelcomeMessage = wm2.GetString();
            if (body.TryGetProperty("leave_message", out var lm)) settings.LeaveMessage = lm.GetString();
            if (body.TryGetProperty("leaveMessage", out var lm2)) settings.LeaveMessage = lm2.GetString();
            await SaveSettings(guildId, settings);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("welcome/leave")]
    public async Task<IActionResult> UpdateLeave(string guildId, [FromBody] LeaveSettingsModel model)
    {
        try
        {
            var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
            settings.LeaveChannel = model.LeaveChannel;
            if (model.LeaveMessage != null) settings.LeaveMessage = model.LeaveMessage;
            await SaveSettings(guildId, settings);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("permissions/mod-roles")]
    public async Task<IActionResult> AddModRole(string guildId, [FromBody] JsonElement body)
    {
        var roleId = body.GetProperty("roleId").GetString();
        if (string.IsNullOrEmpty(roleId)) return BadRequest();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        var roles = string.IsNullOrEmpty(settings.ModRoles) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(settings.ModRoles);

        if (roles != null && !roles.Contains(roleId))
        {
            roles.Add(roleId);
            settings.ModRoles = JsonSerializer.Serialize(roles);
            await SaveSettings(guildId, settings);
        }
        return Ok(new { success = true });
    }

    [HttpDelete("permissions/mod-roles/{roleId}")]
    public async Task<IActionResult> RemoveModRole(string guildId, string roleId)
    {
        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        var roles = string.IsNullOrEmpty(settings.ModRoles) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(settings.ModRoles);

        if (roles != null)
        {
            roles.Remove(roleId);
            settings.ModRoles = JsonSerializer.Serialize(roles);
            await SaveSettings(guildId, settings);
        }
        return Ok(new { success = true });
    }

    [HttpPost("triggers")]
    public async Task<IActionResult> AddTrigger(string guildId, [FromBody] AdvancedTrigger model)
    {
        model.GuildId = guildId;
        await _db.AddTriggerAsync(model);
        return Ok(new { success = true });
    }

    [HttpDelete("triggers/{phrase}")]
    public async Task<IActionResult> RemoveTrigger(string guildId, string phrase)
    {
        await _db.DeleteTriggerAsync(guildId, phrase);
        return Ok(new { success = true });
    }

    [HttpPost("commands")]
    public async Task<IActionResult> AddCommand(string guildId, [FromBody] CustomCommand model)
    {
        try
        {
            model.GuildId = guildId;
            model.CommandName = model.CommandName.Trim().ToLowerInvariant();
            if (model.CreatedAt == 0) model.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            await _db.AddCustomCommandAsync(model);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("commands/{name}")]
    public async Task<IActionResult> DeleteCommand(string guildId, string name)
    {
        try
        {
            await _db.DeleteCustomCommandAsync(guildId, name.ToLowerInvariant());
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("social")]
    public async Task<IActionResult> AddSocial(string guildId, [FromBody] SocialAlert model)
    {
        model.GuildId = guildId;
        await _db.AddSocialAlertAsync(model);
        return Ok(new { success = true });
    }

    [HttpDelete("social/{platform}/{channel}")]
    public async Task<IActionResult> RemoveSocial(string guildId, string platform, string channel)
    {
        await _db.DeleteSocialAlertAsync(guildId, platform, channel);
        return Ok(new { success = true });
    }

    [HttpPost("economy/shop")]
    public async Task<IActionResult> AddShopItem(string guildId, [FromBody] ShopItem model)
    {
        model.GuildId = guildId;
        await _db.AddShopItemAsync(model);
        return Ok(new { success = true });
    }

    [HttpDelete("economy/shop/{id}")]
    public async Task<IActionResult> RemoveShopItem(string guildId, int id)
    {
        await _db.DeleteShopItemAsync(guildId, id);
        return Ok(new { success = true });
    }

    [HttpPost("reaction-roles")]
    public async Task<IActionResult> AddReactionRole(string guildId, [FromBody] ReactionRole model)
    {
        model.GuildId = guildId;
        await _db.AddReactionRoleAsync(model);
        return Ok(new { success = true });
    }

    [HttpDelete("reaction-roles/{messageId}/{emoji}")]
    public async Task<IActionResult> RemoveReactionRole(string guildId, string messageId, string emoji)
    {
        await _db.DeleteReactionRoleAsync(guildId, messageId, emoji);
        return Ok(new { success = true });
    }

    [HttpPost("embed/send")]
    public IActionResult SendEmbed(string guildId, [FromBody] EmbedSendModel model)
    {
        try
        {
            return Ok(new { success = false, error = "Embed sender requires bot integration - use /embed command in Discord" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    public class VisualUpdateModel
    {
        [JsonPropertyName("RankCardColor")]
        public string? RankCardColor { get; set; }
        [JsonPropertyName("RankBackground")]
        public string? RankBackground { get; set; }
        [JsonPropertyName("WelcomeBackground")]
        public string? WelcomeBackground { get; set; }
    }

    public class LevelingUpdateModel
    {
        [JsonPropertyName("enabled")]
        public bool? Enabled { get; set; }
        [JsonPropertyName("levelUpMessage")]
        public string? LevelUpMessage { get; set; }
        [JsonPropertyName("levelUpChannel")]
        public string? LevelUpChannel { get; set; }
        [JsonPropertyName("updateChannel")]
        public bool UpdateChannel { get; set; } = false;
    }

    public class RoleRewardRequest
    {
        public int Level { get; set; }
        public string RoleId { get; set; } = string.Empty;
    }

    public class LeaveSettingsModel
    {
        public string? LeaveChannel { get; set; }
        public string? LeaveMessage { get; set; }
    }

    public class EmbedSendModel
    {
        public string ChannelId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string? Footer { get; set; }
    }
}
