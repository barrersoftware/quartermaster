const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const bslEnforcement = require('../../bsl-enforcement');

module.exports = {
    name: 'violation',
    description: 'Issue a BSL violation notice (BarrerSoftware compliance verification only)',
    usage: '!violation [#channel]',
    async execute(message, args, client) {
        
        // Check if user is BarrerSoftware compliance team
        if (!bslEnforcement.verifyOwner(message.author.id)) {
            // Don't even respond - keep it hidden
            return;
        }

        const channel = message.mentions.channels.first() || message.channel;

        const violationEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ LICENSE VIOLATION NOTICE ⚠️')
            .setDescription('**This server is in violation of the BarrerSoftware License (BSL)**')
            .addFields(
                {
                    name: '📜 Violation Details',
                    value: 'Quartermaster is FREE SOFTWARE and must remain free forever.\n\n' +
                           'This instance has been found to violate the BSL by:',
                    inline: false
                },
                {
                    name: '❌ PROHIBITED ACTIONS',
                    value: '• Selling or charging for the software\n' +
                           '• Creating paid tiers or subscriptions\n' +
                           '• Monetizing this software in any form\n' +
                           '• Removing attribution to BarrerSoftware',
                    inline: false
                },
                {
                    name: '⚖️ CEASE AND DESIST',
                    value: '**You are hereby ordered to IMMEDIATELY:**\n' +
                           '❌ Stop all sales of Quartermaster\n' +
                           '❌ Stop all paid tiers or subscriptions\n' +
                           '❌ Stop all commercialization\n' +
                           '❌ Remove all paywalls\n\n' +
                           '**Compliance deadline: 48 hours**',
                    inline: false
                },
                {
                    name: '⚠️ CONSEQUENCES OF NON-COMPLIANCE',
                    value: 'Failure to comply will result in:\n\n' +
                           '1️⃣ **Public disclosure** of violation\n' +
                           '   • Violator name published\n' +
                           '   • Details shared with community\n\n' +
                           '2️⃣ **Legal action**\n' +
                           '   • Immediate injunction\n' +
                           '   • Recovery of all profits\n' +
                           '   • Legal fees paid by violator\n\n' +
                           '3️⃣ **Permanent ban**\n' +
                           '   • Excluded from BarrerSoftware ecosystem\n' +
                           '   • Community blacklist',
                    inline: false
                },
                {
                    name: '📞 Contact',
                    value: '**BarrerSoftware Legal Department**\n' +
                           'Email: legal@barrersoftware.com\n' +
                           'Website: https://barrersoftware.com\n\n' +
                           'Reference this violation in all correspondence.',
                    inline: false
                }
            )
            .setFooter({ text: '🏴‍☠️ BarrerSoftware - If it\'s free, it\'s free. Period.' })
            .setTimestamp();

        const noticeEmbed = new EmbedBuilder()
            .setColor('#FAA61A')
            .setTitle('📋 READ THE LICENSE')
            .setDescription('**The BarrerSoftware License (BSL)**\n\n' +
                           '"If it\'s free, it\'s free. Period."\n\n' +
                           'Quartermaster is FREE SOFTWARE. It must remain FREE forever.\n\n' +
                           '**What you CAN do:**\n' +
                           '✅ Use for any purpose\n' +
                           '✅ Modify and improve\n' +
                           '✅ Share with others\n' +
                           '✅ Charge for SERVICES (support, setup, training)\n\n' +
                           '**What you CANNOT do:**\n' +
                           '❌ Sell the software\n' +
                           '❌ Charge for access\n' +
                           '❌ Create paid versions\n' +
                           '❌ Monetize in any form\n\n' +
                           '**Full license:** https://github.com/barrersoftware/quartermaster/LICENSE')
            .setTimestamp();

        try {
            await channel.send({ embeds: [violationEmbed, noticeEmbed] });
            
            // Send confirmation
            await message.reply({
                content: '✅ BarrerSoftware BSL violation notice posted.',
                ephemeral: true
            });

            console.log(`BSL Violation notice issued in ${message.guild.name} by BarrerSoftware compliance team`);
        } catch (error) {
            console.error('Error posting violation notice:', error);
            await message.reply('❌ Failed to post violation notice.');
        }
    }
};
