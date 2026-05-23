const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger');

module.exports = {
    name: 'unmute',
    description: 'Remove timeout from a user',
    usage: '!unmute @user [reason]',
    permissions: PermissionFlagsBits.ModerateMembers,
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption(opt => opt.setName('target').setDescription('The user to unmute').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the unmute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const reason = isInteraction ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(1).join(' ') || 'No reason provided');

        if (!user) {
            const msg = 'Please mention a user to unmute!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            const msg = 'User not found in this server!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const author = isInteraction ? interaction.user : interaction.author;

        try {
            await member.timeout(null, `${reason} | Unmuted by ${author.tag}`);
            await logger.logModeration(interaction.guild, 'UNMUTE', author, user, reason);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('User Unmuted')
                .setDescription(`${user.tag} has been unmuted`)
                .addFields(
                    { name: 'Moderator', value: author.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error unmuting user:', error);
            const errMsg = 'Failed to unmute the user!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
