const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'balance',
    description: 'Check your current Pirate Gold balance',
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current Pirate Gold balance')
        .addUserOption(opt => opt.setName('target').setDescription('User to check balance for').setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;

        const data = db.getUserData.get(target.id, guildId);
        const gold = data ? data.gold : 0;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
            .setTitle('💰 Ship\'s Ledger')
            .setDescription(`${target.id === interaction.user.id ? 'You have' : `${target.username} has`} **${gold.toLocaleString()}** Pirate Gold.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
