const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const logger = require('../../logger');

module.exports = {
    name: 'warn',
    description: 'Warn a user',
    usage: '!warn @user <reason>',
    permissions: PermissionFlagsBits.ModerateMembers,
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member of the server')
        .addUserOption(opt => opt.setName('target').setDescription('The user to warn').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const reason = isInteraction ? interaction.options.getString('reason') : args.slice(1).join(' ');

        if (!user || !reason) {
            const msg = 'Usage: `!warn @user <reason>`';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const guildId = interaction.guild.id;
        const author = isInteraction ? interaction.user : interaction.author;

        if (user.id === author.id) {
            const msg = 'You cannot warn yourself!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        try {
            db.addWarning.run(user.id, guildId, author.id, reason);
            const warnings = db.getWarnings.all(user.id, guildId);

            await logger.logModeration(interaction.guild, 'WARN', author, user, reason);

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('User Warned')
                .setDescription(`${user.tag} has been warned`)
                .addFields(
                    { name: 'Moderator', value: author.tag, inline: true },
                    { name: 'Total Warnings', value: warnings.length.toString(), inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }

            await user.send(`You have been warned in ${interaction.guild.name}. Reason: ${reason}\nTotal warnings: ${warnings.length}`).catch(() => {});
        } catch (error) {
            console.error('Error warning user:', error);
            const errMsg = 'Failed to warn the user!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
