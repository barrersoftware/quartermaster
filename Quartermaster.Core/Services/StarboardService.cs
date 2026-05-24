using System;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using Quartermaster.Core.Data;

namespace Quartermaster.Core.Services;

public class StarboardService
{
    private readonly IDatabaseService _db;
    private readonly DiscordSocketClient _client;

    public StarboardService(IDatabaseService db, DiscordSocketClient client)
    {
        _db = db;
        _client = client;
    }

    public async Task HandleReactionAsync(Cacheable<IUserMessage, ulong> cachedMessage, Cacheable<IMessageChannel, ulong> cachedChannel, SocketReaction reaction)
    {
        var message = await cachedMessage.GetOrDownloadAsync();
        if (message == null || message.Author.IsBot) return;

        var channel = await cachedChannel.GetOrDownloadAsync() as SocketGuildChannel;
        if (channel == null) return;

        var guildId = channel.Guild.Id.ToString();
        var settings = await _db.GetStarboardSettingsAsync(guildId);
        if (settings == null || string.IsNullOrEmpty(settings.ChannelId)) return;

        if (reaction.Emote.Name == settings.Emoji)
        {
            var starCount = message.Reactions.FirstOrDefault(r => r.Key.Name == settings.Emoji).Value.ReactionCount;
            
            if (starCount >= settings.Threshold)
            {
                var starboardChannel = await _client.GetChannelAsync(ulong.Parse(settings.ChannelId)) as ITextChannel;
                if (starboardChannel == null) return;

                var existingStarMsgId = await _db.GetStarboardMessageIdAsync(message.Id.ToString());

                var embed = new EmbedBuilder()
                    .WithColor(Color.Gold)
                    .WithAuthor(message.Author)
                    .WithDescription(message.Content)
                    .AddField("Original", $"[Jump to Message]({message.GetJumpUrl()})", true)
                    .AddField("Channel", $"<#{message.Channel.Id}>", true)
                    .WithFooter($"ID: {message.Id}")
                    .WithCurrentTimestamp();

                if (message.Attachments.Any())
                {
                    embed.WithImageUrl(message.Attachments.First().Url);
                }

                if (existingStarMsgId != null)
                {
                    var starMsg = await starboardChannel.GetMessageAsync(ulong.Parse(existingStarMsgId)) as IUserMessage;
                    if (starMsg != null)
                    {
                        await starMsg.ModifyAsync(m => {
                            m.Content = $"**{starCount}** {settings.Emoji}";
                            m.Embed = embed.Build();
                        });
                    }
                }
                else
                {
                    var starMsg = await starboardChannel.SendMessageAsync($"**{starCount}** {settings.Emoji}", embed: embed.Build());
                    await _db.AddStarboardMessageAsync(guildId, message.Id.ToString(), starMsg.Id.ToString());
                }
            }
        }
    }
}
