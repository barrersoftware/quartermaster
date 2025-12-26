const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'addrole',
    description: 'Add a role reward for reaching a specific level',
    usage: '!addrole <level> <@role>',
    requiredPermissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }

        if (args.length < 2) {
            return message.reply('Usage: `!addrole <level> <@role>`\nExample: `!addrole 10 @Member`');
        }

        const level = parseInt(args[0]);
        if (isNaN(level) || level < 1) {
            return message.reply('❌ Level must be a number greater than 0.');
        }

        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply('❌ Please mention a valid role.');
        }

        // Check if bot can manage this role
        const botMember = message.guild.members.cache.get(message.client.user.id);
        if (role.position >= botMember.roles.highest.position) {
            return message.reply('❌ I cannot manage this role as it is higher than or equal to my highest role.');
        }

        try {
            db.addRoleReward.run(message.guild.id, level, role.id);
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✅ Role Reward Added')
                .setDescription(`Users will now receive ${role} when they reach level **${level}**`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error adding role reward:', error);
            message.reply('❌ An error occurred while adding the role reward.');
        }
    }
};
