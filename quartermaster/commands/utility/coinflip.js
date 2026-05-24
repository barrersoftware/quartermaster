const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'coinflip',
    description: 'Bet your gold on a coin flip!',
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Bet your gold on a coin flip!')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount of gold to bet').setRequired(true))
        .addStringOption(opt => opt.setName('side').setDescription('Heads or Tails').setRequired(true).addChoices(
            { name: 'Heads', value: 'heads' },
            { name: 'Tails', value: 'tails' }
        )),
    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const side = interaction.options.getString('side');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (bet <= 0) return interaction.reply({ content: '❌ You must bet a positive amount of gold!', ephemeral: true });

        const userData = db.getUserData.get(userId, guildId);
        const balance = userData ? userData.gold : 0;

        if (balance < bet) {
            return interaction.reply({ content: `❌ You don't have enough gold! You only have **${balance.toLocaleString()}**.`, ephemeral: true });
        }

        // Deduct bet first
        db.addGold.run(-bet, userId, guildId);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === side;

        const embed = new EmbedBuilder()
            .setTitle('🪙 Coinflip')
            .setThumbnail(result === 'heads' ? 'https://i.imgur.com/vH9Z9Y3.png' : 'https://i.imgur.com/mOAtjXG.png')
            .setTimestamp();

        if (won) {
            const winnings = bet * 2;
            db.addGold.run(winnings, userId, guildId);
            embed.setColor('#00FF00')
                .setDescription(`The coin landed on **${result.toUpperCase()}**!\n\n🎉 Congratulations! You won **${winnings.toLocaleString()}** gold!`)
                .setFooter({ text: `New Balance: ${(balance + bet).toLocaleString()}` });
        } else {
            embed.setColor('#FF0000')
                .setDescription(`The coin landed on **${result.toUpperCase()}**!\n\n💀 Tough luck! You lost your bet of **${bet.toLocaleString()}** gold.`)
                .setFooter({ text: `New Balance: ${(balance - bet).toLocaleString()}` });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
