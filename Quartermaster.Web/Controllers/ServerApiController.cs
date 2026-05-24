using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Web.Controllers;

[Authorize]
[Route("api/server/{guildId}")]
[ApiController]
public class ServerApiController : ControllerBase
{
    private readonly IDatabaseService _db;

    public ServerApiController(IDatabaseService db)
    {
        _db = db;
    }

    [HttpPost("settings/visuals")]
    public async Task<IActionResult> UpdateVisuals(string guildId, [FromBody] VisualUpdateModel model)
    {
        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        
        if (!string.IsNullOrEmpty(model.RankCardColor)) settings.RankCardColor = model.RankCardColor;
        settings.RankBackground = model.RankBackground;
        settings.WelcomeBackground = model.WelcomeBackground;

        await _db.UpdateGuildSettingsAsync(settings);
        return Ok(new { success = true });
    }

    [HttpPost("automod")]
    public async Task<IActionResult> UpdateAutomod(string guildId, [FromBody] AutomodSetting model)
    {
        model.GuildId = guildId;
        await _db.UpdateAutomodSettingsAsync(model);
        return Ok(new { success = true });
    }

    // Models for API
    public class VisualUpdateModel
    {
        public string? RankCardColor { get; set; }
        public string? RankBackground { get; set; }
        public string? WelcomeBackground { get; set; }
    }
}
