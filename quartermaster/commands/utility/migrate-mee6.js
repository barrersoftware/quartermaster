const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Mee6MigrationService = require('../../mee6Migration');

module.exports = {
    name: 'migrate-mee6',
    description: 'Import leveling data from MEE6 leaderboard',
    data: new SlashCommandBuilder()
        .setName('migrate-mee6')
        .setDescription('Import leveling data from MEE6 leaderboard (Requires Public Leaderboard)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const migrationService = new Mee6MigrationService(client);
        
        try {
            // Check if MEE6 leaderboard is public by attempting a small scrape
            const guildId = interaction.guild.id;
            
            await interaction.editReply('🔍 Validating MEE6 leaderboard access...');
            
            // Start the full migration process
            const count = await migrationService.migrateGuild(guildId, interaction);
            
            if (count === 0) {
                return interaction.followUp({ 
                    content: '❌ Migration failed or found 0 users. Ensure your MEE6 leaderboard is set to **Public** in the MEE6 Dashboard.',
                    ephemeral: true 
                });
            }

        } catch (error) {
            console.error('Migration Command Error:', error);
            await interaction.editReply('❌ A critical error occurred during migration. Check console logs.');
        }
    }
};
