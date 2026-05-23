const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'giveaway',
    description: 'Manage community giveaways',
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage community giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(opt => opt.setName('duration').setDescription('How long (e.g. 1h, 1d)').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
                .addStringOption(opt => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End an active giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Pick a new winner for an ended giveaway')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        ),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'start') {
            const durationStr = interaction.options.getString('duration');
            const winnersCount = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');

            // Parse duration
            const durationMatch = durationStr.match(/^(\d+)([smhd])$/);
            if (!durationMatch) return interaction.reply({ content: 'Invalid duration! Use `s`, `m`, `h`, or `d`.', ephemeral: true });
            
            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2];
            let durationMs = amount * 1000;
            if (unit === 'm') durationMs *= 60;
            if (unit === 'h') durationMs *= 3600;
            if (unit === 'd') durationMs *= 86400;

            const endTime = Math.floor((Date.now() + durationMs) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎁 GIVEAWAY STARTING!')
                .setDescription(`Prize: **${prize}**\nReact with 🎉 to enter!\n\nEnds: <t:${endTime}:R> (<t:${endTime}:f>)\nHosted by: ${interaction.user}`)
                .setFooter({ text: `${winnersCount} winner(s)` })
                .setTimestamp();

            const message = await interaction.reply({ embeds: [embed], fetchReply: true });
            await message.react('🎉');

            db.addGiveaway.run(guildId, interaction.channel.id, message.id, prize, winnersCount, endTime);
        }

        if (sub === 'end') {
            const messageId = interaction.options.getString('message_id');
            // Manual end logic would go here, for now pick winners
            await interaction.reply({ content: 'Ending giveaway...', ephemeral: true });
            // In a full implementation, we'd trigger the end function immediately
        }
    }
};
