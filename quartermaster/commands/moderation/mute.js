const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mute',
    description: 'Mute a user (timeout)',
    usage: '!mute @user <duration_in_minutes> [reason]',
    permissions: PermissionFlagsBits.ModerateMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to mute!');
        }

        const duration = parseInt(args[1]);
        if (!duration || duration < 1) {
            return message.reply('Please specify a duration in minutes (e.g., !mute @user 10 spam)');
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            return message.reply('User not found in this server!');
        }

        // Prevent self-mute
        if (user.id === message.author.id) {
            return message.reply('You cannot mute yourself!');
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';
        const durationMs = duration * 60 * 1000;

        // Max timeout is 28 days
        if (durationMs > 28 * 24 * 60 * 60 * 1000) {
            return message.reply('Maximum mute duration is 28 days!');
        }

        try {
            // Timeout the user
            await member.timeout(durationMs, `${reason} | Muted by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('User Muted')
                .setDescription(`${user.tag} has been muted`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            // Send DM to user
            await user.send(`You have been muted in ${message.guild.name} for ${duration} minutes. Reason: ${reason}`).catch(() => {});
        } catch (error) {
            console.error('Error muting user:', error);
            await message.reply('Failed to mute the user!');
        }
    }
};
