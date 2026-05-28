using System;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using Quartermaster.Core.Data;

namespace Quartermaster.Core.Services;

public class VoiceXpService
{
    private readonly IDatabaseService _db;
    private readonly DiscordSocketClient _client;
    private readonly LevelingService _leveling;

    public VoiceXpService(IDatabaseService db, DiscordSocketClient client, LevelingService leveling)
    {
        _db = db;
        _client = client;
        _leveling = leveling;
    }

    public async Task RewardActiveUsersAsync()
    {
        foreach (var guild in _client.Guilds)
        {
            var settings = await _db.GetGuildSettingsOrDefaultAsync(guild.Id.ToString());
            if (settings.LevelingEnabled != 1) continue;

            foreach (var user in guild.Users)
            {
                if (user.IsBot || user.VoiceChannel == null) continue;
                
                var voiceState = user.VoiceState;
                if (voiceState.HasValue && (voiceState.Value.IsSelfDeafened || voiceState.Value.IsDeafened)) continue;

                // Award 15 XP and 2 Gold per minute in voice
                var result = await _leveling.AddXpAsync(user.Id.ToString(), guild.Id.ToString(), 15);
                
                if (result.LeveledUp)
                {
                    if (string.Equals(settings.LevelUpChannel, "disabled", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    ITextChannel? channel = null;
                    if (!string.IsNullOrWhiteSpace(settings.LevelUpChannel) &&
                        ulong.TryParse(settings.LevelUpChannel, out var channelId))
                    {
                        channel = guild.GetTextChannel(channelId);
                    }
                    channel ??= guild.SystemChannel ?? (ITextChannel?)guild.TextChannels.FirstOrDefault();

                    if (channel != null)
                    {
                        var levelUpMessage = string.IsNullOrWhiteSpace(settings.LevelUpMessage)
                            ? "🎙️ **Voice Active:** Congratulations {user}, you just advanced to level {level}!"
                            : settings.LevelUpMessage;

                        await channel.SendMessageAsync(levelUpMessage
                            .Replace("{user}", user.Mention, StringComparison.OrdinalIgnoreCase)
                            .Replace("{level}", result.NewLevel.ToString(), StringComparison.OrdinalIgnoreCase));
                    }
                }
            }
        }
    }
}
