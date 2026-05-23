const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'starboard',
    description: 'Configure the Starboard (Wall of Fame)',
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Configure the Starboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel where starred posts go').setRequired(true))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Number of stars required').setRequired(false))
        .addStringOption(opt => opt.setName('emoji').setDescription('Custom emoji to use (default: ⭐)').setRequired(false)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const channel = interaction.options.getChannel('channel');
        const threshold = interaction.options.getInteger('threshold') || 3;
        const emoji = interaction.options.getString('emoji') || '⭐';

        db.setStarboardSettings.run(guildId, channel.id, emoji, threshold);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Starboard Configured')
            .setDescription(`Channel: ${channel}\nThreshold: **${threshold} reactions**\nEmoji: ${emoji}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
