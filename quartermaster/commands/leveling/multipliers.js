const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'multipliers',
    description: 'Manage XP multipliers for roles and channels',
    usage: '!multipliers add <role|channel> <id|@mention> <multiplier>\n!multipliers remove <role|channel> <id>\n!multipliers list',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('multipliers')
        .setDescription('Manage XP multipliers for roles and channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add an XP multiplier')
                .addStringOption(opt => opt.setName('type').setDescription('Type of multiplier').setRequired(true).addChoices(
                    { name: 'Role', value: 'role' },
                    { name: 'Channel', value: 'channel' }
                ))
                .addStringOption(opt => opt.setName('id').setDescription('ID or mention of the role/channel').setRequired(true))
                .addNumberOption(opt => opt.setName('value').setDescription('Multiplier value (e.g., 2.0 for double XP)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an XP multiplier')
                .addStringOption(opt => opt.setName('type').setDescription('Type of multiplier').setRequired(true).addChoices(
                    { name: 'Role', value: 'role' },
                    { name: 'Channel', value: 'channel' }
                ))
                .addStringOption(opt => opt.setName('id').setDescription('ID of the role/channel').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all active XP multipliers')
        ),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const guildId = interaction.guild.id;

        if (isInteraction) {
            const sub = interaction.options.getSubcommand();

            if (sub === 'add') {
                const type = interaction.options.getString('type');
                const rawId = interaction.options.getString('id');
                const value = interaction.options.getNumber('value');
                const targetId = rawId.replace(/[<@&#>]/g, '');

                db.addMultiplier.run(guildId, targetId, type, value);
                return interaction.reply(`✅ Added **${value}x** XP multiplier for ${type} <${type === 'role' ? '@&' : '#'}${targetId}>`);
            }

            if (sub === 'remove') {
                const type = interaction.options.getString('type');
                const rawId = interaction.options.getString('id');
                const targetId = rawId.replace(/[<@&#>]/g, '');

                db.deleteMultiplier.run(guildId, targetId, type);
                return interaction.reply(`✅ Removed XP multiplier for ${type} <${type === 'role' ? '@&' : '#'}${targetId}>`);
            }

            if (sub === 'list') {
                const multipliers = db.getMultipliers.all(guildId);
                if (multipliers.length === 0) return interaction.reply('No active XP multipliers.');

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📈 XP Multipliers')
                    .setDescription(multipliers.map(m => `• <${m.type === 'role' ? '@&' : '#'}${m.target_id}>: **${m.multiplier}x**`).join('\n'))
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }
        } else {
            // Prefix implementation (simplified)
            const action = args[0]?.toLowerCase();
            if (action === 'list') {
                const list = db.getMultipliers.all(guildId);
                return interaction.reply(`Multipliers: ${list.length}`);
            }
            interaction.reply('Please use `/multipliers` for full management.');
        }
    }
};
