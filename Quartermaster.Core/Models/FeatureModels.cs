namespace Quartermaster.Core.Models;

public class RaidSetting
{
    public string GuildId { get; set; } = string.Empty;
    public int Enabled { get; set; }
    public int JoinThreshold { get; set; }
    public int TimeWindow { get; set; }
    public string Action { get; set; } = "kick";
    public string? AlertChannel { get; set; }
    public int LockdownDuration { get; set; }
    public string WhitelistRoles { get; set; } = "[]";
    public int VerificationLevel { get; set; }
}

public class AutomodSetting
{
    public string GuildId { get; set; } = string.Empty;
    public int SpamEnabled { get; set; }
    public int SpamThreshold { get; set; }
    public int LinksEnabled { get; set; }
    public int InvitesEnabled { get; set; }
    public int BadwordsEnabled { get; set; }
    public int EmojiSpamEnabled { get; set; }
    public int EmojiThreshold { get; set; }
    public int CapsSpamEnabled { get; set; }
    public int CapsThreshold { get; set; }
    public int MentionSpamEnabled { get; set; }
    public int MentionThreshold { get; set; }
}

public class Giveaway
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string Prize { get; set; } = string.Empty;
    public int WinnerCount { get; set; }
    public long EndTime { get; set; }
    public int Ended { get; set; }
    public string? Winners { get; set; }
}

public class ShopItem
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Price { get; set; }
    public string? RoleId { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? Content { get; set; }
    public long Timestamp { get; set; }
}

public class AdvancedTrigger
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string TriggerPhrase { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public string? CreatedBy { get; set; }
}

public class StarboardSetting
{
    public string GuildId { get; set; } = string.Empty;
    public string? ChannelId { get; set; }
    public string Emoji { get; set; } = "⭐";
    public int Threshold { get; set; } = 3;
}

public class ReactionRole
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
}

public class SocialAlert
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty; // 'twitch' or 'youtube'
    public string ChannelName { get; set; } = string.Empty;
    public string AlertChannelId { get; set; } = string.Empty;
    public string? LastNotifiedId { get; set; }
}
