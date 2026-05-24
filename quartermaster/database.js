const Database = require('better-sqlite3');
const db = new Database('bot.db');

// Initialize database tables
function initDatabase() {
    console.log('Initializing database...');
    // Users table for leveling system and economy
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            gold INTEGER DEFAULT 0,
            last_message INTEGER DEFAULT 0,
            last_daily INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        )
    `);

    // Migration: Add gold and last_daily if they don't exist
    try {
        db.exec("ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 0");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE users ADD COLUMN last_daily INTEGER DEFAULT 0");
    } catch (e) { /* Column already exists */ }

    // Shop items table
    db.exec(`
        CREATE TABLE IF NOT EXISTS shop_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            role_id TEXT, -- If this item gives a role
            UNIQUE(guild_id, name)
        )
    `);

    // Inventory table
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            purchased_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (item_id) REFERENCES shop_items(id)
        )
    `);

    // Permanent Log storage
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            type TEXT NOT NULL,
            user_id TEXT,
            content TEXT,
            timestamp INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);

    // Custom commands table
    db.exec(`
        CREATE TABLE IF NOT EXISTS custom_commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            command_name TEXT NOT NULL,
            response TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            UNIQUE(guild_id, command_name)
        )
    `);

    // Warnings table for moderation
    db.exec(`
        CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            reason TEXT,
            timestamp INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);

    // Guild settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            welcome_channel TEXT,
            leave_channel TEXT,
            log_channel TEXT,
            level_up_channel TEXT, -- NULL means current channel
            mute_role TEXT,
            rank_card_color TEXT DEFAULT '#5865F2',
            auto_role TEXT,
            mod_roles TEXT DEFAULT '[]',
            rank_background TEXT,
            welcome_background TEXT
        )
    `);

    // Migration: Add columns if they don't exist
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN level_up_channel TEXT");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN rank_card_color TEXT DEFAULT '#5865F2'");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN auto_role TEXT");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN mod_roles TEXT DEFAULT '[]'");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN rank_background TEXT");
    } catch (e) { /* Column already exists */ }
    try {
        db.exec("ALTER TABLE guild_settings ADD COLUMN welcome_background TEXT");
    } catch (e) { /* Column already exists */ }

    // Raid protection settings table
    db.exec(`
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
        )
    `);

    // Join tracking table (for raid detection)
    db.exec(`
        CREATE TABLE IF NOT EXISTS join_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            joined_at INTEGER DEFAULT (strftime('%s', 'now')),
            account_created INTEGER,
            is_suspicious INTEGER DEFAULT 0
        )
    `);

    // Raid incidents log table
    db.exec(`
        CREATE TABLE IF NOT EXISTS raid_incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            detected_at INTEGER DEFAULT (strftime('%s', 'now')),
            user_count INTEGER,
            action_taken TEXT,
            users_affected TEXT,
            resolved INTEGER DEFAULT 0
        )
    `);

    // Role rewards table
    db.exec(`
        CREATE TABLE IF NOT EXISTS role_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            level INTEGER NOT NULL,
            role_id TEXT NOT NULL,
            UNIQUE(guild_id, level)
        )
    `);

    // Auto-mod settings table
    db.exec(`
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
            caps_threshold INTEGER DEFAULT 70, -- Percentage
            mention_spam_enabled INTEGER DEFAULT 0,
            mention_threshold INTEGER DEFAULT 5
        )
    `);

    // Migration for new automod columns
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN emoji_spam_enabled INTEGER DEFAULT 0"); } catch (e) {}
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN emoji_threshold INTEGER DEFAULT 10"); } catch (e) {}
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN caps_spam_enabled INTEGER DEFAULT 0"); } catch (e) {}
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN caps_threshold INTEGER DEFAULT 70"); } catch (e) {}
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN mention_spam_enabled INTEGER DEFAULT 0"); } catch (e) {}
    try { db.exec("ALTER TABLE automod_settings ADD COLUMN mention_threshold INTEGER DEFAULT 5"); } catch (e) {}

    // Word blacklist table
    db.exec(`
        CREATE TABLE IF NOT EXISTS word_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            word TEXT NOT NULL,
            UNIQUE(guild_id, word)
        )
    `);

    // Leveling multipliers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS leveling_multipliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'role' or 'channel'
            multiplier REAL DEFAULT 1.0,
            UNIQUE(guild_id, target_id, type)
        )
    `);

    // Reaction roles table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reaction_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            emoji TEXT NOT NULL,
            role_id TEXT NOT NULL,
            UNIQUE(guild_id, message_id, emoji)
        )
    `);

    // Advanced triggers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS advanced_triggers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            trigger_phrase TEXT NOT NULL,
            response TEXT NOT NULL,
            type TEXT DEFAULT 'text', -- 'text' or 'embed'
            created_by TEXT,
            UNIQUE(guild_id, trigger_phrase)
        )
    `);

    // Giveaways table
    db.exec(`
        CREATE TABLE IF NOT EXISTS giveaways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            prize TEXT NOT NULL,
            winner_count INTEGER DEFAULT 1,
            end_time INTEGER NOT NULL,
            ended INTEGER DEFAULT 0,
            winners TEXT -- JSON array of user IDs
        )
    `);

    // Starboard table
    db.exec(`
        CREATE TABLE IF NOT EXISTS starboard_settings (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT,
            emoji TEXT DEFAULT '⭐',
            threshold INTEGER DEFAULT 3
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS starboard_messages (
            guild_id TEXT NOT NULL,
            original_message_id TEXT PRIMARY KEY,
            starboard_message_id TEXT NOT NULL
        )
    `);

    // Social Alerts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS social_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            platform TEXT NOT NULL, -- 'twitch' or 'youtube'
            channel_name TEXT NOT NULL,
            alert_channel_id TEXT NOT NULL,
            last_notified_id TEXT, -- Video ID or Stream ID
            UNIQUE(guild_id, platform, channel_name)
        )
    `);

    console.log('Database initialized successfully');
}

