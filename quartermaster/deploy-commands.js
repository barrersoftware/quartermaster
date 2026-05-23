require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
                console.log(`Prepared slash command: ${command.name}`);
            }
        }
    }
}

loadCommands(commandsPath);

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('❌ Error: DISCORD_TOKEN or CLIENT_ID is missing from .env file.');
    process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Deployment error:', error);
    }
})();
