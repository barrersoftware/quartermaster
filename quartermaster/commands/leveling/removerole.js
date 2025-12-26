const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'removerole',
    description: 'Remove a role reward for a specific level',
    usage: '!removerole <level>',
    requiredPermissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }

        if (args.length < 1) {
            return message.reply('Usage: `!removerole <level>`\nExample: `!removerole 10`');
        }

        const level = parseInt(args[0]);
        if (isNaN(level)) {
            return message.reply('❌ Level must be a number.');
        }

        try {
            db.deleteRoleReward.run(message.guild.id, level);
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✅ Role Reward Removed')
                .setDescription(`Role reward for level **${level}** has been removed.`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing role reward:', error);
            message.reply('❌ An error occurred while removing the role reward.');
        }
    }
};
