const db = require('./database');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

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
            this.checkSocialAlerts();
        }, this.checkInterval);
    }

    async checkSocialAlerts() {
        const alerts = db.getAllSocialAlerts.all();
        if (alerts.length === 0) return;

        for (const alert of alerts) {
            try {
                if (alert.platform === 'twitch') {
                    await this.pollTwitch(alert);
                } else if (alert.platform === 'youtube') {
                    await this.pollYouTube(alert);
                }
            } catch (error) {
                console.error(`Social Poll Error (${alert.platform}/${alert.channel_name}):`, error.message);
            }
        }
    }

    async pollTwitch(alert) {
        const clientId = process.env.TWITCH_CLIENT_ID;
        const accessToken = process.env.TWITCH_ACCESS_TOKEN;

        if (!clientId || !accessToken) return;

        const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${alert.channel_name}`, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const stream = response.data.data[0];
        if (stream && stream.id !== alert.last_notified_id) {
            const channel = await this.client.channels.fetch(alert.alert_channel_id).catch(() => null);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#6441A5')
                    .setTitle(`🎮 ${stream.user_name} is now LIVE on Twitch!`)
                    .setURL(`https://twitch.tv/${stream.user_login}`)
                    .setDescription(`**Playing:** ${stream.game_name}\n**Title:** ${stream.title}`)
                    .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
                    .setTimestamp();

                await channel.send({ content: `📢 **${stream.user_name}** just went live!`, embeds: [embed] });
                db.updateLastNotified.run(stream.id, alert.id);
            }
        }
    }

    async pollYouTube(alert) {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) return;

        // Note: channel_name here is expected to be the Channel ID for reliability
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${alert.channel_name}&maxResults=1&order=date&type=video&key=${apiKey}`);

        const video = response.data.items[0];
        if (video && video.id.videoId !== alert.last_notified_id) {
            const channel = await this.client.channels.fetch(alert.alert_channel_id).catch(() => null);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`🎥 New Video: ${video.snippet.title}`)
                    .setURL(`https://www.youtube.com/watch?v=${video.id.videoId}`)
                    .setDescription(video.snippet.description.substring(0, 200) + '...')
                    .setImage(video.snippet.thumbnails.high.url)
                    .setTimestamp();

                await channel.send({ content: `📢 **${video.snippet.channelTitle}** just posted a new video!`, embeds: [embed] });
                db.updateLastNotified.run(video.id.videoId, alert.id);
            }
        }
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
                            
                            const settings = db.getGuildSettingsOrDefault(guildId);
                            const targetChannel = settings.level_up_channel 
                                ? (guild.channels.cache.get(settings.level_up_channel) || guild.systemChannel || guild.channels.cache.find(c => c.type === 0))
                                : (guild.systemChannel || guild.channels.cache.find(c => c.type === 0));

                            if (targetChannel) await targetChannel.send(`🎙️ **Voice Active:** ${levelUpMsg}`);
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
