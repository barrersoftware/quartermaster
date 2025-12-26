const db = require('../database');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Ignore DMs
        if (!message.guild) return;

        // Check auto-moderation first
        const automodCommand = client.commands.get('automod');
        if (automodCommand && automodCommand.checkMessage) {
            const blocked = await automodCommand.checkMessage(message, client);
            if (blocked) return; // Message was blocked by auto-mod
        }

        const config = client.config;
        const prefix = process.env.PREFIX || '!';

        // Handle XP gain
        if (config.leveling.enabled) {
            try {
                const userId = message.author.id;
                const guildId = message.guild.id;

                // Get user data
                const userData = db.getUserData.get(userId, guildId);

                // Check cooldown
                const now = Date.now();
                if (!userData || now - userData.last_message >= config.leveling.cooldown * 1000) {
                    // Random XP between min and max
                    const xpGain = Math.floor(
                        Math.random() * (config.leveling.xpPerMessage.max - config.leveling.xpPerMessage.min + 1)
                    ) + config.leveling.xpPerMessage.min;

                    const result = db.addXP(userId, guildId, xpGain);

                    // Handle level up
                    if (result.leveledUp) {
                        const levelUpMsg = config.leveling.levelUpMessage
                            .replace('{user}', `<@${userId}>`)
                            .replace('{level}', result.newLevel);

                        await message.channel.send(levelUpMsg);

                        // Check for role rewards from database
                        const roleReward = db.getRoleRewardForLevel.get(guildId, result.newLevel);
                        if (roleReward) {
                            const role = message.guild.roles.cache.get(roleReward.role_id);
                            if (role) {
                                try {
                                    await message.member.roles.add(role);
                                    await message.channel.send(`🎉 <@${userId}> earned the ${role} role for reaching level ${result.newLevel}!`);
                                } catch (error) {
                                    console.error('Error assigning role reward:', error);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling XP:', error);
            }
        }

        // Handle commands
        if (!message.content.startsWith(prefix)) {
            // Check for custom commands
            const customCommand = message.content.toLowerCase();
            if (customCommand.startsWith(prefix)) {
                const commandName = customCommand.slice(prefix.length).split(' ')[0];
                const cmd = db.getCustomCommand.get(message.guild.id, commandName);

                if (cmd) {
                    await message.channel.send(cmd.response);
                }
            }
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Try to find command
        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) {
            // Check for custom command
            const customCmd = db.getCustomCommand.get(message.guild.id, commandName);
            if (customCmd) {
                await message.channel.send(customCmd.response);
            }
            return;
        }

        // Check permissions
        if (command.permissions) {
            if (!message.member.permissions.has(command.permissions)) {
                return message.reply('You do not have permission to use this command!');
            }
        }

        // Execute command
        try {
            await command.execute(message, args, client);
        } catch (error) {
            console.error(`Error executing ${commandName}:`, error);
            await message.reply('There was an error executing that command!');
        }
    }
};
