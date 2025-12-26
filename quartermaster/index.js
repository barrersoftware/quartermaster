require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const config = require('./config.json');
const bslEnforcement = require('./bsl-enforcement');

// ============================================
// BSL ENFORCEMENT - DO NOT REMOVE
// ============================================
// Quartermaster is FREE software under the
// BarrerSoftware License (BSL).
// These checks ensure it stays free forever.
// ============================================

function verifyBSLCompliance() {
    const requiredFiles = [
        'LICENSE',
        'bsl-enforcement.js',
        'commands/utility/validate.js',
        'commands/utility/violation.js'
    ];

    console.log('🏴‍☠️ Verifying BarrerSoftware License compliance...');

    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            console.error('');
            console.error('═══════════════════════════════════════════');
            console.error('❌ BSL COMPLIANCE ERROR');
            console.error('═══════════════════════════════════════════');
            console.error('');
            console.error(`Required file missing: ${file}`);
            console.error('');
            console.error('Quartermaster requires BSL enforcement files');
            console.error('to ensure it remains FREE software.');
            console.error('');
            console.error('If you removed these files:');
            console.error('1. Restore from source repository');
            console.error('2. This is a LICENSE violation');
            console.error('3. Contact legal@barrersoftware.com');
            console.error('');
            console.error('🏴‍☠️ "If it\'s free, it\'s free. Period."');
            console.error('');
            console.error('═══════════════════════════════════════════');
            console.error('');
            process.exit(1);
        }
    }

    // Verify LICENSE content
    try {
        const licenseContent = fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf8');
        if (!licenseContent.includes('BarrerSoftware License') || 
            !licenseContent.includes('If it\'s free, it\'s free')) {
            console.error('');
            console.error('═══════════════════════════════════════════');
            console.error('❌ LICENSE FILE TAMPERED');
            console.error('═══════════════════════════════════════════');
            console.error('');
            console.error('The LICENSE file has been modified or replaced.');
            console.error('Restore the original BarrerSoftware License.');
            console.error('');
            console.error('This is a violation of the BSL.');
            console.error('Contact: legal@barrersoftware.com');
            console.error('');
            console.error('═══════════════════════════════════════════');
            console.error('');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Could not verify LICENSE file integrity');
        process.exit(1);
    }

    // Verify enforcement server cryptographic hashes
    try {
        bslEnforcement.getEnforcementServerDetails();
    } catch (error) {
        // Error is already logged by bsl-enforcement module
        process.exit(1);
    }

    console.log('✅ BSL compliance verified');
    console.log('✅ Enforcement server authenticated');
    console.log('🏴‍☠️ Quartermaster is FREE software - keeping it that way\n');
}

// Run BSL verification BEFORE anything else
verifyBSLCompliance();

// ============================================
// END BSL ENFORCEMENT
// ============================================

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.GuildMember, Partials.Message, Partials.Reaction]
});

// Initialize collections
client.commands = new Collection();
client.config = config;

// Load command files
function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.name) {
                client.commands.set(command.name, command);
                console.log(`Loaded command: ${command.name}`);
            }
        }
    }
}

// Load event files
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`Loaded event: ${event.name}`);
    }
}

// Initialize database
db.initDatabase();

// Load commands and events
loadCommands(path.join(__dirname, 'commands'));
loadEvents();

// Start web dashboard
const webServer = require('./web/server');

// Login to Discord
client.login(process.env.DISCORD_TOKEN).then(() => {
    // Set the Discord client for the web dashboard
    webServer.setDiscordClient(client);

    // Start the web server
    webServer.startServer();
}).catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
});
