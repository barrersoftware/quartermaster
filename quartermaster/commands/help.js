const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows all available commands',
    usage: '!help [command]',
    async execute(message, args, client) {
        const prefix = process.env.PREFIX || '!';

        // If a specific command is requested
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                return message.reply('Command not found!');
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`Help: ${command.name}`)
                .setDescription(command.description || 'No description available')
                .addFields(
                    { name: 'Usage', value: command.usage || 'No usage information', inline: false }
                );

            if (command.aliases && command.aliases.length > 0) {
                embed.addFields({ name: 'Aliases', value: command.aliases.join(', '), inline: false });
            }

            return message.channel.send({ embeds: [embed] });
        }

        // Show all commands
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Bot Commands')
            .setDescription(`Use \`${prefix}help <command>\` for detailed information about a specific command.`)
            .addFields(
                {
                    name: 'Leveling',
                    value: '`rank`, `leaderboard`',
                    inline: false
                },
                {
                    name: 'Moderation',
                    value: '`ban`, `kick`, `mute`, `unmute`, `warn`, `warnings`, `clearwarnings`',
                    inline: false
                },
                {
                    name: 'Raid Protection',
                    value: '`raidprotection`, `raidlogs`, `endlockdown`',
                    inline: false
                },
                {
                    name: 'Custom Commands',
                    value: '`addcommand`, `removecommand`, `listcommands`',
                    inline: false
                },
                {
                    name: 'Other',
                    value: '`help`',
                    inline: false
                }
            )
            .setFooter({ text: `Prefix: ${prefix}` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
