const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'setup-welcome',
    description: 'Create a custom welcome embed with sections',
    usage: '!setup-welcome #channel',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Create a custom welcome embed with sections')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to post the welcome embeds in')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const channel = isInteraction ? 
            interaction.options.getChannel('channel') : 
            interaction.mentions.channels.first();

        const guild = interaction.guild;

        if (!channel) {
            const msg = 'Usage: `!setup-welcome #channel`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        // Welcome Embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👋 Welcome to ${guild.name}!`)
            .setDescription('We\'re glad to have you here! Here\'s everything you need to get started.')
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '📜 Read the Rules', value: 'Check out the rules channel and react to accept them.', inline: false },
                { name: '💬 Introduce Yourself', value: 'Head to the introductions channel and say hi!', inline: false },
                { name: '🎮 Pick Your Roles', value: 'Visit the roles channel to customize your experience.', inline: false },
                { name: '🆘 Need Help?', value: 'Ping a moderator or use the support channel.', inline: false }
            )
            .setFooter({ text: `Member #${guild.memberCount}` })
            .setTimestamp();

        // Server Info Embed
        const infoEmbed = new EmbedBuilder()
            .setColor('#43B581')
            .setTitle('📊 Server Information')
            .addFields(
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🏴‍☠️ Bot', value: 'Powered by Quartermaster', inline: true }
            );

        // Links/Resources Embed
        const resourcesEmbed = new EmbedBuilder()
            .setColor('#FAA61A')
            .setTitle('🔗 Quick Links')
            .setDescription('Important resources and links for our community')
            .addFields(
                { name: '📌 Server Rules', value: 'Read and accept our rules', inline: false },
                { name: '🎯 Get Roles', value: 'Customize your profile with roles', inline: false },
                { name: '💡 Suggestions', value: 'Have ideas? Share them!', inline: false }
            );

        try {
            await channel.send({ embeds: [welcomeEmbed] });
            await channel.send({ embeds: [infoEmbed] });
            await channel.send({ embeds: [resourcesEmbed] });

            const confirmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Welcome Channel Setup')
                .setDescription(`Welcome embeds posted in ${channel}!`)
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [confirmEmbed] });
            } else {
                await interaction.reply({ embeds: [confirmEmbed] });
            }
        } catch (error) {
            console.error('Error setting up welcome:', error);
            const errMsg = '❌ Failed to setup welcome channel. Make sure I have permission to post in that channel.';
            if (isInteraction) {
                await interaction.reply({ content: errMsg, ephemeral: true });
            } else {
                await interaction.reply(errMsg);
            }
        }
    }
};
