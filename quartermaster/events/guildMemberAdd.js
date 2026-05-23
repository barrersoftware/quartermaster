const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database');
const { createWelcomeCard } = require('../welcomeCard');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const config = client.config;
        const guildId = member.guild.id;

        try {
            // Get channel from database
            const settings = db.getGuildSettings.get(guildId);
            let channel;
            
            if (settings && settings.welcome_channel) {
                channel = member.guild.channels.cache.get(settings.welcome_channel) || 
                          member.guild.channels.cache.find(ch => ch.name === settings.welcome_channel);
            } else if (config.welcome.enabled) {
                channel = member.guild.channels.cache.find(ch => ch.name === config.welcome.channelName);
            }

            if (!channel) return;

            // Handle Auto-Role
            if (settings && settings.auto_role) {
                const autoRole = member.guild.roles.cache.get(settings.auto_role);
                if (autoRole) {
                    try {
                        await member.roles.add(autoRole);
                        console.log(`Auto-role assigned: ${autoRole.name} to ${member.user.tag}`);
                    } catch (roleError) {
                        console.error('Error assigning auto-role:', roleError);
                    }
                }
            }

            // Generate Welcome Card
            const buffer = await createWelcomeCard({
                username: member.user.username,
                serverName: member.guild.name,
                memberCount: member.guild.memberCount,
                avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 512 })
            });

            const attachment = new AttachmentBuilder(buffer, { name: `welcome-${member.id}.png` });

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(config.welcome.embedColor || '#5865F2')
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(config.welcome.message.replace('{user}', `<@${member.id}>`).replace('{server}', member.guild.name))
                .setImage(`attachment://welcome-${member.id}.png`)
                .setTimestamp();

            await channel.send({ content: `👋 Welcome <@${member.id}>!`, embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
};
