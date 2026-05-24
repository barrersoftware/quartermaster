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

                // Use ON CONFLICT to update XP/Level without wiping out gold or daily status
                const transaction = db.prepare(`
                    INSERT INTO users (user_id, guild_id, xp, level, last_message) 
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(user_id, guild_id) DO UPDATE SET 
                        xp = MAX(users.xp, EXCLUDED.xp),
                        level = MAX(users.level, EXCLUDED.level)
                `);
                
                const insertMany = db.transaction((users) => {
                    for (const user of users) {
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
                
                if (interaction) {
                    if (error.response && error.response.status === 403) {
                        await interaction.editReply(`❌ **Migration Failed: Private Leaderboard**\nYour friend's MEE6 leaderboard is set to **Private**. They must set it to **Public** in the MEE6 dashboard for Quartermaster to access the data.`);
                    } else if (error.response && error.response.status === 404) {
                        await interaction.editReply(`❌ **Migration Failed: Not Found**\nMEE6 could not find this server. Ensure the Guild ID is correct.`);
                    } else {
                        await interaction.editReply(`⚠️ **Error during migration at page ${currentPage}:** ${error.message}`);
                    }
                }
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
