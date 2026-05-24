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
            foreach (var user in guild.Users)
            {
                if (user.IsBot || user.VoiceChannel == null) continue;
                
                var voiceState = user.VoiceState;
                if (voiceState.HasValue && (voiceState.Value.IsSelfDeafened || voiceState.Value.IsDeafened)) continue;

                // Award 15 XP and 2 Gold per minute in voice
                var result = await _leveling.AddXpAsync(user.Id.ToString(), guild.Id.ToString(), 15);
                
                if (result.LeveledUp)
                {
                    var settings = await _db.GetGuildSettingsOrDefaultAsync(guild.Id.ToString());
                    var channel = settings.LevelUpChannel != null 
                        ? (guild.GetTextChannel(ulong.Parse(settings.LevelUpChannel)))
                        : guild.SystemChannel ?? guild.TextChannels.FirstOrDefault();

                    if (channel != null)
                    {
                        await channel.SendMessageAsync($"🎙️ **Voice Active:** Congratulations {user.Mention}, you just advanced to level {result.NewLevel}!");
                    }
                }
            }
        }
    }
}
