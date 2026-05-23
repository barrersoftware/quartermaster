const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const logger = require('../../logger');

module.exports = {
    name: 'tempban',
    description: 'Temporarily ban a user from the server',
    usage: '!tempban @user <duration> [reason]',
    permissions: PermissionFlagsBits.BanMembers,
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 1h, 1d, 7d)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const durationStr = isInteraction ? interaction.options.getString('duration') : args[1];
        const reason = isInteraction ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(2).join(' ') || 'No reason provided');

        if (!user || !durationStr) {
            const msg = 'Usage: `!tempban @user <duration> [reason]` (e.g., `!tempban @user 1d spam`)';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (member && !member.bannable) {
            const msg = 'I cannot ban this user!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const author = isInteraction ? interaction.user : interaction.author;

        // Parse duration
        const durationMatch = durationStr.match(/^(\d+)([hdw])$/);
        if (!durationMatch) {
            const msg = 'Invalid duration format! Use `h` (hours), `d` (days), or `w` (weeks). Example: `1d`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const amount = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        let durationMs = amount * 60 * 60 * 1000;
        if (unit === 'd') durationMs *= 24;
        if (unit === 'w') durationMs *= 24 * 7;

        const unbanTime = Math.floor((Date.now() + durationMs) / 1000);

        try {
            await user.send(`You have been temporarily banned from ${interaction.guild.name} until <t:${unbanTime}:F>. Reason: ${reason}`).catch(() => {});
            await interaction.guild.members.ban(user.id, { reason: `${reason} | Temp-ban until ${new Date(unbanTime * 1000).toISOString()} by ${author.tag}` });

            await logger.logModeration(interaction.guild, 'TEMPBAN', author, user, `${durationStr} | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('User Temporarily Banned')
                .setDescription(`${user.tag} has been banned for ${durationStr}`)
                .addFields(
                    { name: 'Moderator', value: author.tag, inline: true },
                    { name: 'Expires', value: `<t:${unbanTime}:R>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error temp-banning user:', error);
            const errMsg = 'Failed to temporarily ban the user!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
