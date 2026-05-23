const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger');

module.exports = {
    name: 'mute',
    description: 'Mute a user (timeout)',
    usage: '!mute @user <duration_in_minutes> [reason]',
    permissions: PermissionFlagsBits.ModerateMembers,
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user (timeout)')
        .addUserOption(opt => opt.setName('target').setDescription('The user to mute').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the mute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const duration = isInteraction ? interaction.options.getInteger('duration') : parseInt(args[1]);
        const reason = isInteraction ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(2).join(' ') || 'No reason provided');

        if (!user) {
            const msg = 'Please mention a user to mute!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        if (!duration || duration < 1) {
            const msg = 'Please specify a valid duration in minutes.';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            const msg = 'User not found in this server!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const author = isInteraction ? interaction.user : interaction.author;

        if (user.id === author.id) {
            const msg = 'You cannot mute yourself!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const durationMs = duration * 60 * 1000;
        if (durationMs > 28 * 24 * 60 * 60 * 1000) {
            const msg = 'Maximum mute duration is 28 days!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        try {
            await member.timeout(durationMs, `${reason} | Muted by ${author.tag}`);
            await logger.logModeration(interaction.guild, 'MUTE', author, user, `${duration}m | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('User Muted')
                .setDescription(`${user.tag} has been muted`)
                .addFields(
                    { name: 'Moderator', value: author.tag, inline: true },
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }

            await user.send(`You have been muted in ${interaction.guild.name} for ${duration} minutes. Reason: ${reason}`).catch(() => {});
        } catch (error) {
            console.error('Error muting user:', error);
            const errMsg = 'Failed to mute the user!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
