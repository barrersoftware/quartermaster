const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'warnings',
    aliases: ['warns'],
    description: 'View warnings for a user',
    usage: '!warnings @user',
    permissions: PermissionFlagsBits.ModerateMembers,
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const warnings = db.getWarnings.all(user.id, message.guild.id);

        if (!warnings || warnings.length === 0) {
            return message.reply(`${user.tag} has no warnings!`);
        }

        let description = '';
        for (let i = 0; i < warnings.length; i++) {
            const warn = warnings[i];
            const date = new Date(warn.timestamp * 1000).toLocaleDateString();
            description += `**${i + 1}.** ${warn.reason}\n*By <@${warn.moderator_id}> on ${date}*\n\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`Warnings for ${user.tag}`)
            .setDescription(description)
            .setFooter({ text: `Total warnings: ${warnings.length}` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
