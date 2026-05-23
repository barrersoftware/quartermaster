const logger = require('../logger');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        // Handle partial messages (messages sent before bot started)
        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                console.error('Error fetching partial message:', error);
                return;
            }
        }

        await logger.logMessageDelete(message);
    }
};
