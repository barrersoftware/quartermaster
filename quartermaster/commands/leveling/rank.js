const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { createRankCard } = require('../../rankCard');

module.exports = {
    name: 'rank',
    description: 'View your current level and rank',
    usage: '!rank [@user]',
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View your current level and rank')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user whose rank you want to view')
                .setRequired(false)),
    async execute(interaction, args) {
        // Support both Message (prefix) and Interaction (slash)
        const isInteraction = interaction.isCommand?.() || false;
        const target = isInteraction ? 
            (interaction.options.getUser('target') || interaction.user) : 
            (interaction.mentions.users.first() || interaction.author);
        
        const guildId = interaction.guild.id;
        const userData = db.getUserData.get(target.id, guildId);
        const settings = db.getGuildSettingsOrDefault(guildId);

        if (!userData) {
            const msg = target.id === (isInteraction ? interaction.user.id : interaction.author.id) ? 
                "You haven't earned any XP yet! Start chatting to level up." : 
                "That user hasn't earned any XP yet.";
            
            return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        if (isInteraction) await interaction.deferReply();

        const rank = db.getUserRank(target.id, guildId);
        const level = userData.level;
        const currentXp = userData.xp;
        
        const xpForCurrentLevel = Math.floor(db.calculateXPForLevel(level));
        const xpForNextLevel = Math.floor(db.calculateXPForLevel(level + 1));
        
        const relativeXp = currentXp - xpForCurrentLevel;
        const relativeRequired = xpForNextLevel - xpForCurrentLevel;

        try {
            const buffer = await createRankCard({
                username: target.username,
                level: level,
                rank: rank,
                currentXp: relativeXp,
                requiredXp: relativeRequired,
                avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
                color: settings.rank_card_color
            });

            const attachment = new AttachmentBuilder(buffer, { name: `rank-${target.id}.png` });
            
            if (isInteraction) {
                await interaction.editReply({ files: [attachment] });
            } else {
                await interaction.channel.send({ files: [attachment] });
            }
        } catch (error) {
            console.error('Error generating rank card:', error);
            const fallbackMsg = `**${target.username}** | Level: ${level} | XP: ${currentXp} | Rank: #${rank}`;
            if (isInteraction) {
                await interaction.editReply(fallbackMsg);
            } else {
                interaction.reply(fallbackMsg);
            }
        }
    }
};
