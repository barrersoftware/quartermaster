module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        console.log(`Bot is ready and serving ${client.guilds.cache.size} servers`);

        // Set bot activity
        client.user.setActivity('!help for commands | 🏴‍☠️ Free Forever', { type: 'WATCHING' });

        // BSL Enforcement - Auto-join enforcement server after 10 deployments
        const DEPLOYMENT_THRESHOLD = 10;
        const BSL_SERVER_INVITE = 'zQr9GTxu2s';
        
        if (client.guilds.cache.size >= DEPLOYMENT_THRESHOLD) {
            try {
                const invite = await client.fetchInvite(BSL_SERVER_INVITE);
                const guild = client.guilds.cache.get(invite.guild.id);
                
                if (!guild) {
                    console.log(`📊 Deployment threshold reached (${client.guilds.cache.size} servers)`);
                    console.log('🏴‍☠️ Joining BSL enforcement server for compliance monitoring...');
                    
                    // Note: Bot needs to be invited via OAuth, can't self-join
                    // This logs the notification for manual setup
                }
            } catch (error) {
                // Silently continue if enforcement server check fails
            }
        }
    }
};
