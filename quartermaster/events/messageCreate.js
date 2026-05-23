const db = require('../database');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Basic Filters
        if (message.author.bot || !message.guild) return;

        // 2. Auto-Moderation (High Priority)
        const automodCommand = client.commands.get('automod');
        if (automodCommand && automodCommand.checkMessage) {
            const blocked = await automodCommand.checkMessage(message, client);
            if (blocked) return;
        }

        const config = client.config;
        const prefix = process.env.PREFIX || '!';

        // 3. Leveling & XP System
        if (config.leveling.enabled) {
            try {
                const userId = message.author.id;
                const guildId = message.guild.id;
                const userData = db.getUserData.get(userId, guildId);
                const now = Date.now();

                if (!userData || now - userData.last_message >= config.leveling.cooldown * 1000) {
                    let xpGain = Math.floor(Math.random() * (config.leveling.xpPerMessage.max - config.leveling.xpPerMessage.min + 1)) + config.leveling.xpPerMessage.min;

                    // Apply Multipliers
                    const multipliers = db.getMultipliers.all(guildId);
                    let totalMultiplier = 1.0;
                    for (const m of multipliers) {
                        if ((m.type === 'channel' && m.target_id === message.channel.id) || 
                            (m.type === 'role' && message.member.roles.cache.has(m.target_id))) {
                            totalMultiplier = Math.max(totalMultiplier, m.multiplier);
                        }
                    }
                    xpGain = Math.floor(xpGain * totalMultiplier);

                    const result = db.addXP(userId, guildId, xpGain);

                    if (result.leveledUp) {
                        const levelUpMsg = config.leveling.levelUpMessage.replace('{user}', `<@${userId}>`).replace('{level}', result.newLevel);
                        await message.channel.send(levelUpMsg);

                        const roleReward = db.getRoleRewardForLevel.get(guildId, result.newLevel);
                        if (roleReward) {
                            const role = message.guild.roles.cache.get(roleReward.role_id);
                            if (role) await message.member.roles.add(role).catch(e => console.error('Role assign error:', e));
                        }
                    }
                }
            } catch (error) { console.error('XP Error:', error); }
        }

        // 4. Advanced Triggers (No prefix required)
        if (!message.content.startsWith(prefix)) {
            try {
                const triggers = db.getTriggers.all(message.guild.id);
                const content = message.content.toLowerCase();

                for (const trigger of triggers) {
                    if (content.includes(trigger.trigger_phrase.toLowerCase())) {
                        if (trigger.type === 'embed') {
                            const { EmbedBuilder } = require('discord.js');
                            const embed = new EmbedBuilder().setColor('#5865F2').setDescription(trigger.response).setTimestamp();
                            await message.reply({ embeds: [embed] });
                        } else {
                            await message.reply(trigger.response);
                        }
                        return;
                    }
                }
            } catch (error) { console.error('Trigger Error:', error); }
        }

        // 5. Prefix Commands & Custom Commands
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (command) {
                if (command.permissions && !message.member.permissions.has(command.permissions)) {
                    return message.reply('You do not have permission to use this command!');
                }
                try {
                    await command.execute(message, args, client);
                } catch (error) {
                    console.error(`Exec error (${commandName}):`, error);
                    await message.reply('There was an error executing that command!');
                }
            } else {
                // Check for custom command if built-in not found
                const customCmd = db.getCustomCommand.get(message.guild.id, commandName);
                if (customCmd) await message.channel.send(customCmd.response);
            }
        }
    }
};
