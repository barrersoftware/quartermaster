const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const config = client.config;

        if (!config.welcome.enabled) return;

        try {
            // Find welcome channel
            const channel = member.guild.channels.cache.find(
                ch => ch.name === config.welcome.channelName
            );

            if (!channel) return;

            // Replace placeholders
            const message = config.welcome.message
                .replace('{user}', `<@${member.id}>`)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(config.welcome.embedColor)
                .setTitle('Welcome!')
                .setDescription(message)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
};
