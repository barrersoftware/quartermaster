const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const logger = require('../../logger');

module.exports = {
    name: 'clearwarnings',
    description: 'Clear all warnings for a user',
    usage: '!clearwarnings @user',
    permissions: PermissionFlagsBits.Administrator,
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a user')
        .addUserOption(opt => opt.setName('target').setDescription('The user to clear warnings for').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();

        if (!user) {
            const msg = 'Please mention a user to clear warnings!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const guildId = interaction.guild.id;
        const author = isInteraction ? interaction.user : interaction.author;

        try {
            db.clearWarnings.run(user.id, guildId);
            await logger.logModeration(interaction.guild, 'CLEAR_WARNINGS', author, user, 'All warnings cleared');

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Warnings Cleared')
                .setDescription(`All warnings for ${user.tag} have been cleared.`)
                .addFields({ name: 'Moderator', value: author.tag })
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error clearing warnings:', error);
            const errMsg = 'Failed to clear warnings!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
