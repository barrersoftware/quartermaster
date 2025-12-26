const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tempban',
    description: 'Temporarily ban a user from the server',
    usage: '!tempban @user <duration> [reason]\nDuration format: 1h, 30m, 2d',
    permissions: PermissionFlagsBits.BanMembers,
    async execute(message, args) {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Please mention a user to tempban!');
        }

        if (!args[1]) {
            return message.reply('Usage: `!tempban @user <duration> [reason]`\nExample: `!tempban @user 24h spamming`');
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

        // Parse duration
        const durationStr = args[1];
        const durationMatch = durationStr.match(/^(\d+)([smhd])$/i);
        
        if (!durationMatch) {
            return message.reply('Invalid duration format! Use: 30m, 2h, 1d\nExamples: 30m = 30 minutes, 2h = 2 hours, 1d = 1 day');
        }

        const amount = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        
        let durationMs;
        let durationText;
        
        switch (unit) {
            case 's':
                durationMs = amount * 1000;
                durationText = `${amount} second${amount > 1 ? 's' : ''}`;
                break;
            case 'm':
                durationMs = amount * 60 * 1000;
                durationText = `${amount} minute${amount > 1 ? 's' : ''}`;
                break;
            case 'h':
                durationMs = amount * 60 * 60 * 1000;
                durationText = `${amount} hour${amount > 1 ? 's' : ''}`;
                break;
            case 'd':
                durationMs = amount * 24 * 60 * 60 * 1000;
                durationText = `${amount} day${amount > 1 ? 's' : ''}`;
                break;
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';

        try {
            // Send DM to user
            await user.send(`You have been temporarily banned from ${message.guild.name} for ${durationText}. Reason: ${reason}`).catch(() => {});

            // Ban the user
            await member.ban({ reason: `TEMP BAN (${durationText}): ${reason} | Banned by ${message.author.tag}` });

            const embed = new EmbedBuilder()
                .setColor('#FF6600')
                .setTitle('⏰ User Temporarily Banned')
                .setDescription(`${user.tag} has been temporarily banned`)
                .addFields(
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Duration', value: durationText, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'User will be automatically unbanned when duration expires' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            // Schedule unban
            setTimeout(async () => {
                try {
                    await message.guild.members.unban(user.id, `Temporary ban expired (${durationText})`);
                    console.log(`Auto-unbanned ${user.tag} from ${message.guild.name}`);
                    
                    // Try to notify in the same channel
                    const unbanEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('⏰ Temporary Ban Expired')
                        .setDescription(`${user.tag} has been automatically unbanned`)
                        .setTimestamp();
                    
                    await message.channel.send({ embeds: [unbanEmbed] });
                } catch (error) {
                    console.error(`Error auto-unbanning ${user.tag}:`, error);
                }
            }, durationMs);

        } catch (error) {
            console.error('Error temp banning user:', error);
            await message.reply('Failed to ban the user!');
        }
    }
};
