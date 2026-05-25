using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.Sqlite;
using Quartermaster.Core.Models;

namespace Quartermaster.Core.Data;

public interface IDatabaseService
{
    Task<User?> GetUserAsync(string userId, string guildId);
    Task UpdateUserAsync(User user);
    Task<GuildSetting> GetGuildSettingsOrDefaultAsync(string guildId);
    Task UpdateGuildSettingsAsync(GuildSetting settings);
    Task<IEnumerable<CustomCommand>> GetCustomCommandsAsync(string guildId);
    Task AddCustomCommandAsync(CustomCommand command);
    Task DeleteCustomCommandAsync(string guildId, string commandName);
    Task<int> GetUserRankAsync(string userId, string guildId);
    Task<IEnumerable<User>> GetLeaderboardAsync(string guildId, int limit);
    
    // Auto-Mod
    Task<AutomodSetting> GetAutomodSettingsOrDefaultAsync(string guildId);
    Task UpdateAutomodSettingsAsync(AutomodSetting settings);
    Task<IEnumerable<string>> GetBlacklistWordsAsync(string guildId);
    Task AddBlacklistWordAsync(string guildId, string word);
    Task RemoveBlacklistWordAsync(string guildId, string word);

    // Raid Protection
    Task<RaidSetting> GetRaidSettingsOrDefaultAsync(string guildId);
    Task UpdateRaidSettingsAsync(RaidSetting settings);
    Task AddRaidIncidentAsync(string guildId, int userCount, string action, string affectedUsers);
    Task AddAuditLogAsync(string guildId, string type, string userId, string content);

    // Advanced Triggers
    Task<IEnumerable<AdvancedTrigger>> GetTriggersAsync(string guildId);
    Task AddTriggerAsync(AdvancedTrigger trigger);
    Task DeleteTriggerAsync(string guildId, string triggerPhrase);

    // Economy & Shop
    Task<IEnumerable<ShopItem>> GetShopItemsAsync(string guildId);
    Task AddShopItemAsync(ShopItem item);
    Task DeleteShopItemAsync(string guildId, int id);
    Task<ShopItem?> GetShopItemAsync(int id);
    Task UpdateLastDailyAsync(string userId, string guildId, long timestamp);

    // Giveaways
    Task<IEnumerable<Giveaway>> GetActiveGiveawaysAsync();
    Task AddGiveawayAsync(Giveaway giveaway);
    Task EndGiveawayAsync(string messageId, string winnersJson);

    // Starboard
    Task<StarboardSetting?> GetStarboardSettingsAsync(string guildId);
    Task UpdateStarboardSettingsAsync(StarboardSetting settings);
    Task<string?> GetStarboardMessageIdAsync(string originalMessageId);
    Task AddStarboardMessageAsync(string guildId, string originalMessageId, string starboardMessageId);

    // Reaction Roles
    Task<IEnumerable<ReactionRole>> GetReactionRolesAsync(string guildId);
    Task AddReactionRoleAsync(ReactionRole rr);
    Task DeleteReactionRoleAsync(string guildId, string messageId, string emoji);

    // Social Alerts
    Task<IEnumerable<SocialAlert>> GetSocialAlertsAsync(string guildId);
    Task<IEnumerable<SocialAlert>> GetAllSocialAlertsAsync();
    Task AddSocialAlertAsync(SocialAlert alert);
    Task DeleteSocialAlertAsync(string guildId, string platform, string channelName);
    Task UpdateSocialAlertLastNotifiedAsync(int id, string notifiedId);

    Task InitializeDatabaseAsync();
}

public class SqliteDatabaseService : IDatabaseService
{
    // ... rest of implementation will follow in next turn to avoid large replacement failure
    // ... rest of implementation will follow in next turn to avoid large replacement failure
    private readonly string _connectionString;

