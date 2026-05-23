const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger');

module.exports = {
    name: 'kick',
    description: 'Kick a user from the server',
    usage: '!kick @user [reason]',
    permissions: PermissionFlagsBits.KickMembers,
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('The user to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const reason = isInteraction ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(1).join(' ') || 'No reason provided');

        if (!user) {
            const msg = 'Please mention a user to kick!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            const msg = 'User not found in this server!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        if (!member.kickable) {
            const msg = 'I cannot kick this user!';
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        const author = isInteraction ? interaction.user : interaction.author;

        try {
            await user.send(`You have been kicked from ${interaction.guild.name}. Reason: ${reason}`).catch(() => {});
            await member.kick(`${reason} | Kicked by ${author.tag}`);

            await logger.logModeration(interaction.guild, 'KICK', author, user, reason);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('User Kicked')
                .setDescription(`${user.tag} has been kicked`)
                .addFields(
                    { name: 'Moderator', value: author.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error kicking user:', error);
            const errMsg = 'Failed to kick the user!';
            if (isInteraction) await interaction.reply({ content: errMsg, ephemeral: true });
            else interaction.reply(errMsg);
        }
    }
};
