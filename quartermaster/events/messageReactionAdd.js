const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bot reactions
        if (user.bot) return;

        // Handle partial reactions
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        // Check if this is a reaction role
        if (!client.reactionRoles) return;

        const guildRoles = client.reactionRoles.get(reaction.message.guild.id);
        if (!guildRoles) return;

        const emoji = reaction.emoji.name;
        const key = `${reaction.message.id}-${emoji}`;
        const roleId = guildRoles.get(key);

        if (!roleId) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            const role = reaction.message.guild.roles.cache.get(roleId);

            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                console.log(`Added ${role.name} to ${user.tag}`);
            }
        } catch (error) {
            console.error('Error adding reaction role:', error);
        }

        // Handle Starboard
        try {
            const guildId = reaction.message.guild.id;
            const settings = db.getStarboardSettings.get(guildId);
            if (!settings || !settings.channel_id) return;

            if (reaction.emoji.name === settings.emoji) {
                if (reaction.count >= settings.threshold) {
                    const starboardChannel = reaction.message.guild.channels.cache.get(settings.channel_id);
                    if (!starboardChannel) return;

                    // Check if already in starboard
                    const existing = db.getStarboardMessage.get(reaction.message.id);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setAuthor({ name: reaction.message.author.tag, iconURL: reaction.message.author.displayAvatarURL() })
                        .setDescription(reaction.message.content || '[No Text Content]')
                        .addFields(
                            { name: 'Original', value: `[Jump to Message](${reaction.message.url})`, inline: true },
                            { name: 'Channel', value: `<#${reaction.message.channel.id}>`, inline: true }
                        )
                        .setFooter({ text: `ID: ${reaction.message.id}` })
                        .setTimestamp();

                    if (reaction.message.attachments.size > 0) {
                        embed.setImage(reaction.message.attachments.first().url);
                    }

                    if (existing) {
                        const starMsg = await starboardChannel.messages.fetch(existing.starboard_message_id).catch(() => null);
                        if (starMsg) {
                            await starMsg.edit({ content: `**${reaction.count}** ${settings.emoji}`, embeds: [embed] });
                        }
                    } else {
                        const starMsg = await starboardChannel.send({ content: `**${reaction.count}** ${settings.emoji}`, embeds: [embed] });
                        db.addStarboardMessage.run(guildId, reaction.message.id, starMsg.id);
                    }
                }
            }
        } catch (error) {
            console.error('Starboard Error:', error);
        }
    }
};