    public SqliteDatabaseService(string databasePath)
    {
        // Resolve relative paths to absolute paths
        if (!Path.IsPathRooted(databasePath))
        {
            databasePath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, databasePath));
        }

        _connectionString = $"Data Source={databasePath}";
        
        // Ensure Snake Case to Pascal Case mapping for Dapper
        DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    private IDbConnection GetConnection() => new SqliteConnection(_connectionString);

    public async Task<User?> GetUserAsync(string userId, string guildId)
    {
        using var db = GetConnection();
        return await db.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM users WHERE user_id = @userId AND guild_id = @guildId",
            new { userId, guildId });
    }

    public async Task UpdateUserAsync(User user)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO users (user_id, guild_id, xp, level, last_message, gold, last_daily)
            VALUES (@UserId, @GuildId, @Xp, @Level, @LastMessage, @Gold, @LastDaily)
            ON CONFLICT(user_id, guild_id) DO UPDATE SET
                xp = MAX(users.xp, EXCLUDED.xp),
                level = MAX(users.level, EXCLUDED.level),
                last_message = MAX(users.last_message, EXCLUDED.last_message),
                gold = CASE WHEN users.gold > 0 THEN users.gold ELSE EXCLUDED.gold END,
                last_daily = CASE WHEN users.last_daily > 0 THEN users.last_daily ELSE EXCLUDED.last_daily END",
            user);
    }

    public async Task<int> GetUserRankAsync(string userId, string guildId)
    {
        using var db = GetConnection();
        var user = await GetUserAsync(userId, guildId);
        if (user == null) return 0;

        return await db.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) + 1 FROM users 
            WHERE guild_id = @guildId AND (level > @Level OR (level = @Level AND xp > @Xp))",
            new { guildId, user.Level, user.Xp });
    }

    public async Task<IEnumerable<User>> GetLeaderboardAsync(string guildId, int limit)
    {
        using var db = GetConnection();
        return await db.QueryAsync<User>(
            "SELECT * FROM users WHERE guild_id = @guildId ORDER BY level DESC, xp DESC LIMIT @limit",
            new { guildId, limit });
    }

    public async Task<GuildSetting> GetGuildSettingsOrDefaultAsync(string guildId)
    {
        using var db = GetConnection();
        var settings = await db.QueryFirstOrDefaultAsync<GuildSetting>(
            "SELECT * FROM guild_settings WHERE guild_id = @guildId",
            new { guildId });

        if (settings == null)
        {
            settings = new GuildSetting { GuildId = guildId };
        }
        return settings;
    }

    public async Task UpdateGuildSettingsAsync(GuildSetting s)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO guild_settings 
            (guild_id, welcome_channel, leave_channel, log_channel, mute_role, rank_card_color, auto_role, mod_roles, rank_background, welcome_background, level_up_channel, leveling_enabled, level_up_message)
            VALUES 
            (@GuildId, @WelcomeChannel, @LeaveChannel, @LogChannel, @MuteRole, @RankCardColor, @AutoRole, @ModRoles, @RankBackground, @WelcomeBackground, @LevelUpChannel, @LevelingEnabled, @LevelUpMessage)
            ON CONFLICT(guild_id) DO UPDATE SET
                welcome_channel = @WelcomeChannel,
                leave_channel = @LeaveChannel,
                log_channel = @LogChannel,
                mute_role = @MuteRole,
                rank_card_color = @RankCardColor,
                auto_role = @AutoRole,
                mod_roles = @ModRoles,
                rank_background = @RankBackground,
                welcome_background = @WelcomeBackground,
                level_up_channel = @LevelUpChannel,
                leveling_enabled = @LevelingEnabled,
                level_up_message = @LevelUpMessage",
            s);
    }

    public async Task<IEnumerable<CustomCommand>> GetCustomCommandsAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<CustomCommand>(
            "SELECT * FROM custom_commands WHERE guild_id = @guildId",
            new { guildId });
    }

    public async Task AddCustomCommandAsync(CustomCommand command)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO custom_commands (guild_id, command_name, response, created_by, created_at)
            VALUES (@GuildId, @CommandName, @Response, @CreatedBy, @CreatedAt)",
            command);
    }

    public async Task DeleteCustomCommandAsync(string guildId, string commandName)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(
            "DELETE FROM custom_commands WHERE guild_id = @guildId AND command_name = @commandName",
            new { guildId, commandName });
    }

    public async Task<AutomodSetting> GetAutomodSettingsOrDefaultAsync(string guildId)
    {
        using var db = GetConnection();
        var settings = await db.QueryFirstOrDefaultAsync<AutomodSetting>(
            "SELECT * FROM automod_settings WHERE guild_id = @guildId",
            new { guildId });
        return settings ?? new AutomodSetting { GuildId = guildId };
    }

    public async Task UpdateAutomodSettingsAsync(AutomodSetting s)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO automod_settings 
            (guild_id, spam_enabled, spam_threshold, links_enabled, invites_enabled, badwords_enabled, emoji_spam_enabled, emoji_threshold, caps_spam_enabled, caps_threshold, mention_spam_enabled, mention_threshold)
            VALUES 
            (@GuildId, @SpamEnabled, @SpamThreshold, @LinksEnabled, @InvitesEnabled, @BadwordsEnabled, @EmojiSpamEnabled, @EmojiThreshold, @CapsSpamEnabled, @CapsThreshold, @MentionSpamEnabled, @MentionThreshold)
            ON CONFLICT(guild_id) DO UPDATE SET
                spam_enabled = @SpamEnabled, spam_threshold = @SpamThreshold, 
                links_enabled = @LinksEnabled, invites_enabled = @InvitesEnabled, badwords_enabled = @BadwordsEnabled,
                emoji_spam_enabled = @EmojiSpamEnabled, emoji_threshold = @EmojiThreshold,
                caps_spam_enabled = @CapsSpamEnabled, caps_threshold = @CapsThreshold,
                mention_spam_enabled = @MentionSpamEnabled, mention_threshold = @MentionThreshold",
            s);
    }

    public async Task<IEnumerable<string>> GetBlacklistWordsAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<string>("SELECT word FROM word_blacklist WHERE guild_id = @guildId", new { guildId });
    }

    public async Task AddBlacklistWordAsync(string guildId, string word)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("INSERT OR IGNORE INTO word_blacklist (guild_id, word) VALUES (@guildId, @word)", new { guildId, word });
    }

    public async Task RemoveBlacklistWordAsync(string guildId, string word)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM word_blacklist WHERE guild_id = @guildId AND word = @word", new { guildId, word });
    }

    public async Task<RaidSetting> GetRaidSettingsOrDefaultAsync(string guildId)
    {
        using var db = GetConnection();
        var settings = await db.QueryFirstOrDefaultAsync<RaidSetting>(
            "SELECT * FROM raid_settings WHERE guild_id = @guildId",
            new { guildId });
        return settings ?? new RaidSetting { GuildId = guildId };
    }

    public async Task UpdateRaidSettingsAsync(RaidSetting s)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO raid_settings 
            (guild_id, enabled, join_threshold, time_window, action, alert_channel, lockdown_duration, whitelist_roles, verification_level)
            VALUES 
            (@GuildId, @Enabled, @JoinThreshold, @TimeWindow, @Action, @AlertChannel, @LockdownDuration, @WhitelistRoles, @VerificationLevel)
            ON CONFLICT(guild_id) DO UPDATE SET
                enabled = @Enabled, join_threshold = @JoinThreshold, time_window = @TimeWindow, 
                action = @Action, alert_channel = @AlertChannel, lockdown_duration = @LockdownDuration,
                whitelist_roles = @WhitelistRoles, verification_level = @VerificationLevel",
            s);
    }

    public async Task AddRaidIncidentAsync(string guildId, int userCount, string action, string affectedUsers)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("INSERT INTO raid_incidents (guild_id, user_count, action_taken, users_affected) VALUES (@guildId, @userCount, @action, @affectedUsers)", 
            new { guildId, userCount, action, affectedUsers });
    }

    public async Task AddAuditLogAsync(string guildId, string type, string userId, string content)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("INSERT INTO audit_logs (guild_id, type, user_id, content) VALUES (@guildId, @type, @userId, @content)", 
            new { guildId, type, userId, content });
    }

    // Advanced Triggers
    public async Task<IEnumerable<AdvancedTrigger>> GetTriggersAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<AdvancedTrigger>("SELECT * FROM advanced_triggers WHERE guild_id = @guildId", new { guildId });
    }

    public async Task AddTriggerAsync(AdvancedTrigger t)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO advanced_triggers (guild_id, trigger_phrase, response, type, created_by)
            VALUES (@GuildId, @TriggerPhrase, @Response, @Type, @CreatedBy)
            ON CONFLICT(guild_id, trigger_phrase) DO UPDATE SET
                response = @Response,
                type = @Type",
            t);
    }

    public async Task DeleteTriggerAsync(string guildId, string triggerPhrase)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM advanced_triggers WHERE guild_id = @guildId AND trigger_phrase = @triggerPhrase", new { guildId, triggerPhrase });
    }

    // Economy & Shop
    public async Task<IEnumerable<ShopItem>> GetShopItemsAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<ShopItem>("SELECT * FROM shop_items WHERE guild_id = @guildId", new { guildId });
    }

    public async Task AddShopItemAsync(ShopItem item)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO shop_items (guild_id, name, description, price, role_id)
            VALUES (@GuildId, @Name, @Description, @Price, @RoleId)
            ON CONFLICT(guild_id, name) DO UPDATE SET
                description = @Description,
                price = @Price,
                role_id = @RoleId",
            item);
    }

    public async Task DeleteShopItemAsync(string guildId, int id)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM shop_items WHERE guild_id = @guildId AND id = @id", new { guildId, id });
    }

    public async Task<ShopItem?> GetShopItemAsync(int id)
    {
        using var db = GetConnection();
        return await db.QueryFirstOrDefaultAsync<ShopItem>("SELECT * FROM shop_items WHERE id = @id", new { id });
    }

    public async Task UpdateLastDailyAsync(string userId, string guildId, long timestamp)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("UPDATE users SET last_daily = @timestamp WHERE user_id = @userId AND guild_id = @guildId", new { userId, guildId, timestamp });
    }

    // Giveaways
    public async Task<IEnumerable<Giveaway>> GetActiveGiveawaysAsync()
    {
        using var db = GetConnection();
        return await db.QueryAsync<Giveaway>("SELECT * FROM giveaways WHERE ended = 0");
    }

    public async Task AddGiveawayAsync(Giveaway g)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, end_time)
            VALUES (@GuildId, @ChannelId, @MessageId, @Prize, @WinnerCount, @EndTime)",
            g);
    }

    public async Task EndGiveawayAsync(string messageId, string winnersJson)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("UPDATE giveaways SET ended = 1, winners = @winnersJson WHERE message_id = @messageId", new { messageId, winnersJson });
    }

    // Starboard
    public async Task<StarboardSetting?> GetStarboardSettingsAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryFirstOrDefaultAsync<StarboardSetting>("SELECT * FROM starboard_settings WHERE guild_id = @guildId", new { guildId });
    }

    public async Task UpdateStarboardSettingsAsync(StarboardSetting s)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold)
            VALUES (@GuildId, @ChannelId, @Emoji, @Threshold)
            ON CONFLICT(guild_id) DO UPDATE SET
                channel_id = @ChannelId,
                emoji = @Emoji,
                threshold = @Threshold",
            s);
    }

    public async Task<string?> GetStarboardMessageIdAsync(string originalMessageId)
    {
        using var db = GetConnection();
        return await db.QueryFirstOrDefaultAsync<string>("SELECT starboard_message_id FROM starboard_messages WHERE original_message_id = @originalMessageId", new { originalMessageId });
    }

    public async Task AddStarboardMessageAsync(string guildId, string originalMessageId, string starboardMessageId)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("INSERT INTO starboard_messages (guild_id, original_message_id, starboard_message_id) VALUES (@guildId, @originalMessageId, @starboardMessageId)", 
            new { guildId, originalMessageId, starboardMessageId });
    }

    // Reaction Roles
    public async Task<IEnumerable<ReactionRole>> GetReactionRolesAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<ReactionRole>("SELECT * FROM reaction_roles WHERE guild_id = @guildId", new { guildId });
    }

    public async Task AddReactionRoleAsync(ReactionRole rr)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO reaction_roles (guild_id, message_id, emoji, role_id)
            VALUES (@GuildId, @MessageId, @Emoji, @RoleId)
            ON CONFLICT(guild_id, message_id, emoji) DO UPDATE SET role_id = @RoleId",
            rr);
    }

    public async Task DeleteReactionRoleAsync(string guildId, string messageId, string emoji)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM reaction_roles WHERE guild_id = @guildId AND message_id = @messageId AND emoji = @emoji", new { guildId, messageId, emoji });
    }

    // Social Alerts
    public async Task<IEnumerable<SocialAlert>> GetSocialAlertsAsync(string guildId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<SocialAlert>("SELECT * FROM social_alerts WHERE guild_id = @guildId", new { guildId });
    }

    public async Task<IEnumerable<SocialAlert>> GetAllSocialAlertsAsync()
    {
        using var db = GetConnection();
        return await db.QueryAsync<SocialAlert>("SELECT * FROM social_alerts");
    }

    public async Task AddSocialAlertAsync(SocialAlert alert)
    {
        using var db = GetConnection();
        await db.ExecuteAsync(@"
            INSERT INTO social_alerts (guild_id, platform, channel_name, alert_channel_id)
            VALUES (@GuildId, @Platform, @ChannelName, @AlertChannelId)
            ON CONFLICT(guild_id, platform, channel_name) DO UPDATE SET alert_channel_id = @AlertChannelId",
            alert);
    }

    public async Task DeleteSocialAlertAsync(string guildId, string platform, string channelName)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM social_alerts WHERE guild_id = @guildId AND platform = @platform AND channel_name = @channelName", new { guildId, platform, channelName });
    }

    public async Task UpdateSocialAlertLastNotifiedAsync(int id, string notifiedId)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("UPDATE social_alerts SET last_notified_id = @notifiedId WHERE id = @id", new { id, notifiedId });
    }

    public async Task InitializeDatabaseAsync()
    {
        using var db = GetConnection();
        
        // Porting the exact JS init logic to C#
        await db.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                last_message INTEGER DEFAULT 0,
                gold INTEGER DEFAULT 0,
                last_daily INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, guild_id)
            );

            CREATE TABLE IF NOT EXISTS custom_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                command_name TEXT NOT NULL,
                response TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(guild_id, command_name)
            );

            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                timestamp INTEGER DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                welcome_channel TEXT,
                leave_channel TEXT,
                log_channel TEXT,
                mute_role TEXT,
                rank_card_color TEXT DEFAULT '#5865F2',
                auto_role TEXT,
                mod_roles TEXT DEFAULT '[]',
                rank_background TEXT,
                welcome_background TEXT,
                level_up_channel TEXT,
                leveling_enabled INTEGER DEFAULT 1,
                level_up_message TEXT
            );

            CREATE TABLE IF NOT EXISTS raid_settings (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0,
                join_threshold INTEGER DEFAULT 5,
                time_window INTEGER DEFAULT 10,
                action TEXT DEFAULT 'kick',
                alert_channel TEXT,
                lockdown_duration INTEGER DEFAULT 300,
                whitelist_roles TEXT DEFAULT '[]',
                verification_level INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS join_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                joined_at INTEGER DEFAULT (strftime('%s', 'now')),
                account_created INTEGER,
                is_suspicious INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS raid_incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                detected_at INTEGER DEFAULT (strftime('%s', 'now')),
                user_count INTEGER,
                action_taken TEXT,
                users_affected TEXT,
                resolved INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS role_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                level INTEGER NOT NULL,
                role_id TEXT NOT NULL,
                UNIQUE(guild_id, level)
            );

            CREATE TABLE IF NOT EXISTS automod_settings (
                guild_id TEXT PRIMARY KEY,
                spam_enabled INTEGER DEFAULT 0,
                spam_threshold INTEGER DEFAULT 5,
                links_enabled INTEGER DEFAULT 0,
                invites_enabled INTEGER DEFAULT 0,
                badwords_enabled INTEGER DEFAULT 0,
                emoji_spam_enabled INTEGER DEFAULT 0,
                emoji_threshold INTEGER DEFAULT 10,
                caps_spam_enabled INTEGER DEFAULT 0,
                caps_threshold INTEGER DEFAULT 70,
                mention_spam_enabled INTEGER DEFAULT 0,
                mention_threshold INTEGER DEFAULT 5
            );

            CREATE TABLE IF NOT EXISTS word_blacklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                word TEXT NOT NULL,
                UNIQUE(guild_id, word)
            );

            CREATE TABLE IF NOT EXISTS leveling_multipliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                type TEXT NOT NULL,
                multiplier REAL DEFAULT 1.0,
                UNIQUE(guild_id, target_id, type)
            );

            CREATE TABLE IF NOT EXISTS reaction_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                emoji TEXT NOT NULL,
                role_id TEXT NOT NULL,
                UNIQUE(guild_id, message_id, emoji)
            );

            CREATE TABLE IF NOT EXISTS advanced_triggers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                trigger_phrase TEXT NOT NULL,
                response TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                created_by TEXT,
                UNIQUE(guild_id, trigger_phrase)
            );

            CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                prize TEXT NOT NULL,
                winner_count INTEGER DEFAULT 1,
                end_time INTEGER NOT NULL,
                ended INTEGER DEFAULT 0,
                winners TEXT
            );

            CREATE TABLE IF NOT EXISTS starboard_settings (
                guild_id TEXT PRIMARY KEY,
                channel_id TEXT,
                emoji TEXT DEFAULT '⭐',
                threshold INTEGER DEFAULT 3
            );

            CREATE TABLE IF NOT EXISTS starboard_messages (
                guild_id TEXT NOT NULL,
                original_message_id TEXT PRIMARY KEY,
                starboard_message_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS social_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                channel_name TEXT NOT NULL,
                alert_channel_id TEXT NOT NULL,
                last_notified_id TEXT,
                UNIQUE(guild_id, platform, channel_name)
            );

            CREATE TABLE IF NOT EXISTS shop_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER NOT NULL,
                role_id TEXT,
                UNIQUE(guild_id, name)
            );

            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                item_id INTEGER NOT NULL,
                purchased_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (item_id) REFERENCES shop_items(id)
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                type TEXT NOT NULL,
                user_id TEXT,
                content TEXT,
                timestamp INTEGER DEFAULT (strftime('%s', 'now'))
            );
        ");

        // Migration: Add columns if they don't exist (C# specific migrations can go here)
        try { await db.ExecuteAsync("ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 0"); } catch { }
        try { await db.ExecuteAsync("ALTER TABLE users ADD COLUMN last_daily INTEGER DEFAULT 0"); } catch { }
        try { await db.ExecuteAsync("ALTER TABLE guild_settings ADD COLUMN level_up_channel TEXT"); } catch { }
        try { await db.ExecuteAsync("ALTER TABLE guild_settings ADD COLUMN leveling_enabled INTEGER DEFAULT 1"); } catch { }
        try { await db.ExecuteAsync("ALTER TABLE guild_settings ADD COLUMN level_up_message TEXT"); } catch { }
    }
}