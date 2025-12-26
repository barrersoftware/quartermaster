const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'rank',
    aliases: ['level', 'xp'],
    description: 'Check your or another user\'s rank and XP',
    usage: '!rank [@user]',
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const guildId = message.guild.id;

        const userData = db.getUserData.get(user.id, guildId);

        if (!userData || userData.xp === 0) {
            return message.reply(`${user.tag} hasn't earned any XP yet!`);
        }

        const xpForCurrentLevel = db.calculateXPForLevel(userData.level);
        const xpForNextLevel = db.calculateXPForLevel(userData.level + 1);
        const xpProgress = userData.xp - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${user.tag}'s Rank`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Level', value: userData.level.toString(), inline: true },
                { name: 'Total XP', value: userData.xp.toString(), inline: true },
                { name: 'Progress', value: `${xpProgress}/${xpNeeded} XP`, inline: true }
            )
            .setFooter({ text: `${Math.floor((xpProgress / xpNeeded) * 100)}% to next level` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
