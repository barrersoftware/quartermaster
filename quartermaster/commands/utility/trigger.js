const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'trigger',
    description: 'Manage automated text or embed responses',
    usage: '!trigger add <phrase> <response>\n!trigger remove <phrase>\n!trigger list',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('trigger')
        .setDescription('Manage automated responses')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new trigger')
                .addStringOption(opt => opt.setName('phrase').setDescription('The phrase that triggers the bot').setRequired(true))
                .addStringOption(opt => opt.setName('response').setDescription('What the bot should say').setRequired(true))
                .addStringOption(opt => opt.setName('type').setDescription('Response type').setRequired(false).addChoices(
                    { name: 'Plain Text', value: 'text' },
                    { name: 'Rich Embed', value: 'embed' }
                ))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a trigger')
                .addStringOption(opt => opt.setName('phrase').setDescription('The phrase to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all active triggers')
        ),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const guildId = interaction.guild.id;

        if (isInteraction) {
            const sub = interaction.options.getSubcommand();

            if (sub === 'add') {
                const phrase = interaction.options.getString('phrase').toLowerCase();
                const response = interaction.options.getString('response');
                const type = interaction.options.getString('type') || 'text';

                try {
                    db.addTrigger.run(guildId, phrase, response, type, interaction.user.id);
                    return interaction.reply(`✅ Trigger added! When someone says \`${phrase}\`, I will respond with a ${type}.`);
                } catch (error) {
                    return interaction.reply({ content: '❌ Failed to add trigger. (Maybe it already exists?)', ephemeral: true });
                }
            }

            if (sub === 'remove') {
                const phrase = interaction.options.getString('phrase').toLowerCase();
                db.deleteTrigger.run(guildId, phrase);
                return interaction.reply(`✅ Removed trigger for \`${phrase}\`.`);
            }

            if (sub === 'list') {
                const triggers = db.getTriggers.all(guildId);
                if (triggers.length === 0) return interaction.reply('No active triggers.');

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🤖 Automated Triggers')
                    .setDescription(triggers.map(t => `• **${t.trigger_phrase}** (${t.type})`).join('\n'))
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }
        } else {
            // Prefix fallback
            interaction.reply('Please use `/trigger` to manage automated responses.');
        }
    }
};
