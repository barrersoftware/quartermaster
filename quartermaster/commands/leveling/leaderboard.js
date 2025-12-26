const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'View the server leaderboard',
    usage: '!leaderboard [limit]',
    async execute(message, args) {
        const limit = parseInt(args[0]) || 10;
        const maxLimit = Math.min(limit, 25);

        const leaderboard = db.getLeaderboard.all(message.guild.id, maxLimit);

        if (!leaderboard || leaderboard.length === 0) {
            return message.reply('No one has earned XP yet!');
        }

        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const rank = i + 1;
            const medal = rank === 1 ? ':first_place:' : rank === 2 ? ':second_place:' : rank === 3 ? ':third_place:' : `#${rank}`;

            description += `${medal} <@${user.user_id}> - Level ${user.level} (${user.xp} XP)\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${message.guild.name} Leaderboard`)
            .setDescription(description)
            .setFooter({ text: `Showing top ${leaderboard.length} members` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
