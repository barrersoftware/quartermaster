const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'endlockdown',
    aliases: ['unlock', 'unlockserver'],
    description: 'Manually end server lockdown',
    usage: '!endlockdown',
    permissions: PermissionFlagsBits.Administrator,
    async execute(message) {
        const guildId = message.guild.id;
        const raidDetection = require('../../events/raidDetection');

        if (!raidDetection.isInLockdown(guildId)) {
            return message.reply('Server is not currently in lockdown.');
        }

        raidDetection.endLockdown(guildId);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Lockdown Ended')
            .setDescription('Server lockdown has been manually ended by an administrator.')
            .addFields({ name: 'Ended By', value: message.author.tag, inline: true })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
