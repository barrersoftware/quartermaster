const logger = require('../logger');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Handle partials
        if (oldMessage.partial) {
            try {
                await oldMessage.fetch();
            } catch (error) {
                console.error('Error fetching partial oldMessage:', error);
                return;
            }
        }

        await logger.logMessageUpdate(oldMessage, newMessage);
    }
};
