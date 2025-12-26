const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'warn',
    description: 'Warn a user',
    usage: '!warn @user <reason>',
    permissions: PermissionFlagsBits.ModerateMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to warn!');
        }

        const reason = args.slice(1).join(' ');
        if (!reason) {
            return message.reply('Please provide a reason for the warning!');
        }

        // Prevent self-warn
        if (user.id === message.author.id) {
            return message.reply('You cannot warn yourself!');
        }

        try {
            // Add warning to database
            db.addWarning.run(user.id, message.guild.id, message.author.id, reason);

            // Get total warnings
            const warnings = db.getWarnings.all(user.id, message.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('User Warned')
                .setDescription(`${user.tag} has been warned`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Total Warnings', value: warnings.length.toString(), inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            // Send DM to user
            await user.send(`You have been warned in ${message.guild.name}. Reason: ${reason}\nTotal warnings: ${warnings.length}`).catch(() => {});
        } catch (error) {
            console.error('Error warning user:', error);
            await message.reply('Failed to warn the user!');
        }
    }
};
