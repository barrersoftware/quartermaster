using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Services;

public class QuartermasterManagerService : BackgroundService
{
    private readonly ILogger<QuartermasterManagerService> _logger;
    private readonly IServiceProvider _services;
    private readonly DiscordSocketClient _client;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public QuartermasterManagerService(
        ILogger<QuartermasterManagerService> logger, 
        IServiceProvider services, 
        DiscordSocketClient client,
        IHttpClientFactory httpClientFactory,
        IConfiguration config)
    {
        _logger = logger;
        _services = services;
        _client = client;
        _httpClientFactory = httpClientFactory;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Quartermaster Manager Service is starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _services.CreateScope())
                {
                    var giveawayService = scope.ServiceProvider.GetRequiredService<Core.Services.GiveawayService>();
                    await giveawayService.CheckGiveawaysAsync();
                    
                    var voiceXpService = scope.ServiceProvider.GetRequiredService<Core.Services.VoiceXpService>();
                    await voiceXpService.RewardActiveUsersAsync();

                    await PollSocialAlertsAsync(scope.ServiceProvider.GetRequiredService<IDatabaseService>());
                    await CheckExpiredTempBansAsync(scope.ServiceProvider.GetRequiredService<IDatabaseService>());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Quartermaster Manager loop");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CheckExpiredTempBansAsync(IDatabaseService db)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        try
        {
            var expiredBans = await db.GetExpiredTempBansAsync(now);
            foreach (var ban in expiredBans)
            {
                try
                {
                    if (ulong.TryParse(ban.GuildId, out var guildId) && ulong.TryParse(ban.UserId, out var userId))
                    {
                        var guild = _client.GetGuild(guildId);
                        if (guild != null)
                        {
                            await guild.RemoveBanAsync(userId);
                            _logger.LogInformation("[TEMPBAN] Unbanned user {UserId} in guild {GuildId} (Tempban expired)", ban.UserId, ban.GuildId);
                            await db.AddAuditLogAsync(ban.GuildId, "MOD_UNBAN_AUTO", ban.UserId, "Tempban expired");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Failed to automatically unban user {UserId} in guild {GuildId}: {Msg}", ban.UserId, ban.GuildId, ex.Message);
                }
                finally
                {
                    // Remove from database anyway to avoid infinite retry loops on non-existent users/guilds
                    await db.RemoveTempBanAsync(ban.GuildId, ban.UserId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing expired tempbans");
        }
    }

    private async Task PollSocialAlertsAsync(IDatabaseService db)
    {
        var alerts = await db.GetAllSocialAlertsAsync();
        foreach (var alert in alerts)
        {
            try
            {
                if (alert.Platform == "twitch") await PollTwitchAsync(alert, db);
                else if (alert.Platform == "youtube") await PollYouTubeAsync(alert, db);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Social Poll Failed ({Platform}/{Channel}): {Msg}", alert.Platform, alert.ChannelName, ex.Message);
            }
        }
    }

    private async Task PollTwitchAsync(SocialAlert alert, IDatabaseService db)
    {
        string clientId = _config["Social:TwitchClientId"] ?? "";
        string accessToken = _config["Social:TwitchAccessToken"] ?? "";

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(accessToken)) return;

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("Client-ID", clientId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync($"https://api.twitch.tv/helix/streams?user_login={alert.ChannelName}");
        if (!response.IsSuccessStatusCode) return;

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var data = doc.RootElement.GetProperty("data");

        if (data.GetArrayLength() > 0)
        {
            var stream = data[0];
            string streamId = stream.GetProperty("id").GetString()!;

            if (streamId != alert.LastNotifiedId)
            {
                var discordChannel = await _client.GetChannelAsync(ulong.Parse(alert.AlertChannelId)) as ITextChannel;
                if (discordChannel != null)
                {
                    string userName = stream.GetProperty("user_name").GetString()!;
                    string title = stream.GetProperty("title").GetString()!;
                    string game = stream.GetProperty("game_name").GetString()!;

                    var embed = new EmbedBuilder()
                        .WithColor(new Color(100, 65, 165))
                        .WithTitle($"🎮 {userName} is now LIVE on Twitch!")
                        .WithUrl($"https://twitch.tv/{alert.ChannelName}")
                        .WithDescription($"**Playing:** {game}\n**Title:** {title}")
                        .WithCurrentTimestamp()
                        .Build();

                    await discordChannel.SendMessageAsync($"📢 **{userName}** just went live!", embed: embed);
                    await db.UpdateSocialAlertLastNotifiedAsync(alert.Id, streamId);
                }
            }
        }
    }

    private async Task PollYouTubeAsync(SocialAlert alert, IDatabaseService db)
    {
        string apiKey = _config["Social:YouTubeApiKey"] ?? "";
        if (string.IsNullOrEmpty(apiKey)) return;

        var client = _httpClientFactory.CreateClient();
        var response = await client.GetAsync($"https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={alert.ChannelName}&maxResults=1&order=date&type=video&key={apiKey}");
        if (!response.IsSuccessStatusCode) return;

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var items = doc.RootElement.GetProperty("items");

        if (items.GetArrayLength() > 0)
        {
            var video = items[0];
            string videoId = video.GetProperty("id").GetProperty("videoId").GetString()!;

            if (videoId != alert.LastNotifiedId)
            {
                var discordChannel = await _client.GetChannelAsync(ulong.Parse(alert.AlertChannelId)) as ITextChannel;
                if (discordChannel != null)
                {
                    string title = video.GetProperty("snippet").GetProperty("title").GetString()!;
                    string channelTitle = video.GetProperty("snippet").GetProperty("channelTitle").GetString()!;

                    var embed = new EmbedBuilder()
                        .WithColor(Color.Red)
                        .WithTitle($"🎥 New Video: {title}")
                        .WithUrl($"https://www.youtube.com/watch?v={videoId}")
                        .WithDescription($"📢 **{channelTitle}** just posted a new video!")
                        .WithCurrentTimestamp()
                        .Build();

                    await discordChannel.SendMessageAsync(embed: embed);
                    await db.UpdateSocialAlertLastNotifiedAsync(alert.Id, videoId);
                }
            }
        }
    }
}
