const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-rules',
    description: 'Create a rules embed with react-to-accept verification',
    usage: '!setup-rules #channel @verified-role',
    permissions: PermissionFlagsBits.ManageGuild,
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }

        const channel = message.mentions.channels.first();
        const role = message.mentions.roles.first();

        if (!channel || !role) {
            return message.reply('Usage: `!setup-rules #channel @verified-role`\nExample: `!setup-rules #rules @Member`');
        }

        const rulesEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 Server Rules')
            .setDescription('Please read and accept our rules to gain access to the server.')
            .addFields(
                { name: '1️⃣ Be Respectful', value: 'Treat all members with respect. No harassment, hate speech, or discrimination.', inline: false },
                { name: '2️⃣ No Spam', value: 'Do not spam messages, links, or mentions. Keep conversations relevant.', inline: false },
                { name: '3️⃣ No NSFW Content', value: 'Keep all content appropriate. NSFW content belongs in designated channels only.', inline: false },
                { name: '4️⃣ Follow Discord ToS', value: 'All Discord Terms of Service and Community Guidelines apply.', inline: false },
                { name: '5️⃣ Use Appropriate Channels', value: 'Post content in the correct channels. Ask mods if unsure.', inline: false },
                { name: '\u200B', value: '✅ **React with ✅ below to accept the rules and gain access!**', inline: false }
            )
            .setFooter({ text: `${message.guild.name} • By reacting, you agree to follow these rules` })
            .setTimestamp();

        try {
            const rulesMessage = await channel.send({ embeds: [rulesEmbed] });
            await rulesMessage.react('✅');

            // Store this in reaction roles system
            const reactionRoleCommand = message.client.commands.get('reactionrole');
            if (reactionRoleCommand && reactionRoleCommand.initialize) {
                reactionRoleCommand.initialize(message.client);
            }

            if (!message.client.reactionRoles) {
                message.client.reactionRoles = new Map();
            }

            const guildId = message.guild.id;
            if (!message.client.reactionRoles.has(guildId)) {
                message.client.reactionRoles.set(guildId, new Map());
            }

            const guildRoles = message.client.reactionRoles.get(guildId);
            const key = `${rulesMessage.id}-✅`;
            guildRoles.set(key, role.id);

            const confirmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Rules Posted')
                .setDescription(`Rules posted in ${channel}!\nUsers who react with ✅ will receive ${role}`)
                .setTimestamp();

            await message.channel.send({ embeds: [confirmEmbed] });
        } catch (error) {
            console.error('Error setting up rules:', error);
            message.reply('❌ Failed to setup rules. Make sure I have permission to post in that channel.');
        }
    }
};
