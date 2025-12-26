const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'raidlogs',
    aliases: ['raidhistory', 'raidincidents'],
    description: 'View recent raid detection incidents',
    usage: '!raidlogs [limit]',
    permissions: PermissionFlagsBits.ModerateMembers,
    async execute(message, args) {
        const guildId = message.guild.id;
        const limit = parseInt(args[0]) || 10;
        const maxLimit = Math.min(limit, 25);

        const incidents = db.getRaidIncidents.all(guildId, maxLimit);

        if (!incidents || incidents.length === 0) {
            return message.reply('No raid incidents detected yet.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6600')
            .setTitle('🚨 Raid Detection History')
            .setDescription(`Showing last ${incidents.length} raid incidents`)
            .setTimestamp();

        for (const incident of incidents) {
            const date = new Date(incident.detected_at * 1000);
            const usersAffected = JSON.parse(incident.users_affected || '[]');

            embed.addFields({
                name: `Incident #${incident.id} - ${date.toLocaleString()}`,
                value: `**Users Joined:** ${incident.user_count}\n**Action Taken:** ${incident.action_taken.toUpperCase()}\n**Users Affected:** ${usersAffected.length}\n**Status:** ${incident.resolved ? '✅ Resolved' : '⚠️ Active'}`,
                inline: false
            });
        }

        await message.channel.send({ embeds: [embed] });
    }
};
