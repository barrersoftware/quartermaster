using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

public class MigrationModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private const string BaseUrl = "https://mee6.xyz/api/plugins/levels/leaderboard/";

    public MigrationModule(IDatabaseService db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    [SlashCommand("migrate-mee6", "Import leveling data from MEE6 leaderboard (Requires Public Leaderboard)")]
    [RequireUserPermission(GuildPermission.Administrator)]
    public async Task MigrateAsync()
    {
        await DeferAsync(ephemeral: true);
        
        var guildId = Context.Guild.Id;
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "QuartermasterMigrationEngine/2.0 (.NET)");

        int currentPage = 0;
        int totalImported = 0;
        bool processing = true;

        await FollowupAsync("📡 Starting migration from MEE6... Found 0 users so far.", ephemeral: true);

        while (processing)
        {
            string requestUrl = $"{BaseUrl}{guildId}?page={currentPage}&limit=1000";
            
            try
            {
                var response = await client.GetFromJsonAsync<Mee6ApiResponse>(requestUrl);
                
                if (response?.Players == null || response.Players.Count == 0)
                {
                    processing = false;
                    break;
                }

                foreach (var player in response.Players)
                {
                    if (player.DetailedXp != null && player.DetailedXp.Count >= 3)
                    {
                        var user = new User
                        {
                            UserId = player.Id,
                            GuildId = guildId.ToString(),
                            Xp = player.DetailedXp[2],
                            Level = player.Level
                        };
                        await _db.UpdateUserAsync(user);
                    }
                }

                totalImported += response.Players.Count;
                await Context.Interaction.ModifyOriginalResponseAsync(msg => msg.Content = $"📡 Migrating from MEE6... Imported **{totalImported}** users so far.");
                
                currentPage++;
                await Task.Delay(1000); // Rate limit protection
            }
            catch (Exception ex)
            {
                await FollowupAsync($"❌ Migration failed at page {currentPage}: {ex.Message}", ephemeral: true);
                processing = false;
            }
        }

        await Context.Interaction.ModifyOriginalResponseAsync(msg => msg.Content = $"✅ **Migration Complete!** Successfully liberated **{totalImported}** users from MEE6.");
    }
}

public class Mee6ApiResponse
{
    [JsonPropertyName("players")]
    public List<Mee6Player>? Players { get; set; }
}

public class Mee6Player
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("level")]
    public int Level { get; set; }

    [JsonPropertyName("detailed_xp")]
    public List<int>? DetailedXp { get; set; }
}
