const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'removecommand',
    aliases: ['removecmd', 'delcommand', 'delcmd'],
    description: 'Remove a custom command',
    usage: '!removecommand <command_name>',
    permissions: PermissionFlagsBits.ManageGuild,
    async execute(message, args) {
        if (args.length < 1) {
            return message.reply('Usage: !removecommand <command_name>');
        }

        const commandName = args[0].toLowerCase();

        try {
            const result = db.deleteCustomCommand.run(message.guild.id, commandName);

            if (result.changes === 0) {
                return message.reply('No custom command found with that name!');
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Custom Command Removed')
                .setDescription(`The custom command **!${commandName}** has been removed.`)
                .setFooter({ text: `Removed by ${message.author.tag}` })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing custom command:', error);
            await message.reply('Failed to remove custom command!');
        }
    }
};
