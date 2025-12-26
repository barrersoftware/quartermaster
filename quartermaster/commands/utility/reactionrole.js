const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Store reaction role configurations per guild
const reactionRoles = new Map();

module.exports = {
    name: 'reactionrole',
    aliases: ['rr'],
    description: 'Setup reaction roles for a message',
    usage: '!reactionrole <messageID> <emoji> <@role>',
    permissions: PermissionFlagsBits.ManageRoles,
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need Manage Roles permission.');
        }

        if (args.length < 3) {
            return message.reply('Usage: `!reactionrole <messageID> <emoji> <@role>`\nExample: `!reactionrole 123456789 👍 @Member`');
        }

        const messageId = args[0];
        const emoji = args[1];
        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply('❌ Please mention a valid role.');
        }

        // Check if bot can manage this role
        const botMember = message.guild.members.cache.get(message.client.user.id);
        if (role.position >= botMember.roles.highest.position) {
            return message.reply('❌ I cannot manage this role as it is higher than or equal to my highest role.');
        }

        try {
            // Fetch the message
            const targetMessage = await message.channel.messages.fetch(messageId);
            
            // Add reaction to the message
            await targetMessage.react(emoji);

            // Store the reaction role config
            const guildId = message.guild.id;
            if (!reactionRoles.has(guildId)) {
                reactionRoles.set(guildId, new Map());
            }
            
            const guildRoles = reactionRoles.get(guildId);
            const key = `${messageId}-${emoji}`;
            guildRoles.set(key, role.id);

            // Store in client for persistence across events
            if (!message.client.reactionRoles) {
                message.client.reactionRoles = reactionRoles;
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✅ Reaction Role Created')
                .setDescription(`Users who react with ${emoji} on [this message](${targetMessage.url}) will receive ${role}`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting up reaction role:', error);
            message.reply('❌ Failed to setup reaction role. Make sure the message ID is correct and in this channel.');
        }
    },

    // Initialize reaction role data
    initialize(client) {
        if (!client.reactionRoles) {
            client.reactionRoles = new Map();
        }
    }
};
