const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

// Spam tracking per user
const messageTracker = new Map();
const linkRegex = /(https?:\/\/[^\s]+)/gi;
const inviteRegex = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;

module.exports = {
    name: 'automod',
    description: 'Configure auto-moderation settings',
    usage: '!automod <enable|disable> <spam|links|invites> [threshold]',
    permissions: PermissionFlagsBits.ManageGuild,
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need the Manage Server permission to use this command.');
        }

        if (args.length < 2) {
            return message.reply('Usage: `!automod <enable|disable> <spam|links|invites>`\nExample: `!automod enable spam 5`');
        }

        const action = args[0].toLowerCase();
        const type = args[1].toLowerCase();
        
        if (!['enable', 'disable'].includes(action)) {
            return message.reply('❌ Action must be either `enable` or `disable`');
        }

        if (!['spam', 'links', 'invites'].includes(type)) {
            return message.reply('❌ Type must be one of: `spam`, `links`, `invites`');
        }

        const guildId = message.guild.id;
        
        // Store in guild settings (you'd want to add this to database properly)
        if (!message.client.automodSettings) {
            message.client.automodSettings = new Map();
        }
        
        if (!message.client.automodSettings.has(guildId)) {
            message.client.automodSettings.set(guildId, {
                spam: { enabled: false, threshold: 5, window: 5000 },
                links: { enabled: false },
                invites: { enabled: false }
            });
        }

        const settings = message.client.automodSettings.get(guildId);
        
        if (type === 'spam') {
            const threshold = parseInt(args[2]) || 5;
            settings.spam.enabled = action === 'enable';
            settings.spam.threshold = threshold;
        } else {
            settings[type].enabled = action === 'enable';
        }

        const embed = new EmbedBuilder()
            .setColor(action === 'enable' ? '#00FF00' : '#FF0000')
            .setTitle(`🛡️ Auto-Moderation ${action === 'enable' ? 'Enabled' : 'Disabled'}`)
            .setDescription(`${type.charAt(0).toUpperCase() + type.slice(1)} protection has been ${action}d`)
            .setTimestamp();

        if (type === 'spam' && action === 'enable') {
            embed.addFields({ name: 'Threshold', value: `${settings.spam.threshold} messages in ${settings.spam.window / 1000} seconds`, inline: false });
        }

        await message.channel.send({ embeds: [embed] });
    },

    // This function is called by messageCreate event
    async checkMessage(message, client) {
        if (!client.automodSettings) return;
        
        const guildId = message.guild.id;
        const settings = client.automodSettings.get(guildId);
        
        if (!settings) return;

        const userId = message.author.id;
        const now = Date.now();

        // Spam detection
        if (settings.spam.enabled) {
            if (!messageTracker.has(userId)) {
                messageTracker.set(userId, []);
            }

            const userMessages = messageTracker.get(userId);
            userMessages.push(now);

            // Remove old messages outside the time window
            const recentMessages = userMessages.filter(timestamp => now - timestamp < settings.spam.window);
            messageTracker.set(userId, recentMessages);

            if (recentMessages.length >= settings.spam.threshold) {
                try {
                    await message.delete();
                    await message.member.timeout(5 * 60 * 1000, 'Auto-mod: Spam detected');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🛡️ Auto-Mod: Spam Detected')
                        .setDescription(`${message.author} has been muted for 5 minutes for spamming`)
                        .setTimestamp();
                    
                    await message.channel.send({ embeds: [embed] });
                    
                    messageTracker.delete(userId);
                } catch (error) {
                    console.error('Error handling spam:', error);
                }
                return true;
            }
        }

        // Link detection
        if (settings.links.enabled && linkRegex.test(message.content)) {
            try {
                await message.delete();
                await message.author.send('Links are not allowed in this server.').catch(() => {});
                
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('🛡️ Auto-Mod: Link Blocked')
                    .setDescription(`Removed a link from ${message.author}`)
                    .setTimestamp();
                
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Error handling link:', error);
            }
            return true;
        }

        // Invite detection
        if (settings.invites.enabled && inviteRegex.test(message.content)) {
            try {
                await message.delete();
                await message.author.send('Discord invites are not allowed in this server.').catch(() => {});
                
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('🛡️ Auto-Mod: Invite Blocked')
                    .setDescription(`Removed a Discord invite from ${message.author}`)
                    .setTimestamp();
                
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Error handling invite:', error);
            }
            return true;
        }

        return false;
    }
};
