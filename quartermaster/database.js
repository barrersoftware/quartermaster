const Database = require('better-sqlite3');
const db = new Database('bot.db');

// Initialize database tables
function initDatabase() {
    console.log('Initializing database...');
    // Users table for leveling system
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            last_message INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
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
            mute_role TEXT
        )
    `);

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

    console.log('Database initialized successfully');
}

// Initialize database on module load
initDatabase();

// User/Leveling functions
const getUserData = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?');
const insertUser = db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)');
const updateUserXP = db.prepare('UPDATE users SET xp = ?, level = ?, last_message = ? WHERE user_id = ? AND guild_id = ?');
const getLeaderboard = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?');

function addXP(userId, guildId, xp) {
    insertUser.run(userId, guildId);
    const user = getUserData.get(userId, guildId);
    const newXP = user.xp + xp;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > user.level;

    updateUserXP.run(newXP, newLevel, Date.now(), userId, guildId);

    return { leveledUp, newLevel, newXP };
}

function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

function calculateXPForLevel(level) {
    return Math.pow(level / 0.1, 2);
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
const setGuildSetting = db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, welcome_channel, leave_channel, log_channel, mute_role) VALUES (?, ?, ?, ?, ?)');

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
    deleteRoleReward
};
