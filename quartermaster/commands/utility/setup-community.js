const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'setup-community',
    description: 'Automated setup for community servers (Category, Rules, Welcome, Logs)',
    usage: '!setup-community',
    permissions: PermissionFlagsBits.Administrator,
    data: new SlashCommandBuilder()
        .setName('setup-community')
        .setDescription('Automated setup for community servers (Category, Rules, Welcome, Logs)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        
        if (isInteraction) {
            await interaction.deferReply();
        }

        const guild = interaction.guild;
        const author = isInteraction ? interaction.user : interaction.author;

        let statusMsg;
        if (isInteraction) {
            statusMsg = interaction;
        } else {
            statusMsg = await interaction.reply('⏳ Starting community setup... creating roles and channels.');
        }

        try {
            // 1. Create Verified Role if it doesn't exist
            let memberRole = guild.roles.cache.find(r => r.name === 'Member');
            if (!memberRole) {
                memberRole = await guild.roles.create({
                    name: 'Member',
                    colors: '#3498DB',
                    reason: 'Quartermaster Community Setup'
                });
            }

            // 2. Create Category
            const category = await guild.channels.create({
                name: 'COMMUNITY',
                type: ChannelType.GuildCategory
            });

            // 3. Create Rules Channel
            const rulesChannel = await guild.channels.create({
                name: 'rules',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.SendMessages],
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            // 4. Create Welcome Channel
            const welcomeChannel = await guild.channels.create({
                name: 'welcome',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.SendMessages],
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            // 5. Create Mod Logs Channel (Private)
            const logsChannel = await guild.channels.create({
                name: 'mod-logs',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: guild.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.ManageMessages))?.id || author.id,
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            // 6. Configure Rules with verification
            const rulesEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📜 Server Rules')
                .setDescription(`Welcome to **${guild.name}**! Please read and accept the rules below.`)
                .addFields(
                    { name: '1️⃣ Respect', value: 'Treat everyone with kindness.', inline: false },
                    { name: '2️⃣ Content', value: 'No NSFW or illegal content.', inline: false },
                    { name: '3️⃣ Spam', value: 'No spamming or self-promotion.', inline: false },
                    { name: '4️⃣ Verify', value: 'React with ✅ below to gain access to the rest of the server!', inline: false }
                )
                .setTimestamp();

            const rulesMsg = await rulesChannel.send({ embeds: [rulesEmbed] });
            await rulesMsg.react('✅');

            // Save reaction role data
            db.addReactionRole.run(guild.id, rulesMsg.id, '✅', memberRole.id);

            if (!interaction.client.reactionRoles) interaction.client.reactionRoles = new Map();
            if (!interaction.client.reactionRoles.has(guild.id)) interaction.client.reactionRoles.set(guild.id, new Map());
            interaction.client.reactionRoles.get(guild.id).set(`${rulesMsg.id}-✅`, memberRole.id);

            // 7. Update Database Settings
            const modRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('mod') || r.name.toLowerCase().includes('staff'));
            const modRolesList = modRole ? [modRole.id] : [];

            db.setGuildSetting.run(
                guild.id, 
                welcomeChannel.id, 
                welcomeChannel.id, 
                logsChannel.id, 
                null, 
                '#5865F2', 
                memberRole.id,
                JSON.stringify(modRolesList)
            );

            // 8. Final Success Message
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Community Setup Complete!')
                .setDescription('I have successfully configured your server for growth.')
                .addFields(
                    { name: 'Category', value: 'COMMUNITY', inline: true },
                    { name: 'Verified Role', value: `<@&${memberRole.id}>`, inline: true },
                    { name: 'Rules', value: `<#${rulesChannel.id}>`, inline: true },
                    { name: 'Welcome', value: `<#${welcomeChannel.id}>`, inline: true },
                    { name: 'Audit Logs', value: `<#${logsChannel.id}>`, inline: true }
                )
                .setFooter({ text: 'Tip: Move the Member role to the correct hierarchy position!' });

            if (isInteraction) {
                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                await statusMsg.edit({ content: null, embeds: [successEmbed] });
            }

        } catch (error) {
            console.error('Community setup error:', error);
            const errMsg = `❌ An error occurred during setup: ${error.message}`;
            if (isInteraction) {
                await interaction.editReply(errMsg);
            } else {
                await statusMsg.edit(errMsg);
            }
        }
    }
};
