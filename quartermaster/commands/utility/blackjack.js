const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'blackjack',
    description: 'Play a game of Blackjack and bet your gold!',
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack and bet your gold!')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount of gold to bet').setRequired(true)),
    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
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

        // Deck Setup
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        function createDeck() {
            let deck = [];
            for (const suit of suits) {
                for (const value of values) {
                    deck.push({ suit, value });
                }
            }
            return deck.sort(() => Math.random() - 0.5);
        }

        function getCardValue(card, currentTotal) {
            if (['J', 'Q', 'K'].includes(card.value)) return 10;
            if (card.value === 'A') return currentTotal + 11 > 21 ? 1 : 11;
            return parseInt(card.value);
        }

        function calculateTotal(hand) {
            let total = 0;
            let aces = 0;
            for (const card of hand) {
                if (card.value === 'A') aces++;
                else total += getCardValue(card, 0);
            }
            for (let i = 0; i < aces; i++) {
                if (total + 11 <= 21) total += 11;
                else total += 1;
            }
            return total;
        }

        function formatHand(hand) {
            return hand.map(c => `[${c.value}${c.suit}]`).join(' ');
        }

        let deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        async function createBlackjackEmbed(isFinal = false) {
            const playerTotal = calculateTotal(playerHand);
            const dealerTotal = isFinal ? calculateTotal(dealerHand) : getCardValue(dealerHand[0], 0);

            const embed = new EmbedBuilder()
                .setTitle('🃏 Blackjack')
                .setColor(isFinal ? '#5865F2' : '#2F3136')
                .addFields(
                    { name: `Your Hand (${playerTotal})`, value: formatHand(playerHand), inline: true },
                    { name: `Dealer's Hand (${isFinal ? dealerTotal : '?'})`, value: isFinal ? formatHand(dealerHand) : `[${dealerHand[0].value}${dealerHand[0].suit}] [?]`, inline: true }
                )
                .setFooter({ text: `Bet: ${bet.toLocaleString()} Gold` })
                .setTimestamp();
            
            return embed;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.reply({ 
            embeds: [await createBlackjackEmbed()], 
            components: [row],
            fetchReply: true 
        });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: "This isn't your game!", ephemeral: true });

            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                const total = calculateTotal(playerHand);
                
                if (total > 21) {
                    collector.stop('bust');
                } else if (total === 21) {
                    collector.stop('blackjack');
                } else {
                    await i.update({ embeds: [await createBlackjackEmbed()] });
                }
            } else if (i.customId === 'stand') {
                collector.stop('stand');
            }
        });

        collector.on('end', async (collected, reason) => {
            let finalEmbed = await createBlackjackEmbed(true);
            let pTotal = calculateTotal(playerHand);
            let dTotal = calculateTotal(dealerHand);

            // Dealer logic
            if (reason === 'stand' || reason === 'blackjack') {
                while (dTotal < 17) {
                    dealerHand.push(deck.pop());
                    dTotal = calculateTotal(dealerHand);
                }
                finalEmbed = await createBlackjackEmbed(true);
            }

            let message = '';
            if (pTotal > 21) {
                message = '💀 **Bust!** You lost your bet.';
                finalEmbed.setColor('#FF0000');
            } else if (dTotal > 21) {
                message = `🎉 **Dealer Bust!** You won **${(bet * 2).toLocaleString()}** gold!`;
                db.addGold.run(bet * 2, userId, guildId);
                finalEmbed.setColor('#00FF00');
            } else if (pTotal > dTotal) {
                message = `🎉 **You Win!** You won **${(bet * 2).toLocaleString()}** gold!`;
                db.addGold.run(bet * 2, userId, guildId);
                finalEmbed.setColor('#00FF00');
            } else if (pTotal < dTotal) {
                message = '💀 **Dealer Wins!** You lost your bet.';
                finalEmbed.setColor('#FF0000');
            } else {
                message = '🤝 **Push!** Your bet has been returned.';
                db.addGold.run(bet, userId, guildId);
                finalEmbed.setColor('#FFFF00');
            }

            finalEmbed.setDescription(message);
            await response.edit({ embeds: [finalEmbed], components: [] });
        });
    }
};
