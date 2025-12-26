module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bot reactions
        if (user.bot) return;

        // Handle partial reactions
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        // Check if this is a reaction role
        if (!client.reactionRoles) return;

        const guildRoles = client.reactionRoles.get(reaction.message.guild.id);
        if (!guildRoles) return;

        const emoji = reaction.emoji.name;
        const key = `${reaction.message.id}-${emoji}`;
        const roleId = guildRoles.get(key);

        if (!roleId) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            const role = reaction.message.guild.roles.cache.get(roleId);

            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                console.log(`Added ${role.name} to ${user.tag}`);
            }
        } catch (error) {
            console.error('Error adding reaction role:', error);
        }
    }
};
