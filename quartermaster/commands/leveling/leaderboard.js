const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'View the server leaderboard',
    usage: '!leaderboard [limit]',
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('Number of users to show (max 25)')
                .setRequired(false)),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const limit = isInteraction ? 
            (interaction.options.getInteger('limit') || 10) : 
            (parseInt(args[0]) || 10);
            
        const maxLimit = Math.min(limit, 25);
        const guildId = interaction.guild.id;

        const leaderboard = db.getLeaderboard.all(guildId, maxLimit);

        if (!leaderboard || leaderboard.length === 0) {
            const msg = 'No one has earned XP yet!';
            return isInteraction ? interaction.reply(msg) : interaction.reply(msg);
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
            .setTitle(`${interaction.guild.name} Leaderboard`)
            .setDescription(description)
            .setFooter({ text: `Showing top ${leaderboard.length} members` })
            .setTimestamp();

        if (isInteraction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.channel.send({ embeds: [embed] });
        }
    }
};
