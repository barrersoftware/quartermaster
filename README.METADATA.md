# Social Media Cards & Web App Metadata

Quartermaster now includes proper metadata for sharing and web app installation.

## 📸 Open Graph / Social Media Cards

When Quartermaster is shared on social media, it displays a beautiful card with:
- Title: "Quartermaster - The ONE Discord Bot You Need"
- Description: Features and free forever messaging
- Image: Custom OG image (add your own at `/web/public/images/og-image.png`)
- Proper Twitter card support

**Supported platforms:**
- Discord link previews
- Twitter/X cards
- Facebook Open Graph
- LinkedIn previews
- Slack unfurls

## 📱 Progressive Web App (PWA)

Quartermaster's web dashboard can be installed as a PWA:

### Features
- **Install to home screen** on mobile and desktop
- **Offline support** (coming soon)
- **App shortcuts** for quick access to dashboard and leaderboard
- **Standalone display** - runs like a native app
- **Theme color** matches Discord branding (#5865F2)

### Installation

**Desktop (Chrome/Edge):**
1. Visit the dashboard
2. Look for install icon in address bar
3. Click "Install Quartermaster"

**Mobile (Android):**
1. Visit the dashboard in Chrome
2. Tap menu (3 dots)
3. Tap "Add to Home screen"

**Mobile (iOS):**
1. Visit the dashboard in Safari
2. Tap share button
3. Tap "Add to Home Screen"

## 🎨 Required Images

For full PWA and social media support, add these images to `/web/public/images/`:

```
images/
├── icon-32.png      (32x32)   - Browser favicon
├── icon-180.png     (180x180) - iOS home screen
├── icon-192.png     (192x192) - Android home screen
├── icon-512.png     (512x512) - Android splash screen
└── og-image.png     (1200x630)- Social media preview
```

**Quick generate icons:**
```bash
# Create a simple icon using ImageMagick
convert -size 512x512 xc:'#5865F2' \
  -gravity center -pointsize 200 -fill white \
  -annotate +0+0 '🏴‍☠️' \
  icon-512.png

# Resize for other sizes
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 180x180 icon-180.png
convert icon-512.png -resize 32x32 icon-32.png

# Create OG image
convert -size 1200x630 xc:'#5865F2' \
  -gravity center -pointsize 80 -fill white \
  -annotate +0-100 '🏴‍☠️ Quartermaster' \
  -pointsize 40 \
  -annotate +0+50 'The ONE Discord Bot You Need' \
  -pointsize 30 \
  -annotate +0+150 'FREE Forever' \
  og-image.png
```

## 🔍 Testing

**Test Open Graph tags:**
- Discord: Paste your URL in any channel
- Twitter: https://cards-dev.twitter.com/validator
- Facebook: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/

**Test PWA:**
- Chrome DevTools → Application → Manifest
- Lighthouse audit for PWA score

## 📝 Customization

**Update manifest.json:**
```json
{
  "name": "Your Bot Name",
  "theme_color": "#YourColor",
  "start_url": "/your-start-page"
}
```

**Update meta tags in index.ejs:**
- Change URLs to your domain
- Update descriptions
- Add your own OG image

## 🏴‍☠️ BarrerSoftware

Makes your dashboard shareable and installable.  
Professional presentation for free software.
