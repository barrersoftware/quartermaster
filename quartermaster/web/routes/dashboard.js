const express = require('express');
const router = express.Router();
const db = require('../../database');
const config = require('../../config.json');

// Middleware to get user's guilds
router.use((req, res, next) => {
    req.userGuilds = req.user.guilds.filter(guild => {
        // Only show guilds where user has manage server permission
        return (guild.permissions & 0x20) === 0x20;
    });
    next();
});

// Dashboard home - server selector
router.get('/', (req, res) => {
    const client = req.app.locals.client;
    const mutualGuilds = req.userGuilds.filter(guild =>
        client && client.guilds.cache.has(guild.id)
    );

    res.render('dashboard/index', {
        user: req.user,
        guilds: req.userGuilds,
        mutualGuilds: mutualGuilds
    });
});

// Server dashboard
router.get('/server/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;

    // Check if user has access to this guild
    const userGuild = req.userGuilds.find(g => g.id === guildId);
    if (!userGuild) {
        return res.status(403).render('error', {
            user: req.user,
            error: 'You do not have permission to manage this server'
        });
    }

    // Check if bot is in the guild
    const guild = client ? client.guilds.cache.get(guildId) : null;
    if (!guild) {
        return res.render('dashboard/invite', {
            user: req.user,
            guild: userGuild,
            inviteUrl: `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot&guild_id=${guildId}`
        });
    }

    // Get server stats
    const memberCount = guild.memberCount;
    const leaderboardData = db.getLeaderboard.all(guildId, 5);
    
    // Fetch Discord user info for leaderboard
    const leaderboard = await Promise.all(leaderboardData.map(async (userData) => {
        try {
            const member = await guild.members.fetch(userData.user_id);
            return {
                ...userData,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.displayAvatarURL()
            };
        } catch (error) {
            return {
                ...userData,
                username: 'Unknown User',
                displayName: 'Unknown User',
                avatar: null
            };
        }
    }));

    const recentWarningsData = db.getWarnings.all(null, guildId);
    
    // Fetch Discord user info for warnings
    const recentWarnings = await Promise.all(recentWarningsData.slice(0, 5).map(async (warning) => {
        try {
            const user = await client.users.fetch(warning.user_id);
            const moderator = await client.users.fetch(warning.moderator_id);
            return {
                ...warning,
                username: user.username,
                moderatorName: moderator.username
            };
        } catch (error) {
            return {
                ...warning,
                username: 'Unknown User',
                moderatorName: 'Unknown Mod'
            };
        }
    }));

    const raidSettings = db.getRaidSettingsOrDefault(guildId);
    const roleRewards = db.getRoleRewards.all(guildId);

    // Count total XP earned in server
    const allUsers = db.getLeaderboard.all(guildId, 999999);
    const totalXP = allUsers.reduce((sum, user) => sum + user.xp, 0);
    
    res.render('dashboard/server', {
        user: req.user,
        guild: guild,
        userGuild: userGuild,
        config: config,
        stats: {
            memberCount: memberCount,
            totalXP: totalXP,
            activeUsers: allUsers.length,
            roleRewards: roleRewards.length
        },
        leaderboard: leaderboard,
        recentWarnings: recentWarnings,
        raidSettings: raidSettings
    });
});

// Leveling settings
router.get('/server/:guildId/leveling', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    const roles = Array.from(guild.roles.cache.values())
        .filter(role => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position);

    res.render('dashboard/leveling', {
        user: req.user,
        guild: guild,
        config: config,
        roles: roles
    });
});

// Leaderboard view
router.get('/server/:guildId/leaderboard', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    const leaderboard = db.getLeaderboard.all(guildId, 100);

    res.render('dashboard/leaderboard', {
        user: req.user,
        guild: guild,
        leaderboard: leaderboard
    });
});

// Custom commands
router.get('/server/:guildId/commands', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    const customCommands = db.getAllCustomCommands.all(guildId);

    res.render('dashboard/commands', {
        user: req.user,
        guild: guild,
        commands: customCommands
    });
});

// Welcome/Leave settings
router.get('/server/:guildId/welcome', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    const channels = Array.from(guild.channels.cache.values())
        .filter(channel => channel.type === 0); // Text channels only

    res.render('dashboard/welcome', {
        user: req.user,
        guild: guild,
        config: config,
        channels: channels
    });
});

// Moderation logs
router.get('/server/:guildId/moderation', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    // Get all warnings for this guild
    const allWarnings = db.getWarnings.all('%', guildId);

    res.render('dashboard/moderation', {
        user: req.user,
        guild: guild,
        warnings: allWarnings
    });
});

// Raid protection
router.get('/server/:guildId/raid', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;
    const guild = client ? client.guilds.cache.get(guildId) : null;

    if (!guild) {
        return res.status(404).send('Bot not in guild');
    }

    const channels = Array.from(guild.channels.cache.values())
        .filter(channel => channel.type === 0); // Text channels only

    const raidSettings = db.getRaidSettingsOrDefault(guildId);
    const raidIncidents = db.getRaidIncidents.all(guildId, 20);

    res.render('dashboard/raid', {
        user: req.user,
        guild: guild,
        channels: channels,
        settings: raidSettings,
        incidents: raidIncidents
    });
});

module.exports = router;
