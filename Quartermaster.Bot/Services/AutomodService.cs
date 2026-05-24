using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Discord.WebSocket;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Services;

public class AutomodService
{
    private readonly IDatabaseService _db;
    private readonly ConcurrentDictionary<ulong, List<long>> _messageTracker = new();
    private static readonly Regex LinkRegex = new(@"(https?://[^\s]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex InviteRegex = new(@"(discord\.gg|discordapp\.com/invite|discord\.com/invite)/[a-zA-Z0-9]+", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex EmojiRegex = new(@"<a?:\w+:\d+>|[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]", RegexOptions.Compiled);

    public AutomodService(IDatabaseService db)
    {
        _db = db;
    }

    public async Task<bool> IsMessageBlockedAsync(SocketUserMessage message)
    {
        if (message.Author.IsBot || message.Channel is not SocketTextChannel textChannel) return false;

        var guildId = textChannel.Guild.Id.ToString();
        var settings = await _db.GetAutomodSettingsOrDefaultAsync(guildId);
        var content = message.Content;

        // 1. Bad Words Check
        if (settings.BadwordsEnabled == 1)
        {
            var blacklist = await _db.GetBlacklistWordsAsync(guildId);
            if (blacklist.Any(word => content.Contains(word, StringComparison.OrdinalIgnoreCase)))
            {
                await message.DeleteAsync();
                await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, that word is not allowed here!");
                return true;
            }
        }

        // 2. Link Detection
        if (settings.LinksEnabled == 1 && LinkRegex.IsMatch(content))
        {
            await message.DeleteAsync();
            await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, links are not allowed!");
            return true;
        }

        // 3. Invite Detection
        if (settings.InvitesEnabled == 1 && InviteRegex.IsMatch(content))
        {
            await message.DeleteAsync();
            await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, Discord invites are not allowed!");
            return true;
        }

        // 4. Emoji Spam
        if (settings.EmojiSpamEnabled == 1)
        {
            var emojiCount = EmojiRegex.Matches(content).Count;
            if (emojiCount > settings.EmojiThreshold)
            {
                await message.DeleteAsync();
                await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, too many emojis!");
                return true;
            }
        }

        // 5. Caps Spam
        if (settings.CapsSpamEnabled == 1 && content.Length > 10)
        {
            var capsCount = content.Count(char.IsUpper);
            var percentage = (double)capsCount / content.Length * 100;
            if (percentage > settings.CapsThreshold)
            {
                await message.DeleteAsync();
                await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, please stop shouting!");
                return true;
            }
        }

        // 6. Mention Spam
        if (settings.MentionSpamEnabled == 1)
        {
            var mentionCount = message.MentionedUsers.Count + message.MentionedRoles.Count;
            if (mentionCount > settings.MentionThreshold)
            {
                await message.DeleteAsync();
                await textChannel.SendMessageAsync($"⚠️ {message.Author.Mention}, please don't spam mentions!");
                return true;
            }
        }

        // 7. General Spam
        if (settings.SpamEnabled == 1)
        {
            var userId = message.Author.Id;
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var window = 5000;

            var userMessages = _messageTracker.GetOrAdd(userId, _ => new List<long>());
            lock (userMessages)
            {
                userMessages.Add(now);
                userMessages.RemoveAll(t => now - t > window);
                
                if (userMessages.Count >= settings.SpamThreshold)
                {
                    _ = message.DeleteAsync();
                    _ = textChannel.SendMessageAsync($"🚫 {message.Author.Mention} has been silenced for spamming.");
                    // In a real bot, we would timeout the user here
                    userMessages.Clear();
                    return true;
                }
            }
        }

        return false;
    }
}
