const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kick',
    description: 'Kick a user from the server',
    usage: '!kick @user [reason]',
    permissions: PermissionFlagsBits.KickMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to kick!');
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            return message.reply('User not found in this server!');
        }

        // Check if user can be kicked
        if (!member.kickable) {
            return message.reply('I cannot kick this user! They may have a higher role than me.');
        }

        // Prevent self-kick
        if (user.id === message.author.id) {
            return message.reply('You cannot kick yourself!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // Send DM to user
            await user.send(`You have been kicked from ${message.guild.name}. Reason: ${reason}`).catch(() => {});

            // Kick the user
            await member.kick(`${reason} | Kicked by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('User Kicked')
                .setDescription(`${user.tag} has been kicked`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error kicking user:', error);
            await message.reply('Failed to kick the user!');
        }
    }
};
