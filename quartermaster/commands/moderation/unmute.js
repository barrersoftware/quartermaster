const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Unmute a user (remove timeout)',
    usage: '!unmute @user',
    permissions: PermissionFlagsBits.ModerateMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to unmute!');
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            return message.reply('User not found in this server!');
        }

        try {
            // Remove timeout
            await member.timeout(null, `Unmuted by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('User Unmuted')
                .setDescription(`${user.tag} has been unmuted`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            // Send DM to user
            await user.send(`You have been unmuted in ${message.guild.name}.`).catch(() => {});
        } catch (error) {
            console.error('Error unmuting user:', error);
            await message.reply('Failed to unmute the user!');
        }
    }
};
