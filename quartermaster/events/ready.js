module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        console.log(`Bot is ready and serving ${client.guilds.cache.size} servers`);

        // Set bot activity
        client.user.setActivity('!help for commands | MIT License', { type: 'WATCHING' });
    }
};
