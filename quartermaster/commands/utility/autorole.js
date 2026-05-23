const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'autorole',
    description: 'Set a role to be automatically given to new members when they join',
    usage: '!autorole <@role|off>',
    permissions: PermissionFlagsBits.ManageRoles,
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Set a role to be automatically given to new members when they join')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to give (select nothing to disable)')
                .setRequired(false)),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const guildId = interaction.guild.id;
        const role = isInteraction ? interaction.options.getRole('role') : interaction.mentions.roles.first();
        
        // Handle disabling
        if (!role && !isInteraction && args[0] === 'off') {
            const settings = db.getGuildSettingsOrDefault(guildId);
            db.setGuildSetting.run(
                guildId, 
                settings.welcome_channel, 
                settings.leave_channel, 
                settings.log_channel, 
                settings.mute_role, 
                settings.rank_card_color, 
                null,
                JSON.stringify(settings.mod_roles)
            );
            return interaction.reply('✅ Auto-role has been disabled.');
        }

        const settings = db.getGuildSettingsOrDefault(guildId);
        const roleId = role ? role.id : null;

        db.setGuildSetting.run(
            guildId, 
            settings.welcome_channel, 
            settings.leave_channel, 
            settings.log_channel, 
            settings.mute_role, 
            settings.rank_card_color, 
            roleId,
            JSON.stringify(settings.mod_roles)
        );

        if (roleId) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Auto-Role Updated')
                .setDescription(`New members will now automatically receive the ${role} role when they join.`)
                .setTimestamp();
            
            return isInteraction ? interaction.reply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
        } else {
            return isInteraction ? interaction.reply('✅ Auto-role has been disabled.') : interaction.reply('✅ Auto-role has been disabled.');
        }
    }
};
