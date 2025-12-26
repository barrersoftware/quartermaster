const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

// Track guilds in lockdown
const lockdownGuilds = new Map();

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guildId = member.guild.id;

        // Check if guild is in lockdown
        if (lockdownGuilds.has(guildId)) {
            const lockdown = lockdownGuilds.get(guildId);
            if (Date.now() < lockdown.until) {
                try {
                    await member.send(`${member.guild.name} is currently in lockdown mode due to raid detection. Please try joining again later.`).catch(() => {});
                    await member.kick('Server in lockdown - Raid protection');
                } catch (error) {
                    console.error('Error kicking user during lockdown:', error);
                }
                return;
            } else {
                lockdownGuilds.delete(guildId);
            }
        }

        // Get raid protection settings
        const settings = db.getRaidSettingsOrDefault(guildId);

        if (!settings.enabled) return;

        // Track the join
        const accountCreated = member.user.createdTimestamp;
        const accountAge = Date.now() - accountCreated;
        const isSuspicious = accountAge < 7 * 24 * 60 * 60 * 1000; // Less than 7 days old

        try {
            db.trackJoin.run(member.id, guildId, Math.floor(accountCreated / 1000), isSuspicious ? 1 : 0);
        } catch (error) {
            console.error('Error tracking join:', error);
        }

        // Clean up old join records (older than 1 hour)
        const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
        try {
            db.clearOldJoins.run(oneHourAgo);
        } catch (error) {
            console.error('Error clearing old joins:', error);
        }

        // Check for raid pattern
        const timeWindowSeconds = settings.time_window;
        const thresholdTimestamp = Math.floor(Date.now() / 1000) - timeWindowSeconds;
        const recentJoins = db.getRecentJoins.all(guildId, thresholdTimestamp);

        // Raid detected if joins exceed threshold
        if (recentJoins.length >= settings.join_threshold) {
            console.log(`[RAID DETECTED] ${member.guild.name}: ${recentJoins.length} joins in ${timeWindowSeconds}s`);
            await handleRaid(member.guild, recentJoins, settings, client);
        }
    }
};

async function handleRaid(guild, recentJoins, settings, client) {
    const userIds = recentJoins.map(j => j.user_id);
    const affectedUsers = [];

    // Send alert
    if (settings.alert_channel) {
        const alertChannel = guild.channels.cache.find(ch => ch.name === settings.alert_channel);
        if (alertChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚨 RAID DETECTED')
                .setDescription(`Detected ${recentJoins.length} users joining within ${settings.time_window} seconds!`)
                .addFields(
                    { name: 'Action Taken', value: settings.action.toUpperCase(), inline: true },
                    { name: 'Users Affected', value: recentJoins.length.toString(), inline: true }
                )
                .setTimestamp();

            await alertChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }

    // Take action based on settings
    switch (settings.action) {
        case 'kick':
            for (const userId of userIds) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member && member.kickable) {
                        await member.kick('Raid protection - Suspicious join pattern');
                        affectedUsers.push(userId);
                    }
                } catch (error) {
                    console.error(`Error kicking user ${userId}:`, error);
                }
            }
            break;

        case 'ban':
            for (const userId of userIds) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member && member.bannable) {
                        await member.ban({ reason: 'Raid protection - Suspicious join pattern', deleteMessageSeconds: 86400 });
                        affectedUsers.push(userId);
                    }
                } catch (error) {
                    console.error(`Error banning user ${userId}:`, error);
                }
            }
            break;

        case 'lockdown':
            // Enable server lockdown
            const lockdownDuration = settings.lockdown_duration * 1000;
            lockdownGuilds.set(guild.id, {
                until: Date.now() + lockdownDuration,
                initiatedAt: Date.now()
            });

            // Kick recent joins
            for (const userId of userIds) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member && member.kickable) {
                        await member.kick('Raid protection - Server lockdown initiated');
                        affectedUsers.push(userId);
                    }
                } catch (error) {
                    console.error(`Error kicking user ${userId}:`, error);
                }
            }

            // Alert about lockdown
            if (settings.alert_channel) {
                const alertChannel = guild.channels.cache.find(ch => ch.name === settings.alert_channel);
                if (alertChannel) {
                    const lockdownEmbed = new EmbedBuilder()
                        .setColor('#FF6600')
                        .setTitle('🔒 SERVER LOCKDOWN ACTIVE')
                        .setDescription(`Server is in lockdown for ${settings.lockdown_duration} seconds. New joins will be automatically kicked.`)
                        .setTimestamp();

                    await alertChannel.send({ embeds: [lockdownEmbed] }).catch(console.error);

                    // Schedule lockdown end message
                    setTimeout(async () => {
                        if (!lockdownGuilds.has(guild.id)) return;
                        lockdownGuilds.delete(guild.id);

                        const endEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ SERVER LOCKDOWN ENDED')
                            .setDescription('Server lockdown has been lifted. Normal operations resumed.')
                            .setTimestamp();

                        await alertChannel.send({ embeds: [endEmbed] }).catch(console.error);
                    }, lockdownDuration);
                }
            }
            break;

        case 'alert':
            // Just alert, no action
            affectedUsers.push(...userIds);
            break;
    }

    // Log the incident
    try {
        db.logRaidIncident.run(
            guild.id,
            recentJoins.length,
            settings.action,
            JSON.stringify(affectedUsers)
        );
    } catch (error) {
        console.error('Error logging raid incident:', error);
    }
}

// Export lockdown management functions
module.exports.isInLockdown = (guildId) => {
    if (!lockdownGuilds.has(guildId)) return false;
    const lockdown = lockdownGuilds.get(guildId);
    if (Date.now() >= lockdown.until) {
        lockdownGuilds.delete(guildId);
        return false;
    }
    return true;
};

module.exports.endLockdown = (guildId) => {
    lockdownGuilds.delete(guildId);
};

module.exports.getLockdownInfo = (guildId) => {
    return lockdownGuilds.get(guildId);
};
