using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

public class StarboardModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public StarboardModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("starboard", "Configure the Starboard")]
    [RequireUserPermission(GuildPermission.ManageGuild)]
    public async Task StarboardAsync(ITextChannel channel, int threshold = 3, string emoji = "⭐")
    {
        var settings = new StarboardSetting
        {
            GuildId = Context.Guild.Id.ToString(),
            ChannelId = channel.Id.ToString(),
            Emoji = emoji,
            Threshold = threshold
        };

        await _db.UpdateStarboardSettingsAsync(settings);

        await RespondAsync($"✅ **Starboard Configured!** Channel: {channel.Mention}, Threshold: {threshold}, Emoji: {emoji}");
    }
}
