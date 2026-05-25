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
    private readonly string _botToken;

    public DashboardController(IDatabaseService db, DiscordApiService discordApi, IConfiguration config)
    {
        _db = db;
        _discordApi = discordApi;
        _botToken = config["Bot:Token"] ?? "";
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

    private async Task<(DiscordGuild?, string?)> GetValidatedGuild(string guildId)
    {
        var accessToken = await HttpContext.GetTokenAsync("access_token");
        if (string.IsNullOrEmpty(accessToken)) return (null, null);

        var guilds = await _discordApi.GetUserGuildsAsync(accessToken);
        var guild = guilds.FirstOrDefault(g => g.Id == guildId);

        if (guild == null || !guild.CanManage) return (null, null);
        return (guild, accessToken);
    }

    [HttpGet("server/{guildId}")]
    public async Task<IActionResult> Server(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        ViewBag.Guild = guild;
        return View(settings);
    }

    [HttpGet("server/{guildId}/leveling")]
    public async Task<IActionResult> Leveling(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        ViewBag.Guild = guild;
        ViewBag.Channels = (await _discordApi.GetGuildChannelsAsync(guildId, _botToken)).Where(c => c.Type == 0);
        return View(settings);
    }

    [HttpGet("server/{guildId}/moderation")]
    public async Task<IActionResult> Moderation(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var automod = await _db.GetAutomodSettingsOrDefaultAsync(guildId);
        ViewBag.Blacklist = await _db.GetBlacklistWordsAsync(guildId);
        ViewBag.Warnings = new List<Quartermaster.Core.Models.Warning>(); // Simplified
        ViewBag.Guild = guild;
        return View(automod);
    }

    [HttpGet("server/{guildId}/raid")]
    public async Task<IActionResult> Raid(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var raid = await _db.GetRaidSettingsOrDefaultAsync(guildId);
        ViewBag.Incidents = new List<dynamic>();
        ViewBag.Guild = guild;
        ViewBag.Channels = (await _discordApi.GetGuildChannelsAsync(guildId, _botToken)).Where(c => c.Type == 0);
        return View(raid);
    }

    [HttpGet("server/{guildId}/economy")]
    public async Task<IActionResult> Economy(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var shopItems = await _db.GetShopItemsAsync(guildId);
        ViewBag.Guild = guild;
        return View(shopItems);
    }

    [HttpGet("server/{guildId}/logs")]
    public async Task<IActionResult> Logs(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var logs = new List<Quartermaster.Core.Models.AuditLog>(); 
        ViewBag.Guild = guild;
        return View(logs);
    }

    [HttpGet("server/{guildId}/permissions")]
    public async Task<IActionResult> Permissions(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        ViewBag.Roles = await _discordApi.GetGuildRolesAsync(guildId, _botToken);
        ViewBag.Guild = guild;
        return View(settings);
    }

    [HttpGet("server/{guildId}/triggers")]
    public async Task<IActionResult> Triggers(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var triggers = await _db.GetTriggersAsync(guildId);
        ViewBag.Guild = guild;
        return View(triggers);
    }

    [HttpGet("server/{guildId}/social")]
    public async Task<IActionResult> Social(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var alerts = await _db.GetSocialAlertsAsync(guildId);
        ViewBag.Channels = (await _discordApi.GetGuildChannelsAsync(guildId, _botToken)).Where(c => c.Type == 0);
        ViewBag.Guild = guild;
        return View(alerts);
    }

    [HttpGet("server/{guildId}/reaction-roles")]
    public async Task<IActionResult> ReactionRoles(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var reactionRoles = await _db.GetReactionRolesAsync(guildId);
        ViewBag.Roles = await _discordApi.GetGuildRolesAsync(guildId, _botToken);
        ViewBag.Guild = guild;
        return View(reactionRoles);
    }

    [HttpGet("server/{guildId}/welcome")]
    public async Task<IActionResult> Welcome(string guildId)
    {
        var (guild, _) = await GetValidatedGuild(guildId);
        if (guild == null) return Forbid();

        var settings = await _db.GetGuildSettingsOrDefaultAsync(guildId);
        ViewBag.Channels = (await _discordApi.GetGuildChannelsAsync(guildId, _botToken)).Where(c => c.Type == 0);
        ViewBag.Roles = await _discordApi.GetGuildRolesAsync(guildId, _botToken);
        ViewBag.Guild = guild;
        return View(settings);
    }
}
