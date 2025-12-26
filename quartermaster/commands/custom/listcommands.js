const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'listcommands',
    aliases: ['listcmds', 'customcommands'],
    description: 'List all custom commands',
    usage: '!listcommands',
    async execute(message, args) {
        const customCommands = db.getAllCustomCommands.all(message.guild.id);

        if (!customCommands || customCommands.length === 0) {
            return message.reply('No custom commands have been created yet!');
        }

        let description = '';
        for (const cmd of customCommands) {
            description += `**!${cmd.command_name}** - ${cmd.response.substring(0, 50)}${cmd.response.length > 50 ? '...' : ''}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Custom Commands')
            .setDescription(description)
            .setFooter({ text: `Total: ${customCommands.length} commands` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
