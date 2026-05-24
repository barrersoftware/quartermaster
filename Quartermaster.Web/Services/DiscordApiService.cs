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

    public async Task<List<DiscordGuild>> GetUserGuildsAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync("https://discord.com/api/users/@me/guilds");
        if (!response.IsSuccessStatusCode) return new List<DiscordGuild>();

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<DiscordGuild>>(content) ?? new List<DiscordGuild>();
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
    public string Permissions { get; set; } = "0";

    public bool CanManage => (long.Parse(Permissions) & 0x20) == 0x20 || IsOwner;
}
