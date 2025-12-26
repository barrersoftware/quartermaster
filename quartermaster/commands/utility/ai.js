const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ai',
    aliases: ['ask', 'chat'],
    description: 'Chat with local AI powered by Ollama',
    usage: '!ai <your question>',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('Usage: `!ai <your question>`\nExample: `!ai What is JavaScript?`');
        }

        const question = args.join(' ');
        
        // Show thinking indicator
        const thinkingMsg = await message.reply('🤔 Thinking...');

        try {
            // Call Ollama API
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:3b',
                    prompt: question,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error('Ollama API error');
            }

            const data = await response.json();
            const answer = data.response;

            // Split response if too long for Discord (2000 char limit)
            if (answer.length > 1900) {
                const chunks = answer.match(/[\s\S]{1,1900}/g) || [];
                
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🤖 AI Response')
                    .setDescription(chunks[0])
                    .setFooter({ text: 'Powered by Ollama (Local AI) • Free Forever' })
                    .setTimestamp();

                await thinkingMsg.edit({ content: null, embeds: [embed] });

                // Send remaining chunks
                for (let i = 1; i < chunks.length; i++) {
                    await message.channel.send(chunks[i]);
                }
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🤖 AI Response')
                    .setDescription(answer)
                    .setFooter({ text: 'Powered by Ollama (Local AI) • Free Forever' })
                    .setTimestamp();

                await thinkingMsg.edit({ content: null, embeds: [embed] });
            }
        } catch (error) {
            console.error('Ollama AI error:', error);
            await thinkingMsg.edit('❌ AI is currently unavailable. Please try again later.');
        }
    }
};
