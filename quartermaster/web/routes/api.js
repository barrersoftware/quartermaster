const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../../database');

// Helper to check guild access
function hasGuildAccess(req, guildId) {
    const userGuild = req.user.guilds.find(g => g.id === guildId && (g.permissions & 0x20) === 0x20);
    return !!userGuild;
}

// Update leveling settings
router.post('/server/:guildId/leveling', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const configPath = path.join(__dirname, '../../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Update leveling settings
    if (req.body.enabled !== undefined) {
        config.leveling.enabled = req.body.enabled === 'true' || req.body.enabled === true;
    }
    if (req.body.xpMin) {
        config.leveling.xpPerMessage.min = parseInt(req.body.xpMin);
    }
    if (req.body.xpMax) {
        config.leveling.xpPerMessage.max = parseInt(req.body.xpMax);
    }
    if (req.body.cooldown) {
        config.leveling.cooldown = parseInt(req.body.cooldown);
    }
    if (req.body.levelUpMessage) {
        config.leveling.levelUpMessage = req.body.levelUpMessage;
    }

    // Update role rewards
    if (req.body.roleRewards) {
        config.leveling.roleRewards = JSON.parse(req.body.roleRewards);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({ success: true, message: 'Leveling settings updated' });
});

// Add role reward
router.post('/server/:guildId/leveling/role-reward', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { level, roleId } = req.body;

    if (!level || !roleId) {
        return res.status(400).json({ error: 'Missing level or roleId' });
    }

    const configPath = path.join(__dirname, '../../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    config.leveling.roleRewards[level] = roleId;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({ success: true, message: 'Role reward added' });
});

// Remove role reward
router.delete('/server/:guildId/leveling/role-reward/:level', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const level = req.params.level;

    const configPath = path.join(__dirname, '../../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    delete config.leveling.roleRewards[level];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({ success: true, message: 'Role reward removed' });
});

// Add custom command
router.post('/server/:guildId/commands', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { commandName, response } = req.body;

    if (!commandName || !response) {
        return res.status(400).json({ error: 'Missing command name or response' });
    }

    try {
        db.addCustomCommand.run(guildId, commandName.toLowerCase(), response, req.user.id);
        res.json({ success: true, message: 'Command added successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Command already exists' });
        }
        res.status(500).json({ error: 'Failed to add command' });
    }
});

// Delete custom command
router.delete('/server/:guildId/commands/:commandName', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const commandName = req.params.commandName;

    try {
        const result = db.deleteCustomCommand.run(guildId, commandName);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Command not found' });
        }

        res.json({ success: true, message: 'Command deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete command' });
    }
});

// Update welcome/leave settings
router.post('/server/:guildId/welcome', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const configPath = path.join(__dirname, '../../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Update welcome settings
    if (req.body.welcomeEnabled !== undefined) {
        config.welcome.enabled = req.body.welcomeEnabled === 'true' || req.body.welcomeEnabled === true;
    }
    if (req.body.welcomeChannel) {
        config.welcome.channelName = req.body.welcomeChannel;
    }
    if (req.body.welcomeMessage) {
        config.welcome.message = req.body.welcomeMessage;
    }
    if (req.body.welcomeColor) {
        config.welcome.embedColor = req.body.welcomeColor;
    }

    // Update leave settings
    if (req.body.leaveEnabled !== undefined) {
        config.leave.enabled = req.body.leaveEnabled === 'true' || req.body.leaveEnabled === true;
    }
    if (req.body.leaveChannel) {
        config.leave.channelName = req.body.leaveChannel;
    }
    if (req.body.leaveMessage) {
        config.leave.message = req.body.leaveMessage;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({ success: true, message: 'Welcome/Leave settings updated' });
});

// Update raid protection settings
router.post('/server/:guildId/raid', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    try {
        const enabled = req.body.enabled === 'true' || req.body.enabled === true ? 1 : 0;
        const joinThreshold = parseInt(req.body.joinThreshold) || 5;
        const timeWindow = parseInt(req.body.timeWindow) || 10;
        const action = req.body.action || 'kick';
        const alertChannel = req.body.alertChannel || null;
        const lockdownDuration = parseInt(req.body.lockdownDuration) || 300;
        const whitelistRoles = req.body.whitelistRoles || '[]';
        const verificationLevel = parseInt(req.body.verificationLevel) || 0;

        db.setRaidSettings.run(
            guildId,
            enabled,
            joinThreshold,
            timeWindow,
            action,
            alertChannel,
            lockdownDuration,
            whitelistRoles,
            verificationLevel
        );

        res.json({ success: true, message: 'Raid protection settings updated' });
    } catch (error) {
        console.error('Error updating raid settings:', error);
        res.status(500).json({ error: 'Failed to update raid settings' });
    }
});

module.exports = router;
