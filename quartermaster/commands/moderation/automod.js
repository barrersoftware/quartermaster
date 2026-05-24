const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const logger = require('../../logger');

// Spam tracking per user (non-persistent)
const messageTracker = new Map();
const linkRegex = /(https?:\/\/[^\s]+)/gi;
const inviteRegex = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;

module.exports = {
    name: 'automod',
    description: 'Configure auto-moderation settings and word blacklist',
    usage: '!automod <enable|disable> <spam|links|invites|badwords|emoji|caps|mentions>\n!automod blacklist add <word>\n!automod blacklist remove <word>\n!automod blacklist list',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure auto-moderation settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group =>
            group.setName('settings')
                .setDescription('Enable or disable auto-mod features')
                .addSubcommand(sub =>
                    sub.setName('update')
                        .setDescription('Update a specific auto-mod setting')
                        .addStringOption(opt => opt.setName('type').setDescription('The feature to update').setRequired(true).addChoices(
                            { name: 'General Spam', value: 'spam' },
                            { name: 'Links', value: 'links' },
                            { name: 'Invites', value: 'invites' },
                            { name: 'Bad Words', value: 'badwords' },
                            { name: 'Emoji Spam', value: 'emoji' },
                            { name: 'Caps Spam', value: 'caps' },
                            { name: 'Mention Spam', value: 'mention' }
                        ))
                        .addStringOption(opt => opt.setName('action').setDescription('Enable or Disable').setRequired(true).addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        ))
                )
        )
        .addSubcommandGroup(group =>
            group.setName('blacklist')
                .setDescription('Manage the word blacklist')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a word to the blacklist')
                        .addStringOption(opt => opt.setName('word').setDescription('The word to block').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a word from the blacklist')
                        .addStringOption(opt => opt.setName('word').setDescription('The word to unblock').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all blacklisted words')
                )
        ),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || (interaction.type === 2);
        const guildId = interaction.guild.id;

        if (isInteraction) {
            const group = interaction.options.getSubcommandGroup();
            const sub = interaction.options.getSubcommand();

            if (group === 'blacklist') {
                if (sub === 'add') {
                    const word = interaction.options.getString('word').toLowerCase();
                    db.addBlacklistWord.run(guildId, word);
                    return interaction.reply(`✅ Added \`${word}\` to the blacklist.`);
                }
                if (sub === 'remove') {
                    const word = interaction.options.getString('word').toLowerCase();
                    db.removeBlacklistWord.run(guildId, word);
                    return interaction.reply(`✅ Removed \`${word}\` from the blacklist.`);
                }
                if (sub === 'list') {
                    const words = db.getBlacklist.all(guildId);
                    if (words.length === 0) return interaction.reply('The word blacklist is empty.');
                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🚫 Word Blacklist')
                        .setDescription(words.map(w => `\`${w.word}\``).join(', '))
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed] });
                }
            }

            if (group === 'settings' && sub === 'update') {
                const type = interaction.options.getString('type');
                const action = interaction.options.getString('action');
                
                const settings = db.getAutomodSettingsOrDefault(guildId);
                const val = action === 'enable' ? 1 : 0;

                if (type === 'spam') settings.spam_enabled = val;
                if (type === 'links') settings.links_enabled = val;
                if (type === 'invites') settings.invites_enabled = val;
                if (type === 'badwords') settings.badwords_enabled = val;
                if (type === 'emoji') settings.emoji_spam_enabled = val;
                if (type === 'caps') settings.caps_spam_enabled = val;
                if (type === 'mention') settings.mention_spam_enabled = val;

                db.setAutomodSettings.run(
                    guildId,
                    settings.spam_enabled,
                    settings.spam_threshold,
                    settings.links_enabled,
                    settings.invites_enabled,
                    settings.badwords_enabled,
                    settings.emoji_spam_enabled,
                    settings.emoji_threshold,
                    settings.caps_spam_enabled,
                    settings.caps_threshold,
                    settings.mention_spam_enabled,
                    settings.mention_threshold
                );

                const embed = new EmbedBuilder()
                    .setColor(action === 'enable' ? '#00FF00' : '#FF0000')
                    .setTitle(`🛡️ Auto-Moderation ${action === 'enable' ? 'Enabled' : 'Disabled'}`)
                    .setDescription(`${type.charAt(0).toUpperCase() + type.slice(1)} protection has been ${action}d`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }
        } else {
            // Legacy Prefix Logic
            const action = args[0]?.toLowerCase();
            if (!action) return interaction.reply('Usage: !automod <enable|disable> <type>');

            if (action === 'blacklist') {
                const subAction = args[1]?.toLowerCase();
                if (subAction === 'add') {
                    const word = args.slice(2).join(' ').toLowerCase();
                    if (!word) return interaction.reply('Please specify a word.');
                    db.addBlacklistWord.run(guildId, word);
                    return interaction.reply(`✅ Added \`${word}\` to the blacklist.`);
                }
                if (subAction === 'remove') {
                    const word = args.slice(2).join(' ').toLowerCase();
                    if (!word) return interaction.reply('Please specify a word.');
                    db.removeBlacklistWord.run(guildId, word);
                    return interaction.reply(`✅ Removed \`${word}\` from the blacklist.`);
                }
                if (subAction === 'list') {
                    const words = db.getBlacklist.all(guildId);
                    const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🚫 Word Blacklist').setDescription(words.map(w => `\`${w.word}\``).join(', ') || 'Empty');
                    return interaction.channel.send({ embeds: [embed] });
                }
            }

            const type = args[1]?.toLowerCase();
            if (!['enable', 'disable'].includes(action)) return interaction.reply('Action must be enable/disable');
            
            const validTypes = ['spam', 'links', 'invites', 'badwords', 'emoji', 'caps', 'mentions'];
            if (!validTypes.includes(type)) return interaction.reply(`Invalid type. Valid types: ${validTypes.join(', ')}`);

            const settings = db.getAutomodSettingsOrDefault(guildId);
            const val = action === 'enable' ? 1 : 0;
            
            const settingMap = {
                'spam': 'spam_enabled',
                'links': 'links_enabled',
                'invites': 'invites_enabled',
                'badwords': 'badwords_enabled',
                'emoji': 'emoji_spam_enabled',
                'caps': 'caps_spam_enabled',
                'mentions': 'mention_spam_enabled'
            };

            settings[settingMap[type]] = val;

            db.setAutomodSettings.run(
                guildId,
                settings.spam_enabled, settings.spam_threshold,
                settings.links_enabled, settings.invites_enabled, settings.badwords_enabled,
                settings.emoji_spam_enabled, settings.emoji_threshold,
                settings.caps_spam_enabled, settings.caps_threshold,
                settings.mention_spam_enabled, settings.mention_threshold
            );
            interaction.reply(`✅ ${type} ${action}d`);
        }
    },

    async checkMessage(message, client) {
        if (!message.guild || message.author.bot) return false;

        const guildId = message.guild.id;
        const settings = db.getAutomodSettingsOrDefault(guildId);
        
        // 1. Bad Words Check
        if (settings.badwords_enabled) {
            const blacklist = db.getBlacklist.all(guildId);
            const content = message.content.toLowerCase();
            
            for (const item of blacklist) {
                if (content.includes(item.word)) {
                    try {
                        await message.delete();
                        const warnReason = `Auto-mod: Used blacklisted word \`${item.word}\``;
                        db.addWarning.run(message.author.id, guildId, client.user.id, warnReason);
                        await logger.logModeration(message.guild, 'AUTOMOD (WORD)', client.user, message.author, warnReason);
                        const msg = await message.channel.send(`⚠️ ${message.author}, that word is not allowed here!`);
                        setTimeout(() => msg.delete().catch(() => {}), 5000);
                        return true;
                    } catch (e) { console.error(e); }
                }
            }
        }

        // 2. Link Detection
        if (settings.links_enabled && linkRegex.test(message.content)) {
            try {
                await message.delete();
                await logger.logModeration(message.guild, 'AUTOMOD (LINK)', client.user, message.author, 'Posted unauthorized link');
                const msg = await message.channel.send(`⚠️ ${message.author}, links are not allowed!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return true;
            } catch (e) { console.error(e); }
        }

        // 3. Invite Detection
        if (settings.invites_enabled && inviteRegex.test(message.content)) {
            try {
                await message.delete();
                await logger.logModeration(message.guild, 'AUTOMOD (INVITE)', client.user, message.author, 'Posted Discord invite');
                const msg = await message.channel.send(`⚠️ ${message.author}, Discord invites are not allowed!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return true;
            } catch (e) { console.error(e); }
        }

        // 4. Emoji Spam Detection
        if (settings.emoji_spam_enabled) {
            const emojiCount = (message.content.match(/<a?:\w+:\d+>|[\u{1f300}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f1e0}-\u{1f1ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu) || []).length;
            if (emojiCount > settings.emoji_threshold) {
                try {
                    await message.delete();
                    await logger.logModeration(message.guild, 'AUTOMOD (EMOJI)', client.user, message.author, `Emoji spam: ${emojiCount} emojis`);
                    const msg = await message.channel.send(`⚠️ ${message.author}, too many emojis!`);
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                    return true;
                } catch (e) { console.error(e); }
            }
        }

        // 5. Caps Spam Detection
        if (settings.caps_spam_enabled && message.content.length > 10) {
            const caps = message.content.replace(/[^A-Z]/g, '').length;
            const percentage = (caps / message.content.length) * 100;
            if (percentage > settings.caps_threshold) {
                try {
                    await message.delete();
                    await logger.logModeration(message.guild, 'AUTOMOD (CAPS)', client.user, message.author, `Caps spam: ${Math.round(percentage)}% caps`);
                    const msg = await message.channel.send(`⚠️ ${message.author}, please stop shouting (too many caps)!`);
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                    return true;
                } catch (e) { console.error(e); }
            }
        }

        // 6. Mention Spam Detection
        if (settings.mention_spam_enabled) {
            const mentions = message.mentions.users.size + message.mentions.roles.size;
            if (mentions > settings.mention_threshold) {
                try {
                    await message.delete();
                    await logger.logModeration(message.guild, 'AUTOMOD (MENTION)', client.user, message.author, `Mention spam: ${mentions} mentions`);
                    const msg = await message.channel.send(`⚠️ ${message.author}, please don't spam mentions!`);
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                    return true;
                } catch (e) { console.error(e); }
            }
        }

        // 7. General Spam Detection
        if (settings.spam_enabled) {
            const userId = message.author.id;
            const now = Date.now();
            const window = 5000;
            if (!messageTracker.has(userId)) messageTracker.set(userId, []);
            const userMessages = messageTracker.get(userId);
            userMessages.push(now);
            const recentMessages = userMessages.filter(t => now - t < window);
            messageTracker.set(userId, recentMessages);
            if (recentMessages.length >= settings.spam_threshold) {
                try {
                    await message.delete();
                    await message.member.timeout(10 * 60 * 1000, 'Auto-mod: Spam detected');
                    await logger.logModeration(message.guild, 'AUTOMOD (SPAM)', client.user, message.author, 'Spamming messages');
                    await message.channel.send(`🚫 ${message.author} has been muted for 10 minutes for spamming.`);
                    messageTracker.delete(userId);
                    return true;
                } catch (e) { console.error(e); }
            }
        }

        return false;
    }
};
