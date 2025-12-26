const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'embed',
    description: 'Create a custom embed message',
    usage: '!embed create\n!embed title <text>\n!embed description <text>\n!embed color <hex>\n!embed field <name> | <value>\n!embed send #channel',
    permissions: PermissionFlagsBits.ManageMessages,
    
    // Store embed drafts per user
    drafts: new Map(),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You need Manage Messages permission.');
        }

        if (args.length === 0) {
            return message.reply(
                'Usage:\n' +
                '`!embed create` - Start a new embed\n' +
                '`!embed title <text>` - Set embed title\n' +
                '`!embed description <text>` - Set description\n' +
                '`!embed color <hex>` - Set color (e.g., #5865F2)\n' +
                '`!embed field <name> | <value>` - Add a field\n' +
                '`!embed thumbnail <url>` - Set thumbnail image\n' +
                '`!embed image <url>` - Set large image\n' +
                '`!embed send #channel` - Send the embed\n' +
                '`!embed preview` - Preview your embed'
            );
        }

        const action = args[0].toLowerCase();
        const userId = message.author.id;

        switch (action) {
            case 'create':
                this.drafts.set(userId, new EmbedBuilder().setColor('#5865F2'));
                return message.reply('✅ New embed created! Use `!embed` commands to customize it.');

            case 'title':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                const title = args.slice(1).join(' ');
                this.drafts.get(userId).setTitle(title);
                return message.reply(`✅ Title set to: "${title}"`);

            case 'description':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                const description = args.slice(1).join(' ');
                this.drafts.get(userId).setDescription(description);
                return message.reply('✅ Description set!');

            case 'color':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                const color = args[1];
                if (!color || !color.match(/^#[0-9A-F]{6}$/i)) {
                    return message.reply('❌ Invalid color! Use hex format like #5865F2');
                }
                this.drafts.get(userId).setColor(color);
                return message.reply(`✅ Color set to ${color}`);

            case 'field':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                const fieldText = args.slice(1).join(' ');
                const [fieldName, fieldValue] = fieldText.split('|').map(s => s.trim());
                if (!fieldName || !fieldValue) {
                    return message.reply('❌ Use format: `!embed field Name | Value`');
                }
                this.drafts.get(userId).addFields({ name: fieldName, value: fieldValue, inline: false });
                return message.reply('✅ Field added!');

            case 'thumbnail':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                this.drafts.get(userId).setThumbnail(args[1]);
                return message.reply('✅ Thumbnail set!');

            case 'image':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                this.drafts.get(userId).setImage(args[1]);
                return message.reply('✅ Image set!');

            case 'preview':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                await message.channel.send({ embeds: [this.drafts.get(userId)] });
                return message.reply('👆 Preview of your embed');

            case 'send':
                if (!this.drafts.has(userId)) {
                    return message.reply('❌ Create an embed first with `!embed create`');
                }
                const channel = message.mentions.channels.first();
                if (!channel) {
                    return message.reply('❌ Mention a channel: `!embed send #channel`');
                }
                try {
                    await channel.send({ embeds: [this.drafts.get(userId)] });
                    this.drafts.delete(userId);
                    return message.reply(`✅ Embed sent to ${channel}!`);
                } catch (error) {
                    return message.reply('❌ Failed to send embed to that channel.');
                }

            default:
                return message.reply('❌ Unknown action. Use `!embed` to see available commands.');
        }
    }
};
