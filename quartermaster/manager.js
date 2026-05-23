const db = require('./database');
const { EmbedBuilder } = require('discord.js');

class QuartermasterManager {
    constructor(client) {
        this.client = client;
        this.checkInterval = 60000; // 1 minute
        this.start();
    }

    start() {
        setInterval(() => {
            this.checkGiveaways();
            // this.checkSocialAlerts(); // Would require API keys
        }, this.checkInterval);
    }

    async checkGiveaways() {
        const now = Math.floor(Date.now() / 1000);
        const activeGiveaways = db.getAllActiveGiveaways.all();

        for (const giveaway of activeGiveaways) {
            if (giveaway.end_time <= now) {
                await this.endGiveaway(giveaway);
            }
        }
    }

    async endGiveaway(giveaway) {
        try {
            const channel = await this.client.channels.fetch(giveaway.channel_id);
            const message = await channel.messages.fetch(giveaway.message_id);

            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) return;

            const users = await reaction.users.fetch();
            const entries = users.filter(u => !u.bot).map(u => u.id);

            if (entries.length === 0) {
                await channel.send(`❌ No one entered the giveaway for **${giveaway.prize}**.`);
                db.endGiveaway.run('[]', giveaway.message_id);
                return;
            }

            // Pick winners
            const winners = [];
            for (let i = 0; i < Math.min(giveaway.winner_count, entries.length); i++) {
                const index = Math.floor(Math.random() * entries.length);
                winners.push(entries.splice(index, 1)[0]);
            }

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎁 GIVEAWAY ENDED!')
                .setDescription(`Prize: **${giveaway.prize}**\nWinner(s): ${winnerMentions}`)
                .setTimestamp();

            await message.edit({ embeds: [embed] });
            await channel.send(`🎊 Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!`);
            
            db.endGiveaway.run(JSON.stringify(winners), giveaway.message_id);

        } catch (error) {
            console.error('Error ending giveaway:', error);
        }
    }
}

module.exports = QuartermasterManager;
