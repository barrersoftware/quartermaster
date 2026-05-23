const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows all available commands',
    usage: '!help [command]',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('The command to get details for')
                .setRequired(false)),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const client = interaction.client;
        const prefix = process.env.PREFIX || '!';

        const commandNameInput = isInteraction ? 
            interaction.options.getString('command') : 
            (args && args.length > 0 ? args[0] : null);

        // If a specific command is requested
        if (commandNameInput) {
            const commandName = commandNameInput.toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                const msg = 'Command not found!';
                return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
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

            return isInteraction ? interaction.reply({ embeds: [embed] }) : interaction.channel.send({ embeds: [embed] });
        }

        // Show all commands
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Bot Commands')
            .setDescription(`Use \`${prefix}help <command>\` or \`/help <command>\` for detailed information.`)
            .addFields(
                {
                    name: 'Leveling',
                    value: '`rank`, `leaderboard`',
                    inline: false
                },
                {
                    name: 'Moderation',
                    value: '`ban`, `kick`, `mute`, `warn`, `warnings`, `clearwarnings`, `automod`',
                    inline: false
                },
                {
                    name: 'Raid Protection',
                    value: '`raidprotection`, `raidlogs`, `endlockdown`',
                    inline: false
                },
                {
                    name: 'Utility',
                    value: '`setup-community`, `setup-welcome`, `setup-rules`, `reactionrole`, `embed`',
                    inline: false
                }
            )
            .setFooter({ text: `Prefix: ${prefix} | MIT License` })
            .setTimestamp();

        if (isInteraction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.channel.send({ embeds: [embed] });
        }
    }
};