// Initialize database on module load
initDatabase();

// User/Leveling functions
const getUserData = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?');
const insertUser = db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)');
const updateUserXP = db.prepare('UPDATE users SET xp = ?, level = ?, last_message = ? WHERE user_id = ? AND guild_id = ?');
const getLeaderboard = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?');

function getUserRank(userId, guildId) {
    const user = getUserData.get(userId, guildId);
    if (!user) return 0;

    const result = db.prepare('SELECT COUNT(*) as rank FROM users WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))').get(guildId, user.level, user.level, user.xp);
    return result.rank + 1;
}

function addXP(userId, guildId, xp) {
    insertUser.run(userId, guildId);
    const user = getUserData.get(userId, guildId);
    const newXP = user.xp + xp;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > user.level;
    
    // Also award small amount of gold (10% of XP)
    const goldGain = Math.ceil(xp * 0.1);

    db.prepare('UPDATE users SET xp = ?, level = ?, gold = gold + ?, last_message = ? WHERE user_id = ? AND guild_id = ?').run(newXP, newLevel, goldGain, Date.now(), userId, guildId);

    return { leveledUp, newLevel, newXP };
}

function calculateLevel(xp) {
    // MEE6 Cubic Approximation (Inverse of the XP formula)
    // Formula: XP = 100x + 25x(x-1) + (5(x-1)x(2x-1))/6
    // We iterate to find the exact level because the cubic inverse is complex.
    let level = 0;
    while (calculateXPForLevel(level + 1) <= xp) {
        level++;
    }
    return level;
}

function calculateXPForLevel(level) {
    if (level <= 0) return 0;
    const x = level;
    // MEE6 Official Cubic XP Formula
    return Math.floor(100 * x + 25 * x * (x - 1) + (5 * (x - 1) * x * (2 * x - 1)) / 6);
}

// Custom commands functions
const getCustomCommand = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND command_name = ?');
const getAllCustomCommands = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?');
const addCustomCommand = db.prepare('INSERT INTO custom_commands (guild_id, command_name, response, created_by) VALUES (?, ?, ?, ?)');
const deleteCustomCommand = db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND command_name = ?');

// Warning functions
const addWarning = db.prepare('INSERT INTO warnings (user_id, guild_id, moderator_id, reason) VALUES (?, ?, ?, ?)');
const getWarnings = db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ?');
const clearWarnings = db.prepare('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?');

// Guild settings functions
const getGuildSettings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const setGuildSetting = db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, welcome_channel, leave_channel, log_channel, mute_role, rank_card_color, auto_role, mod_roles, rank_background, welcome_background, level_up_channel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

