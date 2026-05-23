const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'addrole',
    description: 'Add a role reward for a specific level',
    usage: '!addrole <level> <@role>',
    permissions: PermissionFlagsBits.ManageRoles,
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add a role reward for a specific level')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level requirement').setRequired(true).setMinValue(1))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to award').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const level = isInteraction ? interaction.options.getInteger('level') : parseInt(args[0]);
        const role = isInteraction ? interaction.options.getRole('role') : interaction.mentions.roles.first();

        if (!level || !role) {
            const msg = 'Usage: `!addrole <level> <@role>`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const guildId = interaction.guild.id;

        try {
            db.addRoleReward.run(guildId, level, role.id);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Role Reward Added')
                .setDescription(`Members will now receive ${role} upon reaching **Level ${level}**.`)
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error adding role reward:', error);
            const errMsg = 'Failed to add role reward!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
