const logger = require('../logger');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        await logger.logGuildMemberUpdate(oldMember, newMember);
    }
};
