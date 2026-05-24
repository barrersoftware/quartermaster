using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Core.Services;

public class TriggerService
{
    private readonly IDatabaseService _db;

    public TriggerService(IDatabaseService db)
    {
        _db = db;
    }

    public async Task<bool> HandleTriggersAsync(SocketUserMessage message)
    {
        if (message.Author.IsBot || message.Channel is not SocketGuildChannel guildChannel) return false;

        var guildId = guildChannel.Guild.Id.ToString();
        var triggers = await _db.GetTriggersAsync(guildId);
        var content = message.Content.ToLower();

        foreach (var trigger in triggers)
        {
            if (content.Contains(trigger.TriggerPhrase.ToLower()))
            {
                if (trigger.Type == "embed")
                {
                    var embed = new EmbedBuilder()
                        .WithColor(Color.Blue)
                        .WithDescription(trigger.Response)
                        .WithCurrentTimestamp()
                        .Build();
                    await message.Channel.SendMessageAsync(embed: embed);
                }
                else
                {
                    await message.Channel.SendMessageAsync(trigger.Response);
                }
                return true;
            }
        }

        return false;
    }
}
