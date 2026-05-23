const { Jimp } = require('jimp');
const path = require('path');

async function createWelcomeCard(data) {
    const { username, serverName, memberCount, avatarUrl } = data;

    // Create background (1024x450)
    const image = new Jimp({ width: 1024, height: 450, color: 0x23272Aff });

    // Load avatar
    let avatar;
    try {
        avatar = await Jimp.read(avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png');
        avatar.resize({ width: 250, height: 250 });
        
        // Circular mask
        const mask = new Jimp({ width: 250, height: 250, color: 0x00000000 });
        for (let x = 0; x < 250; x++) {
            for (let y = 0; y < 250; y++) {
                const dist = Math.sqrt(Math.pow(x - 125, 2) + Math.pow(y - 125, 2));
                if (dist < 125) mask.setPixelColor(0xffffffff, x, y);
            }
        }
        avatar.mask(mask);
    } catch (e) {
        console.error('Failed to load avatar:', e);
    }

    if (avatar) {
        image.composite(avatar, (1024 - 250) / 2, 50);
    }

    // Load fonts
    const fontBig = Jimp.FONT_SANS_64_WHITE;
    const fontSmall = Jimp.FONT_SANS_32_WHITE;

    // Welcome Text
    const welcomeText = "WELCOME";
    image.print({
        font: fontBig,
        x: 0,
        y: 320,
        text: { text: welcomeText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
        maxWidth: 1024
    });

    // Username
    image.print({
        font: fontSmall,
        x: 0,
        y: 380,
        text: { text: `${username}  |  Member #${memberCount}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
        maxWidth: 1024
    });

    return await image.getBuffer('image/png');
}

module.exports = { createWelcomeCard };
