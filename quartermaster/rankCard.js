const { Jimp } = require('jimp');
const path = require('path');

async function createRankCard(data) {
    const { username, level, rank, currentXp, requiredXp, avatarUrl, color } = data;

    // Create a canvas-like background (900x250)
    const image = new Jimp({ width: 900, height: 250, color: 0x23272Aff });
    const themeColor = color ? parseInt(color.replace('#', ''), 16) * 256 + 0xFF : 0x5865F2ff;

    // Load avatar
    let avatar;
    try {
        avatar = await Jimp.read(avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png');
        avatar.resize({ width: 180, height: 180 });
        
        // Circular avatar mask
        const mask = new Jimp({ width: 180, height: 180, color: 0x00000000 });
        // Draw a circle
        for (let x = 0; x < 180; x++) {
            for (let y = 0; y < 180; y++) {
                const dist = Math.sqrt(Math.pow(x - 90, 2) + Math.pow(y - 90, 2));
                if (dist < 90) {
                    mask.setPixelColor(0xffffffff, x, y);
                }
            }
        }
        avatar.mask(mask);
    } catch (e) {
        console.error('Failed to load avatar:', e);
    }

    if (avatar) {
        image.composite(avatar, 40, 35);
    }

    // Draw progress bar background
    const barWidth = 600;
    const barHeight = 40;
    const barX = 260;
    const barY = 160;

    // Background bar (darker)
    const barBg = new Jimp({ width: barWidth, height: barHeight, color: 0x484B4Eff });
    image.composite(barBg, barX, barY);

    // Progress bar (blue/purple)
    const progress = Math.min(currentXp / requiredXp, 1);
    if (progress > 0) {
        const progressFill = new Jimp({ width: Math.floor(barWidth * progress), height: barHeight, color: themeColor });
        image.composite(progressFill, barX, barY);
    }

    // Load fonts
    const fontBig = Jimp.FONT_SANS_32_WHITE;
    const fontSmall = Jimp.FONT_SANS_16_WHITE;

    // Username
    image.print({ font: fontBig, x: 260, y: 60, text: username });

    // Level and Rank
    image.print({ font: fontSmall, x: 260, y: 110, text: `RANK #${rank}  |  LEVEL ${level}` });

    // XP Text
    image.print({ font: fontSmall, x: 700, y: 110, text: `${currentXp} / ${requiredXp} XP` });

    return await image.getBuffer('image/png');
}

module.exports = { createRankCard };
