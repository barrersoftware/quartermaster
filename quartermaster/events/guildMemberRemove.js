module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const config = client.config;

        if (!config.leave.enabled) return;

        try {
            // Find leave channel
            const channel = member.guild.channels.cache.find(
                ch => ch.name === config.leave.channelName
            );

            if (!channel) return;

            // Replace placeholders
            const message = config.leave.message
                .replace('{user}', member.user.tag)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);

            await channel.send(message);
        } catch (error) {
            console.error('Error sending leave message:', error);
        }
    }
};
