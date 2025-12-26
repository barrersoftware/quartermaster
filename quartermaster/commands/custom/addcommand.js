const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'addcommand',
    aliases: ['addcmd'],
    description: 'Add a custom command',
    usage: '!addcommand <command_name> <response>',
    permissions: PermissionFlagsBits.ManageGuild,
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('Usage: !addcommand <command_name> <response>');
        }

        const commandName = args[0].toLowerCase();
        const response = args.slice(1).join(' ');

        // Check if command name is valid
        if (commandName.includes(' ')) {
            return message.reply('Command name cannot contain spaces!');
        }

        // Check if it conflicts with existing commands
        if (message.client.commands.has(commandName)) {
            return message.reply('This command name conflicts with an existing built-in command!');
        }

        try {
            db.addCustomCommand.run(message.guild.id, commandName, response, message.author.id);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Custom Command Added')
                .addFields(
                    { name: 'Command', value: `!${commandName}`, inline: true },
                    { name: 'Response', value: response, inline: false },
                    { name: 'Created By', value: message.author.tag, inline: true }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                return message.reply('A custom command with this name already exists!');
            }
            console.error('Error adding custom command:', error);
            await message.reply('Failed to add custom command!');
        }
    }
};
