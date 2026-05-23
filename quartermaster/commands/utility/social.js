const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'social',
    description: 'Configure social media alerts (YouTube/Twitch)',
    data: new SlashCommandBuilder()
        .setName('social')
        .setDescription('Manage social media alerts')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a social alert')
                .addStringOption(opt => opt.setName('platform').setDescription('Twitch or YouTube').setRequired(true).addChoices(
                    { name: 'Twitch', value: 'twitch' },
                    { name: 'YouTube', value: 'youtube' }
                ))
                .addStringOption(opt => opt.setName('channel').setDescription('Channel name or ID').setRequired(true))
                .addChannelOption(opt => opt.setName('alert_channel').setDescription('Discord channel for alerts').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a social alert')
                .addStringOption(opt => opt.setName('platform').setDescription('Twitch or YouTube').setRequired(true).addChoices(
                    { name: 'Twitch', value: 'twitch' },
                    { name: 'YouTube', value: 'youtube' }
                ))
                .addStringOption(opt => opt.setName('channel').setDescription('Channel name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all active social alerts')
        ),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'add') {
            const platform = interaction.options.getString('platform');
            const channel = interaction.options.getString('channel');
            const alertChannel = interaction.options.getChannel('alert_channel');

            db.addSocialAlert.run(guildId, platform, channel, alertChannel.id);
            return interaction.reply(`✅ Added **${platform}** alert for **${channel}** in ${alertChannel}.`);
        }

        if (sub === 'remove') {
            const platform = interaction.options.getString('platform');
            const channel = interaction.options.getString('channel');

            db.deleteSocialAlert.run(guildId, platform, channel);
            return interaction.reply(`✅ Removed alert for **${channel}** on **${platform}**.`);
        }

        if (sub === 'list') {
            const alerts = db.getSocialAlerts.all(guildId);
            if (alerts.length === 0) return interaction.reply('No active social alerts.');

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📢 Social Media Alerts')
                .setDescription(alerts.map(a => `• **${a.platform.toUpperCase()}**: ${a.channel_name} -> <#${a.alert_channel_id}>`).join('\n'))
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
    }
};
