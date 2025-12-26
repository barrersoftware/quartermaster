const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'clearwarnings',
    aliases: ['clearwarns'],
    description: 'Clear all warnings for a user',
    usage: '!clearwarnings @user',
    permissions: PermissionFlagsBits.Administrator,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to clear warnings for!');
        }

        const warnings = db.getWarnings.all(user.id, message.guild.id);

        if (!warnings || warnings.length === 0) {
            return message.reply(`${user.tag} has no warnings to clear!`);
        }

        try {
            db.clearWarnings.run(user.id, message.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Warnings Cleared')
                .setDescription(`All warnings for ${user.tag} have been cleared`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Warnings Cleared', value: warnings.length.toString(), inline: true }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error clearing warnings:', error);
            await message.reply('Failed to clear warnings!');
        }
    }
};
