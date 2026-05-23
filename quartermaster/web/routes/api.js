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

    // Update auto_role and visuals in database
    const settings = db.getGuildSettingsOrDefault(guildId);
    if (req.body.auto_role !== undefined) {
        settings.auto_role = req.body.auto_role || null;
    }

    db.setGuildSetting.run(
        guildId,
        settings.welcome_channel,
        settings.leave_channel,
        settings.log_channel,
        settings.mute_role,
        settings.rank_card_color,
        settings.auto_role
    );

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

// Update auto-mod settings
router.post('/server/:guildId/automod', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    try {
        const settings = db.getAutomodSettingsOrDefault(guildId);
        
        // Update from body
        if (req.body.spam_enabled !== undefined) settings.spam_enabled = parseInt(req.body.spam_enabled);
        if (req.body.spam_threshold !== undefined) settings.spam_threshold = parseInt(req.body.spam_threshold);
        if (req.body.links_enabled !== undefined) settings.links_enabled = parseInt(req.body.links_enabled);
        if (req.body.invites_enabled !== undefined) settings.invites_enabled = parseInt(req.body.invites_enabled);
        if (req.body.badwords_enabled !== undefined) settings.badwords_enabled = parseInt(req.body.badwords_enabled);

        db.setAutomodSettings.run(
            guildId,
            settings.spam_enabled,
            settings.spam_threshold,
            settings.links_enabled,
            settings.invites_enabled,
            settings.badwords_enabled
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update automod' });
    }
});

// Add to blacklist
router.post('/server/:guildId/automod/blacklist', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'Missing word' });

    try {
        db.addBlacklistWord.run(guildId, word.toLowerCase());
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add word' });
    }
});

// Remove from blacklist
router.delete('/server/:guildId/automod/blacklist/:word', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const word = req.params.word;

    try {
        db.removeBlacklistWord.run(guildId, word);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove word' });
    }
});

// Update visual settings
router.post('/server/:guildId/settings/visuals', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    try {
        const settings = db.getGuildSettingsOrDefault(guildId);
        
        if (req.body.rank_card_color) settings.rank_card_color = req.body.rank_card_color;
        if (req.body.rank_background !== undefined) settings.rank_background = req.body.rank_background || null;
        if (req.body.welcome_background !== undefined) settings.welcome_background = req.body.welcome_background || null;

        db.setGuildSetting.run(
            guildId,
            settings.welcome_channel,
            settings.leave_channel,
            settings.log_channel,
            settings.mute_role,
            settings.rank_card_color,
            settings.auto_role,
            JSON.stringify(settings.mod_roles),
            settings.rank_background,
            settings.welcome_background
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update visuals' });
    }
});

// Add multiplier
router.post('/server/:guildId/leveling/multiplier', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { target_id, type, multiplier } = req.body;
    if (!target_id || !type || !multiplier) return res.status(400).json({ error: 'Missing fields' });

    try {
        db.addMultiplier.run(guildId, target_id, type, parseFloat(multiplier));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add multiplier' });
    }
});

// Remove multiplier
router.delete('/server/:guildId/leveling/multiplier/:type/:targetId', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { type, targetId } = req.params;

    try {
        db.deleteMultiplier.run(guildId, targetId, type);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove multiplier' });
    }
});

// Add moderator role
router.post('/server/:guildId/permissions/mod-roles', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { roleId } = req.body;
    if (!roleId) return res.status(400).json({ error: 'Missing roleId' });

    try {
        const settings = db.getGuildSettingsOrDefault(guildId);
        if (!settings.mod_roles.includes(roleId)) {
            settings.mod_roles.push(roleId);
            db.setGuildSetting.run(
                guildId,
                settings.welcome_channel,
                settings.leave_channel,
                settings.log_channel,
                settings.mute_role,
                settings.rank_card_color,
                settings.auto_role,
                JSON.stringify(settings.mod_roles)
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add role' });
    }
});

// Remove moderator role
router.delete('/server/:guildId/permissions/mod-roles/:roleId', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { roleId } = req.params;

    try {
        const settings = db.getGuildSettingsOrDefault(guildId);
        settings.mod_roles = settings.mod_roles.filter(id => id !== roleId);
        db.setGuildSetting.run(
            guildId,
            settings.welcome_channel,
            settings.leave_channel,
            settings.log_channel,
            settings.mute_role,
            settings.rank_card_color,
            settings.auto_role,
            JSON.stringify(settings.mod_roles),
            settings.rank_background,
            settings.welcome_background
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove role' });
    }
});

// Add trigger
router.post('/server/:guildId/triggers', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { phrase, response, type } = req.body;
    if (!phrase || !response) return res.status(400).json({ error: 'Missing fields' });

    try {
        db.addTrigger.run(guildId, phrase.toLowerCase(), response, type || 'text', req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add trigger' });
    }
});

// Remove trigger
router.delete('/server/:guildId/triggers/:phrase', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const phrase = req.params.phrase;

    try {
        db.deleteTrigger.run(guildId, phrase);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove trigger' });
    }
});

// Add social alert
router.post('/server/:guildId/social', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { platform, channel, alert_channel_id } = req.body;
    if (!platform || !channel || !alert_channel_id) return res.status(400).json({ error: 'Missing fields' });

    try {
        db.addSocialAlert.run(guildId, platform, channel, alert_channel_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add social alert' });
    }
});

// Remove social alert
router.delete('/server/:guildId/social/:platform/:channel', (req, res) => {
    const guildId = req.params.guildId;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { platform, channel } = req.params;

    try {
        db.deleteSocialAlert.run(guildId, platform, channel);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove social alert' });
    }
});

// Add reaction role
router.post('/server/:guildId/reaction-roles', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { message_id, emoji, role_id } = req.body;
    if (!message_id || !emoji || !role_id) return res.status(400).json({ error: 'Missing fields' });

    try {
        db.addReactionRole.run(guildId, message_id, emoji, role_id);
        
        // Update client memory
        if (!client.reactionRoles.has(guildId)) client.reactionRoles.set(guildId, new Map());
        client.reactionRoles.get(guildId).set(`${message_id}-${emoji}`, role_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add reaction role' });
    }
});

// Delete reaction role
router.delete('/server/:guildId/reaction-roles/:messageId/:emoji', (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.locals.client;

    if (!hasGuildAccess(req, guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }

    const { messageId, emoji } = req.params;

    try {
        db.deleteReactionRole.run(guildId, messageId, emoji);
        
        // Update client memory
        if (client.reactionRoles.has(guildId)) {
            client.reactionRoles.get(guildId).delete(`${messageId}-${emoji}`);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove reaction role' });
    }
});

module.exports = router;
