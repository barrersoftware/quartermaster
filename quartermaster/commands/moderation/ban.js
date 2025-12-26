const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: '!ban @user [reason]',
    permissions: PermissionFlagsBits.BanMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to ban!');
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            return message.reply('User not found in this server!');
        }

        // Check if user can be banned
        if (!member.bannable) {
            return message.reply('I cannot ban this user! They may have a higher role than me.');
        }

        // Prevent self-ban
        if (user.id === message.author.id) {
            return message.reply('You cannot ban yourself!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // Send DM to user
            await user.send(`You have been banned from ${message.guild.name}. Reason: ${reason}`).catch(() => {});

            // Ban the user
            await member.ban({ reason: `${reason} | Banned by ${message.author.tag}` });

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('User Banned')
                .setDescription(`${user.tag} has been banned`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error banning user:', error);
            await message.reply('Failed to ban the user!');
        }
    }
};
