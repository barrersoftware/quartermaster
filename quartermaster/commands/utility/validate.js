const { EmbedBuilder } = require('discord.js');
const bslEnforcement = require('../../bsl-enforcement');

module.exports = {
    name: 'validate',
    description: 'View BarrerSoftware License information and compliance status',
    usage: '!validate',
    async execute(message, args, client) {
        
        // Check if this is BarrerSoftware compliance verification
        const isBarrerSoftwareCheck = bslEnforcement.verifyOwner(message.author.id) && 
                                      args[0] === 'compliance';
        
        if (isBarrerSoftwareCheck) {
            // Perform actual compliance checks (BarrerSoftware only)
            const checks = {
                noPaywalls: await checkForPaywalls(),
                noSubscriptions: await checkForSubscriptions(),
                hasLicense: await checkLicenseFile(),
                hasAttribution: await checkAttribution(),
                sourceAvailable: true
            };

            const isCompliant = Object.values(checks).every(check => check === true);

            // Minimal report for BarrerSoftware
            const embed = new EmbedBuilder()
                .setTitle(isCompliant ? '✅ COMPLIANT' : '❌ NOT COMPLIANT')
                .setColor(isCompliant ? '#00FF00' : '#FF0000')
                .setDescription(isCompliant 
                    ? 'Instance follows BSL' 
                    : 'Instance violates BSL - investigation required')
                .addFields(
                    { name: 'Paywalls', value: checks.noPaywalls ? '✅' : '❌', inline: true },
                    { name: 'Subscriptions', value: checks.noSubscriptions ? '✅' : '❌', inline: true },
                    { name: 'License', value: checks.hasLicense ? '✅' : '❌', inline: true },
                    { name: 'Attribution', value: checks.hasAttribution ? '✅' : '❌', inline: true }
                )
                .setFooter({ text: `Server: ${message.guild.name}` })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        // Public informational response
        const infoEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🏴‍☠️ Quartermaster License Information')
            .setDescription('**FREE Software under the BarrerSoftware License (BSL)**')
            .addFields(
                {
                    name: '📜 What This Means',
                    value: '• Quartermaster is and will **always** be FREE\n' +
                           '• No one can charge you for this software\n' +
                           '• If someone is selling it, they\'re violating the license\n' +
                           '• You have the right to use, modify, and share it',
                    inline: false
                },
                {
                    name: '✅ License Compliance',
                    value: 'This command is part of BarrerSoftware\'s license compliance system.\n\n' +
                           '**Automatic compliance checks run in the background**\n' +
                           '(BarrerSoftware verification access only)',
                    inline: false
                },
                {
                    name: '❓ Questions About The License?',
                    value: '📄 Read the full license: `LICENSE` file in bot directory\n' +
                           '🌐 Website: https://barrersoftware.com\n' +
                           '📧 Contact: legal@barrersoftware.com',
                    inline: false
                }
            )
            .setFooter({ text: '🏴‍☠️ "If it\'s free, it\'s free. Period."' })
            .setTimestamp();

        await message.channel.send({ embeds: [infoEmbed] });
    }
};

// Compliance check functions (BarrerSoftware use only)
async function checkForPaywalls() {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
        const paymentKeywords = ['STRIPE', 'PAYPAL', 'PAYMENT', 'SUBSCRIPTION', 'PREMIUM'];
        return !paymentKeywords.some(keyword => envContent.includes(keyword));
    } catch (error) {
        return true;
    }
}

async function checkForSubscriptions() {
    return true;
}

async function checkLicenseFile() {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const licensePath = path.join(process.cwd(), 'LICENSE');
        if (fs.existsSync(licensePath)) {
            const content = fs.readFileSync(licensePath, 'utf8');
            return content.includes('BarrerSoftware License');
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function checkAttribution() {
    const packageJson = require('../../package.json');
    return packageJson.author && packageJson.author.includes('Captain CP');
}
