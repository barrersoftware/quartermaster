const { EmbedBuilder } = require('discord.js');
const db = require('./database');

async function sendLog(guild, embed, type, userId, content) {
    try {
        // Save to database
        db.addAuditLog.run(guild.id, type, userId || null, content || null);

        const settings = db.getGuildSettingsOrDefault(guild.id);
        if (!settings || !settings.log_channel) return;

        const logChannel = guild.channels.cache.get(settings.log_channel) || guild.channels.cache.find(ch => ch.name === settings.log_channel);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

module.exports = {
    logModeration: async (guild, action, moderator, target, reason) => {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Mod Log: ${action}`)
            .addFields(
                { name: 'Target', value: `${target.tag} (${target.id})`, inline: false },
                { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                { name: 'Reason', value: reason || 'No reason provided', inline: true }
            )
            .setTimestamp();
        
        await sendLog(guild, embed, `MOD_${action}`, target.id, reason);
    },

    logMessageDelete: async (message) => {
        if (!message.guild || message.author.bot) return;

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Message Deleted')
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(`**Content:**\n${message.content || '[No Text Content]'}`)
            .addFields(
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Author ID', value: message.author.id, inline: true }
            )
            .setTimestamp();
        
        await sendLog(message.guild, embed, 'MSG_DELETE', message.author.id, message.content);
    },

    logMessageUpdate: async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Message Edited')
            .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
            .addFields(
                { name: 'Before', value: oldMessage.content || '[No Text Content]', inline: false },
                { name: 'After', value: newMessage.content || '[No Text Content]', inline: false },
                { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true }
            )
            .setTimestamp();
        
        await sendLog(oldMessage.guild, embed, 'MSG_UPDATE', oldMessage.author.id, `BEFORE: ${oldMessage.content}\nAFTER: ${newMessage.content}`);
    },

    logGuildMemberUpdate: async (oldMember, newMember) => {
        const guild = oldMember.guild;
        const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTimestamp();

        // Nickname change
        if (oldMember.nickname !== newMember.nickname) {
            embed.setColor('#7289DA')
                .setTitle('Nickname Changed')
                .addFields(
                    { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                    { name: 'After', value: newMember.nickname || 'None', inline: true }
                );
            await sendLog(guild, embed);
        }

        // Role change
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size !== newRoles.size) {
            const added = newRoles.filter(r => !oldRoles.has(r.id));
            const removed = oldRoles.filter(r => !newRoles.has(r.id));

            if (added.size > 0 || removed.size > 0) {
                embed.setColor('#EB459E')
                    .setTitle('Roles Updated');
                
                if (added.size > 0) {
                    embed.addFields({ name: 'Added', value: added.map(r => `<@&${r.id}>`).join(', '), inline: false });
                }
                if (removed.size > 0) {
                    embed.addFields({ name: 'Removed', value: removed.map(r => `<@&${r.id}>`).join(', '), inline: false });
                }
                await sendLog(guild, embed);
            }
        }
    }
};
