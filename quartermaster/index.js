require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const config = require('./config.json');

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
            if (command.name && command.execute) {
                // Set category based on folder name
                const category = path.basename(dir);
                command.category = category;
                
                client.commands.set(command.name, command);
                console.log(`Loaded command: ${command.name} [${category}]`);
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

// Handle Interactions (Slash Commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // RBAC - Role Based Access Control
    const guildId = interaction.guild.id;
    const settings = db.getGuildSettingsOrDefault(guildId);
    const modRoles = settings.mod_roles; // Array of role IDs

    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.member.permissions.has(GatewayIntentBits.Administrator) || isOwner;
    const isMod = isAdmin || interaction.member.roles.cache.some(role => modRoles.includes(role.id));

    // Determine category based on file path
    const commandCategory = command.category || 'general';

    // Enforcement Logic
    if (commandCategory === 'moderation' && !isMod) {
        return interaction.reply({ content: '❌ You must be a **Moderator** to use this command.', ephemeral: true });
    }

    if ((commandCategory === 'raid' || commandCategory === 'utility') && !isAdmin) {
        return interaction.reply({ content: '❌ You must be an **Administrator** to use this command.', ephemeral: true });
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Initialize database
db.initDatabase();

// Load reaction roles from database
client.reactionRoles = new Map();
try {
    const allReactionRoles = db.getAllReactionRoles.all();
    for (const rr of allReactionRoles) {
        if (!client.reactionRoles.has(rr.guild_id)) {
            client.reactionRoles.set(rr.guild_id, new Map());
        }
        client.reactionRoles.get(rr.guild_id).set(`${rr.message_id}-${rr.emoji}`, rr.role_id);
    }
    console.log(`Loaded ${allReactionRoles.length} reaction roles.`);
} catch (error) {
    console.error('Error loading reaction roles:', error);
}

// Load commands and events
loadCommands(path.join(__dirname, 'commands'));
loadEvents();

// Start background manager
const QuartermasterManager = require('./manager');
client.manager = new QuartermasterManager(client);

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
