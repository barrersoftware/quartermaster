# MEE6 Clone Bot Setup - bot.danielelliott.space

## ✅ DNS Configuration Complete

**Domain**: bot.danielelliott.space
**IP Address**: 144.217.180.227
**TTL**: 300 seconds
**Record Type**: A

The DNS has been configured and is now active. You can verify with:
```bash
dig bot.danielelliott.space
```

## 🤖 Bot Configuration

**Application ID**: 1453938006082982001
**Public Key**: e54fc76ea5f7aca446ac181a6b1dfb664627e4f38fd39234e815587212c5ca99
**Permission Integer**: 8 (Administrator)
**Dashboard Port**: 4050
**Bot Token**: ✅ Configured in .env

## 📋 Required Steps Before Starting Bot

### 1. Get Client Secret from Discord Portal

1. Go to: https://discord.com/developers/applications/1453938006082982001/oauth2
2. Under "Client Secret", click **"Reset Secret"** or **"Copy"**
3. Update `.env` file with the secret:
   ```bash
   nano /home/ssfdre38/mee6-clone/.env
   # Replace CLIENT_SECRET value
   ```

### 2. Configure OAuth2 Redirects

In Discord Developer Portal:
1. Go to OAuth2 section
2. Add this redirect URL:
   ```
   http://bot.danielelliott.space:4050/callback
   ```
3. Click **Save Changes**

### 3. Enable Bot Intents

In Discord Developer Portal > Bot section, enable these **Privileged Gateway Intents**:
- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

### 4. Install Dependencies

```bash
cd /home/ssfdre38/mee6-clone
npm install
```

### 5. Start the Bot

```bash
cd /home/ssfdre38/mee6-clone
npm start
```

## 🔗 Bot Invite URL

Use this URL to invite the bot to your Discord server (with Administrator permissions):

```
https://discord.com/api/oauth2/authorize?client_id=1453938006082982001&permissions=8&scope=bot
```

## 🌐 Web Dashboard

Once the bot is running, access the dashboard at:

```
http://bot.danielelliott.space:4050
```

**Note**: Currently configured for HTTP on port 4050. If you want to use HTTPS later, see the SSL/TLS section below.

## 🔒 SSL/TLS Setup (Recommended)

For production use with HTTPS, you'll need SSL certificates. You can get free ones from Let's Encrypt:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d bot.danielelliott.space
```

Then configure your bot to use HTTPS (or use a reverse proxy like nginx).

## 📝 Next Steps Summary

1. Get and add CLIENT_SECRET to `.env`
2. Add OAuth2 redirect URL `https://bot.danielelliott.space/callback` in Discord Portal
3. Enable required bot intents (Server Members, Message Content, Presence)
4. Start the service: `sudo systemctl start mee6-clone`
5. Check status: `sudo systemctl status mee6-clone`
6. Invite bot to your server using the invite URL above
7. Access dashboard at https://bot.danielelliott.space

## ✅ Production Setup Complete

- ✅ SSL Certificate installed (Let's Encrypt)
- ✅ Nginx reverse proxy configured
- ✅ Systemd service created and enabled
- ✅ Dependencies installed
- ✅ Auto-start on boot enabled

**For detailed production setup information, see PRODUCTION_SETUP.md**

## 🛠️ Troubleshooting

If the bot doesn't start:
- Check that all values in `.env` are correct
- Make sure you regenerated the bot token
- Verify the client secret is set
- Check that port 3000 is not already in use
- Review logs for error messages

## 📞 Support

For issues, check the main README.md or the bot logs.
