const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'rolerewards',
    aliases: ['roles', 'rewards'],
    description: 'View all role rewards configured for this server',
    usage: '!rolerewards',
    async execute(message, args) {
        try {
            const roleRewards = db.getRoleRewards.all(message.guild.id);

            if (roleRewards.length === 0) {
                return message.reply('No role rewards configured yet. Use `!addrole <level> <@role>` to add one.');
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📋 Role Rewards')
                .setDescription('Users automatically receive these roles when reaching the specified levels:')
                .setTimestamp();

            const rolesList = roleRewards.map(reward => {
                const role = message.guild.roles.cache.get(reward.role_id);
                if (role) {
                    return `Level **${reward.level}** → ${role}`;
                } else {
                    return `Level **${reward.level}** → *Role not found*`;
                }
            }).join('\n');

            embed.addFields({ name: 'Rewards', value: rolesList || 'None configured', inline: false });

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching role rewards:', error);
            message.reply('❌ An error occurred while fetching role rewards.');
        }
    }
};