// Raid protection functions
const getRaidSettings = db.prepare('SELECT * FROM raid_settings WHERE guild_id = ?');
const setRaidSettings = db.prepare(`
    INSERT OR REPLACE INTO raid_settings
    (guild_id, enabled, join_threshold, time_window, action, alert_channel, lockdown_duration, whitelist_roles, verification_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const trackJoin = db.prepare('INSERT INTO join_tracking (user_id, guild_id, account_created, is_suspicious) VALUES (?, ?, ?, ?)');
const getRecentJoins = db.prepare('SELECT * FROM join_tracking WHERE guild_id = ? AND joined_at > ? ORDER BY joined_at DESC');
const clearOldJoins = db.prepare('DELETE FROM join_tracking WHERE joined_at < ?');

const logRaidIncident = db.prepare('INSERT INTO raid_incidents (guild_id, user_count, action_taken, users_affected) VALUES (?, ?, ?, ?)');
const getRaidIncidents = db.prepare('SELECT * FROM raid_incidents WHERE guild_id = ? ORDER BY detected_at DESC LIMIT ?');
const resolveRaidIncident = db.prepare('UPDATE raid_incidents SET resolved = 1 WHERE id = ?');

// Role rewards functions
const getRoleRewards = db.prepare('SELECT * FROM role_rewards WHERE guild_id = ? ORDER BY level ASC');
const getRoleRewardForLevel = db.prepare('SELECT * FROM role_rewards WHERE guild_id = ? AND level = ?');
const addRoleReward = db.prepare('INSERT OR REPLACE INTO role_rewards (guild_id, level, role_id) VALUES (?, ?, ?)');
const deleteRoleReward = db.prepare('DELETE FROM role_rewards WHERE guild_id = ? AND level = ?');

// Auto-mod functions
const getAutomodSettings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?');
const setAutomodSettings = db.prepare(`
    INSERT OR REPLACE INTO automod_settings 
    (guild_id, spam_enabled, spam_threshold, links_enabled, invites_enabled, badwords_enabled) 
    VALUES (?, ?, ?, ?, ?, ?)
`);

const getBlacklist = db.prepare('SELECT word FROM word_blacklist WHERE guild_id = ?');
const addBlacklistWord = db.prepare('INSERT OR IGNORE INTO word_blacklist (guild_id, word) VALUES (?, ?)');
const removeBlacklistWord = db.prepare('DELETE FROM word_blacklist WHERE guild_id = ? AND word = ?');

// Multiplier functions
const getMultipliers = db.prepare('SELECT * FROM leveling_multipliers WHERE guild_id = ?');
const addMultiplier = db.prepare('INSERT OR REPLACE INTO leveling_multipliers (guild_id, target_id, type, multiplier) VALUES (?, ?, ?, ?)');
const deleteMultiplier = db.prepare('DELETE FROM leveling_multipliers WHERE guild_id = ? AND target_id = ? AND type = ?');

// Reaction role functions
const getReactionRoles = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?');
const getAllReactionRoles = db.prepare('SELECT * FROM reaction_roles');
const addReactionRole = db.prepare('INSERT OR REPLACE INTO reaction_roles (guild_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?)');
const deleteReactionRole = db.prepare('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?');

// Advanced trigger functions
const getTriggers = db.prepare('SELECT * FROM advanced_triggers WHERE guild_id = ?');
const addTrigger = db.prepare('INSERT OR REPLACE INTO advanced_triggers (guild_id, trigger_phrase, response, type, created_by) VALUES (?, ?, ?, ?, ?)');
const deleteTrigger = db.prepare('DELETE FROM advanced_triggers WHERE guild_id = ? AND trigger_phrase = ?');

// Giveaway functions
const getGiveaways = db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0');
const getAllActiveGiveaways = db.prepare('SELECT * FROM giveaways WHERE ended = 0');
const addGiveaway = db.prepare('INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, end_time) VALUES (?, ?, ?, ?, ?, ?)');
const endGiveaway = db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE message_id = ?');

// Starboard functions
const getStarboardSettings = db.prepare('SELECT * FROM starboard_settings WHERE guild_id = ?');
const setStarboardSettings = db.prepare('INSERT OR REPLACE INTO starboard_settings (guild_id, channel_id, emoji, threshold) VALUES (?, ?, ?, ?)');
const getStarboardMessage = db.prepare('SELECT * FROM starboard_messages WHERE original_message_id = ?');
const addStarboardMessage = db.prepare('INSERT INTO starboard_messages (guild_id, original_message_id, starboard_message_id) VALUES (?, ?, ?)');

// Social Alert functions
const getSocialAlerts = db.prepare('SELECT * FROM social_alerts WHERE guild_id = ?');
const getAllSocialAlerts = db.prepare('SELECT * FROM social_alerts');
const addSocialAlert = db.prepare('INSERT OR REPLACE INTO social_alerts (guild_id, platform, channel_name, alert_channel_id) VALUES (?, ?, ?, ?)');
const deleteSocialAlert = db.prepare('DELETE FROM social_alerts WHERE guild_id = ? AND platform = ? AND channel_name = ?');
const updateLastNotified = db.prepare('UPDATE social_alerts SET last_notified_id = ? WHERE id = ?');

// Economy functions
const addGold = db.prepare('UPDATE users SET gold = gold + ? WHERE user_id = ? AND guild_id = ?');
const setGold = db.prepare('UPDATE users SET gold = ? WHERE user_id = ? AND guild_id = ?');
const getGold = db.prepare('SELECT gold FROM users WHERE user_id = ? AND guild_id = ?');
const updateLastDaily = db.prepare('UPDATE users SET last_daily = ? WHERE user_id = ? AND guild_id = ?');

// Shop functions
const getShopItems = db.prepare('SELECT * FROM shop_items WHERE guild_id = ?');
const addShopItem = db.prepare('INSERT INTO shop_items (guild_id, name, description, price, role_id) VALUES (?, ?, ?, ?, ?)');
const deleteShopItem = db.prepare('DELETE FROM shop_items WHERE guild_id = ? AND id = ?');
const getShopItem = db.prepare('SELECT * FROM shop_items WHERE id = ?');

// Audit Log functions
const addAuditLog = db.prepare('INSERT INTO audit_logs (guild_id, type, user_id, content) VALUES (?, ?, ?, ?)');
const getAuditLogs = db.prepare('SELECT * FROM audit_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?');

function getGuildSettingsOrDefault(guildId) {
    let settings = getGuildSettings.get(guildId);
    if (!settings) {
        settings = {
            guild_id: guildId,
            welcome_channel: null,
            leave_channel: null,
            log_channel: null,
            level_up_channel: null,
            mute_role: null,
            rank_card_color: '#5865F2',
            auto_role: null,
            mod_roles: '[]',
            rank_background: null,
            welcome_background: null
        };
    }
    // Parse JSON fields
    if (typeof settings.mod_roles === 'string') {
        try {
            settings.mod_roles = JSON.parse(settings.mod_roles);
        } catch (e) {
            settings.mod_roles = [];
        }
    }
    return settings;
}

function getAutomodSettingsOrDefault(guildId) {
    let settings = getAutomodSettings.get(guildId);
    if (!settings) {
        settings = {
            guild_id: guildId,
            spam_enabled: 0,
            spam_threshold: 5,
            links_enabled: 0,
            invites_enabled: 0,
            badwords_enabled: 0
        };
    }
    return settings;
}

function getRaidSettingsOrDefault(guildId) {
    let settings = getRaidSettings.get(guildId);
    if (!settings) {
        // Return default settings
        settings = {
            guild_id: guildId,
            enabled: 0,
            join_threshold: 5,
            time_window: 10,
            action: 'kick',
            alert_channel: null,
            lockdown_duration: 300,
            whitelist_roles: '[]',
            verification_level: 0
        };
    }
    // Parse JSON fields
    if (typeof settings.whitelist_roles === 'string') {
        settings.whitelist_roles = JSON.parse(settings.whitelist_roles);
    }
    return settings;
}

module.exports = {
    initDatabase,
    getUserData,
    getUserRank,
    addXP,
    calculateLevel,
    calculateXPForLevel,
    getLeaderboard,
    getCustomCommand,
    getAllCustomCommands,
    addCustomCommand,
    deleteCustomCommand,
    addWarning,
    getWarnings,
    clearWarnings,
    getGuildSettings,
    getGuildSettingsOrDefault,
    setGuildSetting,
    getRaidSettings,
    getRaidSettingsOrDefault,
    setRaidSettings,
    trackJoin,
    getRecentJoins,
    clearOldJoins,
    logRaidIncident,
    getRaidIncidents,
    resolveRaidIncident,
    getRoleRewards,
    getRoleRewardForLevel,
    addRoleReward,
    deleteRoleReward,
    getAutomodSettings,
    getAutomodSettingsOrDefault,
    setAutomodSettings,
    getBlacklist,
    addBlacklistWord,
    removeBlacklistWord,
    getMultipliers,
    addMultiplier,
    deleteMultiplier,
    getReactionRoles,
    getAllReactionRoles,
    addReactionRole,
    deleteReactionRole,
    getTriggers,
    addTrigger,
    deleteTrigger,
    getGiveaways,
    getAllActiveGiveaways,
    addGiveaway,
    endGiveaway,
    getStarboardSettings,
    setStarboardSettings,
    getStarboardMessage,
    addStarboardMessage,
    getSocialAlerts,
    getAllSocialAlerts,
    addSocialAlert,
    deleteSocialAlert,
    updateLastNotified,
    addGold,
    setGold,
    getGold,
    updateLastDaily,
    getShopItems,
    addShopItem,
    deleteShopItem,
    getShopItem,
    addAuditLog,
    getAuditLogs
};
