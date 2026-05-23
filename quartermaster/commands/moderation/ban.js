const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: '!ban @user [reason]',
    permissions: PermissionFlagsBits.BanMembers,
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, args) {
        const isInteraction = interaction.isCommand?.() || false;
        const user = isInteraction ? interaction.options.getUser('target') : interaction.mentions.users.first();
        const reason = isInteraction ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(1).join(' ') || 'No reason provided');

        if (!user) {
            return interaction.reply('Please mention a user to ban!');
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            return interaction.reply('User not found in this server!');
        }

        if (!member.bannable) {
            return interaction.reply('I cannot ban this user!');
        }

        if (user.id === (isInteraction ? interaction.user.id : interaction.author.id)) {
            return interaction.reply('You cannot ban yourself!');
        }

        try {
            await user.send(`You have been banned from ${interaction.guild.name}. Reason: ${reason}`).catch(() => {});
            await member.ban({ reason: `${reason} | Banned by ${isInteraction ? interaction.user.tag : interaction.author.tag}` });
            await logger.logModeration(interaction.guild, 'BAN', isInteraction ? interaction.user : interaction.author, user, reason);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('User Banned')
                .setDescription(`${user.tag} has been banned`)
                .addFields(
                    { name: 'Moderator', value: isInteraction ? interaction.user.tag : interaction.author.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            if (isInteraction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error banning user:', error);
            interaction.reply('Failed to ban the user!');
        }
    }
};
