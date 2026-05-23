const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'warnings',
    aliases: ['warns'],
    description: 'View warnings for a user',
    usage: '!warnings @user',
    permissions: PermissionFlagsBits.ModerateMembers,
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(opt => opt.setName('target').setDescription('The user to view warnings for').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? (interaction.options.getUser('target') || interaction.user) : (interaction.mentions.users.first() || interaction.author);
        const guildId = interaction.guild.id;

        const warnings = db.getWarnings.all(user.id, guildId);

        if (!warnings || warnings.length === 0) {
            const msg = `${user.tag} has no warnings!`;
            return isInteraction ? interaction.reply(msg) : interaction.reply(msg);
        }

        let description = '';
        for (let i = 0; i < warnings.length; i++) {
            const warn = warnings[i];
            const date = new Date(warn.timestamp * 1000).toLocaleDateString();
            description += `**${i + 1}.** ${warn.reason}\n*By <@${warn.moderator_id}> on ${date}*\n\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`Warnings for ${user.tag}`)
            .setDescription(description)
            .setFooter({ text: `Total warnings: ${warnings.length}` })
            .setTimestamp();

        if (isInteraction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.channel.send({ embeds: [embed] });
        }
    }
};
