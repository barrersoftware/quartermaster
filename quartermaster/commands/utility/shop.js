const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'shop',
    description: 'Visit the server shop and spend your Pirate Gold',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Visit the server shop and spend your Pirate Gold'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const items = db.getShopItems.all(guildId);

        if (items.length === 0) {
            return interaction.reply({ content: '🪙 The Ship\'s Store is currently empty. Check back later!', ephemeral: true });
        }

        const data = db.getUserData.get(interaction.user.id, guildId);
        const balance = data ? data.gold : 0;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏴‍☠️ The Ship\'s Store')
            .setDescription(`Welcome, <@${interaction.user.id}>! You have **💰 ${balance.toLocaleString()}** Gold to spend.\n\nUse the menu below to purchase items.`)
            .addFields(
                items.map(item => ({
                    name: `${item.name} — 💰 ${item.price.toLocaleString()}`,
                    value: item.description || 'No description',
                    inline: false
                }))
            )
            .setFooter({ text: 'All sales are final!' })
            .setTimestamp();

        const select = new StringSelectMenuBuilder()
            .setCustomId('buy-item')
            .setPlaceholder('Select an item to buy...')
            .addOptions(
                items.map(item => ({
                    label: item.name,
                    description: `${item.price} Gold`,
                    value: item.id.toString()
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true 
        });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This menu is not for you!', ephemeral: true });
            }

            const itemId = parseInt(i.values[0]);
            const item = items.find(it => it.id === itemId);

            // Re-check balance
            const currentData = db.getUserData.get(i.user.id, guildId);
            const currentBalance = currentData ? currentData.gold : 0;

            if (currentBalance < item.price) {
                return i.reply({ content: `❌ You don't have enough gold! You need **${item.price - currentBalance}** more.`, ephemeral: true });
            }

            try {
                // Deduct gold
                db.addGold.run(-item.price, i.user.id, guildId);

                // Handle Role Reward
                if (item.role_id) {
                    const role = i.guild.roles.cache.get(item.role_id);
                    if (role) {
                        await i.member.roles.add(role);
                    }
                }

                await i.reply({ 
                    content: `🎉 **Purchase Successful!** You bought **${item.name}** for **${item.price}** Gold.`,
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Shop error:', error);
                await i.reply({ content: '❌ An error occurred during purchase.', ephemeral: true });
            }
        });
    }
};
