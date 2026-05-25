using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Quartermaster.Web.Services;

public class DiscordApiService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public DiscordApiService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    private async Task<string> GetAsync(string url, string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode) return string.Empty;
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<List<DiscordGuild>> GetUserGuildsAsync(string accessToken)
    {
        var content = await GetAsync("https://discord.com/api/users/@me/guilds", accessToken);
        if (string.IsNullOrEmpty(content)) return new List<DiscordGuild>();
        try { return JsonSerializer.Deserialize<List<DiscordGuild>>(content) ?? new List<DiscordGuild>(); }
        catch { return new List<DiscordGuild>(); }
    }

    public async Task<List<DiscordRole>> GetGuildRolesAsync(string guildId, string botToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", botToken);
        try
        {
            var response = await client.GetAsync($"https://discord.com/api/guilds/{guildId}/roles");
            if (!response.IsSuccessStatusCode) return new List<DiscordRole>();
            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<DiscordRole>>(content) ?? new List<DiscordRole>();
        }
        catch { return new List<DiscordRole>(); }
    }

    public async Task<List<DiscordChannel>> GetGuildChannelsAsync(string guildId, string botToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", botToken);
        try
        {
            var response = await client.GetAsync($"https://discord.com/api/guilds/{guildId}/channels");
            if (!response.IsSuccessStatusCode) return new List<DiscordChannel>();
            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<DiscordChannel>>(content) ?? new List<DiscordChannel>();
        }
        catch { return new List<DiscordChannel>(); }
    }
}

public class DiscordGuild
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("owner")]
    public bool IsOwner { get; set; }

    [JsonPropertyName("permissions")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long Permissions { get; set; }

    public bool CanManage => (Permissions & 0x20) == 0x20 || IsOwner;
}

public class DiscordRole
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("color")]
    public int Color { get; set; }

    public string HexColor => $"#{Color:X6}";
}

public class DiscordChannel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public int Type { get; set; } // 0 = text, 2 = voice
}
