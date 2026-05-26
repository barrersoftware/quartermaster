using System;
using System.Threading.Tasks;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Core.Services;

public class LevelingService
{
    private readonly IDatabaseService _db;

    public LevelingService(IDatabaseService db)
    {
        _db = db;
    }

    public int CalculateLevel(long xp)
    {
        int level = 0;
        while (CalculateXpForLevel(level + 1) <= xp)
        {
            level++;
        }
        return level;
    }

    public long CalculateXpForLevel(int level)
    {
        if (level <= 0) return 0;
        double x = level;
        // MEE6 Official Cubic XP Formula: XP = 100x + 25x(x-1) + (5(x-1)x(2x-1))/6
        return (long)Math.Floor(100 * x + 25 * x * (x - 1) + (5 * (x - 1) * x * (2 * x - 1)) / 6);
    }

    public async Task<(bool LeveledUp, int NewLevel)> AddXpAsync(string userId, string guildId, int xpAmount)
    {
        var user = await _db.GetUserAsync(userId, guildId);
        if (user == null)
        {
            user = new User { UserId = userId, GuildId = guildId };
        }

        // 60-second XP cooldown (same as MEE6)
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if ((now - user.LastMessage) < 60_000)
            return (false, user.Level);

        user.Xp += xpAmount;
        // Also award small amount of gold (10% of XP)
        user.Gold += (int)Math.Ceiling(xpAmount * 0.1);
        user.LastMessage = now;

        int newLevel = CalculateLevel(user.Xp);
        bool leveledUp = newLevel > user.Level;
        user.Level = newLevel;

        await _db.UpdateUserAsync(user);

        return (leveledUp, newLevel);
    }
}
