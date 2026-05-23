const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'server-summary',
    description: 'Get a beautiful summary of your server stats and active protections',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('server-summary')
        .setDescription('Get a beautiful summary of your server stats and active protections')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        const guildId = guild.id;

        // Fetch all data
        const automod = db.getAutomodSettingsOrDefault(guildId);
        const raid = db.getRaidSettingsOrDefault(guildId);
        const multipliers = db.getMultipliers.all(guildId);
        const rewards = db.getRoleRewards.all(guildId);
        const allUsers = db.getLeaderboard.all(guildId, 999999);

        const activeProtections = [];
        if (automod.spam_enabled) activeProtections.push('🛡️ Spam Detection');
        if (automod.links_enabled) activeProtections.push('🔗 Link Filtering');
        if (automod.invites_enabled) activeProtections.push('🚫 Invite Blocking');
        if (automod.badwords_enabled) activeProtections.push('🙊 Bad Words Filter');
        if (raid.enabled) activeProtections.push('🚨 Raid Protection');

        const totalXP = allUsers.reduce((sum, u) => sum + u.xp, 0);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Server Summary: ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '📈 Total XP', value: `${totalXP.toLocaleString()}`, inline: true },
                { name: '🏆 Active Chatters', value: `${allUsers.length}`, inline: true },
                { name: '🛡️ Active Protections', value: activeProtections.length > 0 ? activeProtections.join('\n') : 'No protections active', inline: false },
                { name: '💎 Leveling Info', value: `Multipliers: ${multipliers.length}\nRewards: ${rewards.length}`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Quartermaster Pro • MEE6 Alternative' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
