const axios = require('axios');
const db = require('./database');

class Mee6MigrationService {
    constructor(client) {
        this.client = client;
        this.baseUrl = "https://mee6.xyz/api/plugins/levels/leaderboard/";
        this.userAgent = "QuartermasterMigrationEngine/2.0 (Node.js)";
    }

    /**
     * MEE6 Cubic Progression Formula
     * Maps exactly to MEE6's level scaling.
     */
    calculateMee6XPForLevel(level) {
        if (level === 0) return 0;
        const x = level;
        return 100 * x + 25 * x * (x - 1) + (5 * (x - 1) * x * (2 * x - 1)) / 6;
    }

    /**
     * Scrapes the entire public leaderboard for a guild.
     */
    async migrateGuild(guildId, interaction = null) {
        console.log(`[MIGRATION] Starting import for Guild ID: ${guildId}`);
        let currentPage = 0;
        let totalImported = 0;
        let isProcessing = true;

        if (interaction) await interaction.editReply(`📡 Starting migration from MEE6... Found 0 users so far.`);

        while (isProcessing) {
            try {
                const requestUrl = `${this.baseUrl}${guildId}?page=${currentPage}&limit=1000`;
                const response = await axios.get(requestUrl, {
                    headers: { 'User-Agent': this.userAgent }
                });

                const players = response.data.players;

                if (!players || players.length === 0) {
                    isProcessing = false;
                    break;
                }

                // Batch database transaction for performance
                const transaction = db.prepare('INSERT OR REPLACE INTO users (user_id, guild_id, xp, level, last_message) VALUES (?, ?, ?, ?, ?)');
                
                const insertMany = db.transaction((users) => {
                    for (const user of users) {
                        // detailed_xp[2] is lifetime total XP
                        const xp = user.detailed_xp[2];
                        const level = user.level;
                        transaction.run(user.id, guildId, xp, level, 0);
                    }
                });

                insertMany(players);
                totalImported += players.length;
                console.log(`[MIGRATION] Imported page ${currentPage} (${players.length} users). Total: ${totalImported}`);

                if (interaction) await interaction.editReply(`📡 Migrating from MEE6... Imported **${totalImported}** users so far.`);

                currentPage++;
                
                // Rate limit protection
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`[MIGRATION] Error at page ${currentPage}:`, error.message);
                if (interaction) await interaction.followUp({ content: `⚠️ Error during migration at page ${currentPage}. Process stopped.`, ephemeral: true });
                isProcessing = false;
            }
        }

        console.log(`[MIGRATION] Completed! Total users imported: ${totalImported}`);
        if (interaction) await interaction.editReply(`✅ **Migration Complete!** Successfully liberated **${totalImported}** users from MEE6.`);
        
        return totalImported;
    }

    /**
     * Shadow-Sync: Hydrates a single user on demand if they aren't in our DB.
     */
    async hydrateUser(guildId, userId) {
        try {
            const requestUrl = `${this.baseUrl}${guildId}?limit=1000&id=${userId}`; // Some undocumented behavior allows ID filtering
            const response = await axios.get(requestUrl, {
                headers: { 'User-Agent': this.userAgent }
            });

            const player = response.data.players.find(p => p.id === userId);
            if (player) {
                const xp = player.detailed_xp[2];
                const level = player.level;
                db.prepare('INSERT OR REPLACE INTO users (user_id, guild_id, xp, level, last_message) VALUES (?, ?, ?, ?, ?)')
                  .run(userId, guildId, xp, level, Date.now());
                console.log(`[SHADOW-SYNC] Hydrated user ${userId} from MEE6 legacy data.`);
                return true;
            }
        } catch (e) {
            // Silently fail if MEE6 is unreachable or leaderboard is private
        }
        return false;
    }
}

module.exports = Mee6MigrationService;
