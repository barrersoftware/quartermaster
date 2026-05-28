namespace Quartermaster.Core.Models;

public class User
{
    public string UserId { get; set; } = string.Empty;
    public string GuildId { get; set; } = string.Empty;
    public long Xp { get; set; }
    public int Level { get; set; }
    public long LastMessage { get; set; }
    public int Gold { get; set; }
    public long LastDaily { get; set; }
}

public class CustomCommand
{
    public int Id { get; set; }
    public string GuildId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public long CreatedAt { get; set; }
}

public class Warning
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string GuildId { get; set; } = string.Empty;
    public string ModeratorId { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public long Timestamp { get; set; }
}

public class GuildSetting
{
    public string GuildId { get; set; } = string.Empty;
    public string? WelcomeChannel { get; set; }
    public string? LeaveChannel { get; set; }
    public string? LogChannel { get; set; }
    public string? LevelUpChannel { get; set; }
    public string? MuteRole { get; set; }
    public string RankCardColor { get; set; } = "#5865F2";
    public string? AutoRole { get; set; }
    public string ModRoles { get; set; } = "[]";
    public string? RankBackground { get; set; }
    public string? WelcomeBackground { get; set; }
    public string? WelcomeMessage { get; set; }
    public string? LeaveMessage { get; set; }
    public int LevelingEnabled { get; set; } = 1;
    public string? LevelUpMessage { get; set; }
}

public class TempBan
{
    public string GuildId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public long BannedAt { get; set; }
    public long ExpiresAt { get; set; }
}
