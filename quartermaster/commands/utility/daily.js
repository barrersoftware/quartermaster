const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'daily',
    description: 'Claim your daily allowance of Pirate Gold',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily allowance of Pirate Gold'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const dailyAmount = 250;
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        const data = db.getUserData.get(userId, guildId);
        const lastDaily = data ? data.last_daily : 0;
        const now = Date.now();

        if (now - lastDaily < cooldown) {
            const timeLeft = cooldown - (now - lastDaily);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return interaction.reply({ 
                content: `⏳ You've already claimed your daily rations! Come back in **${hours}h ${minutes}m**.`, 
                ephemeral: true 
            });
        }

        db.addGold.run(dailyAmount, userId, guildId);
        db.updateLastDaily.run(now, userId, guildId);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Rations Claimed!')
            .setDescription(`You received **${dailyAmount}** Pirate Gold.`)
            .setFooter({ text: 'Come back tomorrow for more!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
