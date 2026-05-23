const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'removerole',
    description: 'Remove a role reward for a specific level',
    usage: '!removerole <level>',
    permissions: PermissionFlagsBits.ManageRoles,
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Remove a role reward for a specific level')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level requirement to remove').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const level = isInteraction ? interaction.options.getInteger('level') : parseInt(args[0]);

        if (!level) {
            const msg = 'Usage: `!removerole <level>`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const guildId = interaction.guild.id;

        try {
            db.deleteRoleReward.run(guildId, level);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Role Reward Removed')
                .setDescription(`The role reward for **Level ${level}** has been removed.`)
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error removing role reward:', error);
            const errMsg = 'Failed to remove role reward!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
