using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartermaster.Core.Data;
using Quartermaster.Web.Services;

namespace Quartermaster.Web.Controllers;

[Authorize]
[Route("dashboard")]
public class DashboardController : Controller
{
    private readonly IDatabaseService _db;
    private readonly DiscordApiService _discordApi;

    public DashboardController(IDatabaseService db, DiscordApiService discordApi)
    {
        _db = db;
        _discordApi = discordApi;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index()
    {
        var accessToken = await HttpContext.GetTokenAsync("access_token");
        if (string.IsNullOrEmpty(accessToken)) return RedirectToAction("Logout", "Auth");

        var guilds = await _discordApi.GetUserGuildsAsync(accessToken);
        var manageableGuilds = guilds.Where(g => g.CanManage).ToList();

        return View(manageableGuilds);
    }

    [HttpGet("server/{guildId}")]
    public async Task<IActionResult> Server(string guildId)
    {
        var accessToken = await HttpContext.GetTokenAsync("access_token");
        var guilds = await _discordApi.GetUserGuildsAsync(accessToken!);
        var guild = guilds.FirstOrDefault(g => g.Id == guildId);

        if (guild == null || !guild.CanManage) return Forbid();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        ViewBag.Guild = guild;
        
        return View(settings);
    }

    [HttpGet("server/{guildId}/leveling")]
    public async Task<IActionResult> Leveling(string guildId)
    {
        // Validation logic... (abstract this later)
        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        var multipliers = await _db.GetTriggersAsync(guildId); // Placeholder
        
        return View(settings);
    }
}
