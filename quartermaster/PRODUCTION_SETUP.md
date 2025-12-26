# Production Setup Complete - bot.danielelliott.space

## ✅ What's Been Configured

### 1. DNS Configuration
- **Domain**: bot.danielelliott.space
- **A Record**: 144.217.180.227 (TTL: 300)
- **Status**: ✅ Active

### 2. SSL Certificate (Let's Encrypt)
- **Certificate**: /etc/letsencrypt/live/bot.danielelliott.space/fullchain.pem
- **Private Key**: /etc/letsencrypt/live/bot.danielelliott.space/privkey.pem
- **Expires**: 2026-03-26
- **Auto-Renewal**: ✅ Enabled via certbot

### 3. Nginx Reverse Proxy
- **Config File**: /etc/nginx/sites-available/bot.danielelliott.space.conf
- **HTTP**: Redirects to HTTPS
- **HTTPS**: Proxies to localhost:4050
- **Features**:
  - SSL/TLS encryption
  - Security headers
  - WebSocket support
  - HTTP/2 enabled

### 4. Systemd Service
- **Service Name**: mee6-clone.service
- **Location**: /etc/systemd/system/mee6-clone.service
- **User**: ssfdre38
- **Working Directory**: /home/ssfdre38/mee6-clone
- **Auto-Start**: ✅ Enabled

### 5. Bot Configuration
- **Application ID**: 1453938006082982001
- **Internal Port**: 4050
- **External URL**: https://bot.danielelliott.space
- **Dependencies**: ✅ Installed

## 🚀 Starting the Bot

### Before First Start

**⚠️ REQUIRED: Add Client Secret**

1. Go to Discord Developer Portal:
   ```
   https://discord.com/developers/applications/1453938006082982001/oauth2
   ```

2. Copy your **Client Secret**

3. Edit the .env file:
   ```bash
   nano /home/ssfdre38/mee6-clone/.env
   ```

4. Replace this line:
   ```
   CLIENT_SECRET=REPLACE_THIS_WITH_YOUR_CLIENT_SECRET_FROM_DISCORD_PORTAL
   ```
   With your actual client secret:
   ```
   CLIENT_SECRET=your_actual_secret_here
   ```

5. Save and exit (Ctrl+X, Y, Enter)

**⚠️ REQUIRED: Configure OAuth2 Redirect**

In Discord Developer Portal > OAuth2:
- Add redirect URL: `https://bot.danielelliott.space/callback`
- Click **Save Changes**

**⚠️ REQUIRED: Enable Bot Intents**

In Discord Developer Portal > Bot:
- ✅ Server Members Intent
- ✅ Message Content Intent
- ✅ Presence Intent
- Click **Save Changes**

### Start the Service

```bash
sudo systemctl start mee6-clone
```

### Check Status

```bash
sudo systemctl status mee6-clone
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u mee6-clone -f

# Last 100 lines
sudo journalctl -u mee6-clone -n 100

# Logs since today
sudo journalctl -u mee6-clone --since today
```

## 🔧 Service Management Commands

```bash
# Start the bot
sudo systemctl start mee6-clone

# Stop the bot
sudo systemctl stop mee6-clone

# Restart the bot
sudo systemctl restart mee6-clone

# Check status
sudo systemctl status mee6-clone

# Enable auto-start (already done)
sudo systemctl enable mee6-clone

# Disable auto-start
sudo systemctl disable mee6-clone

# Reload after editing .env
sudo systemctl restart mee6-clone
```

## 🌐 Accessing Your Bot

### Web Dashboard
```
https://bot.danielelliott.space
```

### Bot Invite URL
```
https://discord.com/api/oauth2/authorize?client_id=1453938006082982001&permissions=8&scope=bot
```

## 📝 Quick Start Checklist

- [ ] Add CLIENT_SECRET to `/home/ssfdre38/mee6-clone/.env`
- [ ] Add OAuth2 redirect `https://bot.danielelliott.space/callback` in Discord Portal
- [ ] Enable Server Members, Message Content, and Presence intents
- [ ] Start service: `sudo systemctl start mee6-clone`
- [ ] Check status: `sudo systemctl status mee6-clone`
- [ ] Invite bot to your server
- [ ] Access dashboard at https://bot.danielelliott.space

## 🔒 SSL Certificate Renewal

Certbot automatically renews certificates. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📁 Important File Locations

```
/home/ssfdre38/mee6-clone/.env                    # Bot configuration
/home/ssfdre38/mee6-clone/config.json            # Bot settings
/home/ssfdre38/mee6-clone/bot.db                 # SQLite database
/etc/systemd/system/mee6-clone.service           # Systemd service
/etc/nginx/sites-available/bot.danielelliott.space.conf  # Nginx config
/etc/letsencrypt/live/bot.danielelliott.space/   # SSL certificates
/var/log/nginx/bot.danielelliott.space.*.log     # Nginx logs
```

## 🛠️ Troubleshooting

### Bot won't start

```bash
# Check logs for errors
sudo journalctl -u mee6-clone -n 50

# Common issues:
# 1. CLIENT_SECRET not set in .env
# 2. Invalid bot token
# 3. Port 4050 already in use
```

### Dashboard not accessible

```bash
# Check nginx status
sudo systemctl status nginx

# Check bot is running
sudo systemctl status mee6-clone

# Check if port 4050 is listening
sudo netstat -tlnp | grep 4050

# Test nginx config
sudo nginx -t
```

### OAuth2 errors

- Verify redirect URL matches exactly: `https://bot.danielelliott.space/callback`
- Check CLIENT_ID and CLIENT_SECRET are correct
- Ensure bot intents are enabled

### Database errors

```bash
# Check database file permissions
ls -la /home/ssfdre38/mee6-clone/bot.db

# Fix permissions if needed
sudo chown ssfdre38:ssfdre38 /home/ssfdre38/mee6-clone/bot.db
```

## 🔄 Updating the Bot

```bash
# Stop the service
sudo systemctl stop mee6-clone

# Pull updates (if using git)
cd /home/ssfdre38/mee6-clone
# git pull

# Install/update dependencies
npm install

# Restart service
sudo systemctl start mee6-clone
```

## 📊 Monitoring

### Check if bot is online

```bash
# Service status
sudo systemctl is-active mee6-clone

# Process check
pgrep -f "node index.js"

# Port check
sudo netstat -tlnp | grep :4050
```

### Performance monitoring

```bash
# Resource usage
sudo systemctl status mee6-clone

# Memory usage
ps aux | grep "node index.js"
```

## 🔐 Security Notes

- Bot token is stored in `.env` - keep this file secure
- SSL certificate auto-renews every 60 days
- Nginx provides additional security headers
- Service runs as user `ssfdre38` (not root)
- Bot has restricted filesystem access

## 📞 Support

- Bot Commands: Use `!help` in Discord
- Web Dashboard: https://bot.danielelliott.space
- Service Logs: `sudo journalctl -u mee6-clone -f`

---

**Setup completed on**: 2025-12-26
**Bot Version**: MEE6 Clone v1.0.0
**Node.js**: $(node --version)
