const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'setup-rules',
    description: 'Create a rules embed with react-to-accept verification',
    usage: '!setup-rules #channel @verified-role',
    permissions: PermissionFlagsBits.ManageGuild,
    data: new SlashCommandBuilder()
        .setName('setup-rules')
        .setDescription('Create a rules embed with react-to-accept verification')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to post rules in').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role to give on verification').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const channel = isInteraction ? interaction.options.getChannel('channel') : interaction.mentions.channels.first();
        const role = isInteraction ? interaction.options.getRole('role') : interaction.mentions.roles.first();

        const guild = interaction.guild;

        if (!channel || !role) {
            const msg = 'Usage: `!setup-rules #channel @verified-role`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const rulesEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 Server Rules')
            .setDescription('Please read and accept our rules to gain access to the server.')
            .addFields(
                { name: '1️⃣ Be Respectful', value: 'Treat all members with respect.', inline: false },
                { name: '2️⃣ No Spam', value: 'Do not spam messages or links.', inline: false },
                { name: '3️⃣ No NSFW', value: 'Keep content appropriate.', inline: false },
                { name: '\u200B', value: '✅ **React with ✅ below to gain access!**', inline: false }
            )
            .setFooter({ text: `${guild.name}` })
            .setTimestamp();

        try {
            const rulesMessage = await channel.send({ embeds: [rulesEmbed] });
            await rulesMessage.react('✅');

            // Save reaction data
            db.addReactionRole.run(guild.id, rulesMessage.id, '✅', role.id);
            
            if (!interaction.client.reactionRoles) interaction.client.reactionRoles = new Map();
            if (!interaction.client.reactionRoles.has(guild.id)) interaction.client.reactionRoles.set(guild.id, new Map());
            interaction.client.reactionRoles.get(guild.id).set(`${rulesMessage.id}-✅`, role.id);

            const confirmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Rules Posted')
                .setDescription(`Rules posted in ${channel}!\nVerification role: ${role}`)
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [confirmEmbed] });
            } else {
                await interaction.reply({ embeds: [confirmEmbed] });
            }
        } catch (error) {
            console.error('Error setting up rules:', error);
            const errMsg = '❌ Failed to setup rules.';
            if (isInteraction) {
                await interaction.reply({ content: errMsg, ephemeral: true });
            } else {
                await interaction.reply(errMsg);
            }
        }
    }
};
