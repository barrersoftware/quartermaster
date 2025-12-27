# Quartermaster - Pterodactyl Deployment

This branch is specifically configured for deployment via **Pterodactyl Panel**.

## 🚀 Quick Deploy with Pterodactyl

### For Server Administrators

1. **Import the Egg**
   - Download `egg-quartermaster.json` from this branch
   - In Pterodactyl admin panel, go to **Nests** → **Import Egg**
   - Upload `egg-quartermaster.json`
   - The egg will be added to the **Bots** nest (create if doesn't exist)

2. **Create Server**
   - Go to **Servers** → **Create New**
   - Select **Quartermaster Discord Bot** egg
   - Allocate resources:
     - **RAM**: Minimum 512MB, recommended 1GB
     - **CPU**: 50-100%
     - **Disk**: 1GB minimum
   - Assign port allocation (default: 4050 for web dashboard)

3. **Configure Bot**
   - Server will be created and ready for configuration
   - Users configure via Startup tab

### For Users

1. **Get Discord Bot Token**
   - Go to https://discord.com/developers/applications
   - Create new application or select existing
   - Go to **Bot** tab → **Token** → Copy

2. **Configure in Pterodactyl**
   - Go to your server's **Startup** tab
   - Fill in the following variables:
     - **Discord Bot Token**: Paste your token
     - **Command Prefix**: Default `!` (can change)
     - **Discord Client ID**: From OAuth2 tab in Discord app
     - **Discord Client Secret**: From OAuth2 tab in Discord app
     - **Dashboard URL**: Your panel's address (e.g., `https://panel.yourdomain.com:4050`)
     - **Callback URL**: Dashboard URL + `/callback`
     - **Session Secret**: Click "Generate" or use: `openssl rand -base64 32`

3. **Setup Discord OAuth2**
   - In Discord app → **OAuth2** → **Redirects**
   - Add: `https://your-panel-domain:4050/callback`
   - Save changes

4. **Start the Bot**
   - Click **Start** button
   - Bot will auto-install dependencies and start
   - Check console for "Bot is ready and serving" message

## ⚙️ Pterodactyl-Specific Features

### Auto-Updates
- Set **Auto Update** to `1` in Startup variables
- Bot pulls latest changes from GitHub on each restart
- Disable by setting to `0`

### Resource Management
- Pterodactyl tracks CPU, RAM, and disk usage
- Scale resources as needed in server settings

### Console Access
- Real-time log viewing in Pterodactyl console
- All bot output visible immediately

### File Management
- Access bot files via Pterodactyl file manager
- Edit `.env` directly if needed
- Database (`bot.db`) can be downloaded for backup

### Scheduled Tasks
- Use Pterodactyl's task scheduler
- Set up automatic restarts
- Schedule backups

## 📊 Port Configuration

**Primary Port (Web Dashboard):**
- Default: 4050
- Can be changed in allocation settings
- Update `DASHBOARD_URL` and `CALLBACK_URL` if changed

**Discord Bot:**
- No port needed (uses Discord Gateway)
- Only web dashboard needs open port

## 🗄️ Database

Quartermaster uses SQLite stored at `/home/container/bot.db`

**Backups:**
- Download via file manager before major updates
- Or set up automated backups via Pterodactyl tasks

## 🔄 Updating

### Automatic (Recommended)
1. Ensure **Auto Update** = `1`
2. Restart server
3. Latest changes pulled automatically

### Manual
1. Stop server
2. Use file manager or SFTP
3. Pull updates: `git pull`
4. Restart server

## 🆘 Troubleshooting

### Bot won't start
```
Check console for errors:
- "Invalid token" → Check Discord token is correct
- "Module not found" → Delete node_modules, restart (reinstalls)
- "EADDRINUSE" → Port already in use, change allocation
```

### Web dashboard not accessible
```
- Verify port 4050 is allocated
- Check firewall allows port 4050
- Ensure DASHBOARD_URL matches your domain:port
- Verify OAuth2 redirect URI in Discord app
```

### Database locked
```
- Stop server
- Wait 10 seconds
- Start server
If persists: Download bot.db backup, delete original, restart
```

### Auto-update not working
```
- Check AUTO_UPDATE = 1 in Startup
- Verify git is available in container
- Check console for git pull errors
```

## 🔧 Advanced Configuration

### Custom Node.js Version
Edit egg to use different Docker image:
- Node 18: `ghcr.io/parkervcp/yolks:nodejs_18` (default)
- Node 20: `ghcr.io/parkervcp/yolks:nodejs_20`
- Node 21: `ghcr.io/parkervcp/yolks:nodejs_21`

### Environment Variables
All settings in `.env` can be overridden via Startup variables in Pterodactyl.

### Resource Limits
**Minimum Requirements:**
- RAM: 512MB
- CPU: 50%
- Disk: 1GB

**Recommended for Large Servers (1000+ members):**
- RAM: 1-2GB
- CPU: 100%
- Disk: 2GB

## 📝 Example Allocation

```
Port Allocation:
- Primary: 4050 (Web Dashboard) - TCP

Environment:
- DISCORD_TOKEN: NzkzM...
- PREFIX: !
- CLIENT_ID: 793...
- CLIENT_SECRET: gH45j...
- DASHBOARD_URL: https://panel.example.com:4050
- CALLBACK_URL: https://panel.example.com:4050/callback
- SESSION_SECRET: xK9mN2pQ...
- AUTO_UPDATE: 1
```

## 🏴‍☠️ License

This software is **FREE** under the BarrerSoftware License (BSL).
- Cannot be sold
- Must remain free forever
- See [LICENSE](LICENSE) for details

## 🔗 Links

- Main Repository: https://github.com/barrersoftware/quartermaster
- Pterodactyl Panel: https://pterodactyl.io
- Documentation: See main branch README.md
- Support: GitHub Issues

---

**Deployed via Pterodactyl • Free Forever • Built by BarrerSoftware**
