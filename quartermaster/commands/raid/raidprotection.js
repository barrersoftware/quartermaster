const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'raidprotection',
    aliases: ['raidprotect', 'antiraid'],
    description: 'Configure raid protection settings',
    usage: '!raidprotection <enable|disable|status|config>',
    permissions: PermissionFlagsBits.Administrator,
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('Usage: !raidprotection <enable|disable|status|config>');
        }

        const subcommand = args[0].toLowerCase();
        const guildId = message.guild.id;

        switch (subcommand) {
            case 'enable':
                await enableRaidProtection(message, guildId);
                break;

            case 'disable':
                await disableRaidProtection(message, guildId);
                break;

            case 'status':
                await showStatus(message, guildId);
                break;

            case 'config':
                await showConfig(message, guildId);
                break;

            default:
                return message.reply('Unknown subcommand. Use: enable, disable, status, or config');
        }
    }
};

async function enableRaidProtection(message, guildId) {
    const settings = db.getRaidSettingsOrDefault(guildId);

    db.setRaidSettings.run(
        guildId,
        1, // enabled
        settings.join_threshold,
        settings.time_window,
        settings.action,
        settings.alert_channel,
        settings.lockdown_duration,
        JSON.stringify(settings.whitelist_roles),
        settings.verification_level
    );

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Raid Protection Enabled')
        .setDescription('Raid protection is now active for this server.')
        .addFields(
            { name: 'Join Threshold', value: settings.join_threshold.toString(), inline: true },
            { name: 'Time Window', value: `${settings.time_window}s`, inline: true },
            { name: 'Action', value: settings.action, inline: true }
        )
        .setFooter({ text: 'Use the web dashboard for advanced configuration' })
        .setTimestamp();

    await message.channel.send({ embeds: [embed] });
}

async function disableRaidProtection(message, guildId) {
    const settings = db.getRaidSettingsOrDefault(guildId);

    db.setRaidSettings.run(
        guildId,
        0, // disabled
        settings.join_threshold,
        settings.time_window,
        settings.action,
        settings.alert_channel,
        settings.lockdown_duration,
        JSON.stringify(settings.whitelist_roles),
        settings.verification_level
    );

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⛔ Raid Protection Disabled')
        .setDescription('Raid protection has been disabled for this server.')
        .setTimestamp();

    await message.channel.send({ embeds: [embed] });
}

async function showStatus(message, guildId) {
    const settings = db.getRaidSettingsOrDefault(guildId);
    const raidDetection = require('../../events/raidDetection');
    const isLocked = raidDetection.isInLockdown(guildId);
    const lockdownInfo = raidDetection.getLockdownInfo(guildId);

    const embed = new EmbedBuilder()
        .setColor(settings.enabled ? '#00FF00' : '#808080')
        .setTitle('🛡️ Raid Protection Status')
        .addFields(
            { name: 'Status', value: settings.enabled ? '✅ Enabled' : '⛔ Disabled', inline: true },
            { name: 'Lockdown', value: isLocked ? '🔒 ACTIVE' : '✅ Normal', inline: true }
        );

    if (isLocked && lockdownInfo) {
        const remaining = Math.ceil((lockdownInfo.until - Date.now()) / 1000);
        embed.addFields({ name: 'Lockdown Ends In', value: `${remaining} seconds`, inline: true });
    }

    if (settings.enabled) {
        embed.addFields(
            { name: 'Join Threshold', value: settings.join_threshold.toString(), inline: true },
            { name: 'Time Window', value: `${settings.time_window}s`, inline: true },
            { name: 'Action', value: settings.action.toUpperCase(), inline: true }
        );

        if (settings.alert_channel) {
            embed.addFields({ name: 'Alert Channel', value: `#${settings.alert_channel}`, inline: true });
        }
    }

    embed.setTimestamp();
    await message.channel.send({ embeds: [embed] });
}

async function showConfig(message, guildId) {
    const settings = db.getRaidSettingsOrDefault(guildId);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚙️ Raid Protection Configuration')
        .setDescription('Current raid protection settings for this server.')
        .addFields(
            { name: 'Enabled', value: settings.enabled ? 'Yes' : 'No', inline: true },
            { name: 'Join Threshold', value: `${settings.join_threshold} users`, inline: true },
            { name: 'Time Window', value: `${settings.time_window} seconds`, inline: true },
            { name: 'Action', value: settings.action.toUpperCase(), inline: true },
            { name: 'Lockdown Duration', value: `${settings.lockdown_duration} seconds`, inline: true },
            { name: 'Alert Channel', value: settings.alert_channel || 'Not set', inline: true }
        )
        .setFooter({ text: 'Configure these settings in the web dashboard' })
        .setTimestamp();

    await message.channel.send({ embeds: [embed] });
}
