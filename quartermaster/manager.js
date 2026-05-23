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
            this.rewardVoiceActivity();
        }, this.checkInterval);
    }

    async rewardVoiceActivity() {
        try {
            const guilds = this.client.guilds.cache;
            for (const [guildId, guild] of guilds) {
                const config = this.client.config;
                if (!config.leveling.enabled) continue;

                // Award 10-20 XP per minute in voice
                const xpPerMinute = 15;
                const goldPerMinute = 2;

                const voiceStates = guild.voiceStates.cache;
                for (const [userId, state] of voiceStates) {
                    // Ignore bots, AFK, and muted users (encourages active participation)
                    if (state.member.user.bot) continue;
                    if (state.channelId && !state.selfDeaf && !state.deaf) {
                        
                        // Add XP
                        const result = db.addXP(userId, guildId, xpPerMinute);
                        
                        // Add Gold
                        db.addGold.run(goldPerMinute, userId, guildId);

                        if (result.leveledUp) {
                            const levelUpMsg = config.leveling.levelUpMessage
                                .replace('{user}', `<@${userId}>`)
                                .replace('{level}', result.newLevel);
                            
                            const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0);
                            if (channel) await channel.send(`🎙️ **Voice Active:** ${levelUpMsg}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Voice XP Error:', error);
        }
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
