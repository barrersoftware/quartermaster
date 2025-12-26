# Web Dashboard Setup Guide

This guide will help you set up the web dashboard for your MEE6 Clone bot.

## Prerequisites

Before setting up the web dashboard, make sure you have:
- The Discord bot already created in the Discord Developer Portal
- Node.js installed on your system
- The bot dependencies installed (`npm install`)

## Step-by-Step Setup

### 1. Configure OAuth2 in Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to the **OAuth2** section in the sidebar

### 2. Get Your Client ID and Secret

1. On the OAuth2 page, you'll see your **Client ID** at the top - copy this
2. Under **Client Secret**, click **Reset Secret** (or **Copy** if you already have one)
3. Copy the client secret (you won't be able to see it again after closing)

### 3. Add Redirect URL

1. Still in the OAuth2 section, scroll down to **Redirects**
2. Click **Add Redirect**
3. Enter: `http://localhost:3000/callback`
4. Click **Save Changes**

### 4. Configure Environment Variables

1. Open your `.env` file in the bot's root directory
2. Add/update these values:

```env
# Your bot token (already configured)
DISCORD_TOKEN=your_bot_token_here
PREFIX=!

# Web Dashboard Configuration (NEW)
CLIENT_ID=paste_your_client_id_here
CLIENT_SECRET=paste_your_client_secret_here
CALLBACK_URL=http://localhost:3000/callback
SESSION_SECRET=generate_a_random_string_here
DASHBOARD_URL=http://localhost:3000
PORT=3000
```

**Important:** Generate a secure random string for `SESSION_SECRET`. You can use:
- An online password generator
- Or run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 5. Start the Bot

```bash
npm start
```

You should see:
```
Logged in as YourBot#1234
Bot is ready and serving X servers
Dashboard running on http://localhost:3000
```

### 6. Access the Dashboard

1. Open your browser
2. Go to `http://localhost:3000`
3. Click **Login with Discord**
4. Authorize the application (first time only)
5. You'll be redirected to the dashboard

## Dashboard Features

### Server Selection
- View all servers where you have "Manage Server" permission
- Servers with the bot show "Bot Added" badge
- Servers without the bot show an "Add Bot" button

### Leveling Configuration
- Enable/disable leveling system
- Configure XP gain (min/max per message)
- Set XP cooldown period
- Customize level-up messages
- Add/remove role rewards for specific levels

### Custom Commands
- Add new custom commands with responses
- View all existing commands
- Delete commands you no longer need

### Welcome & Leave Messages
- Enable/disable welcome messages
- Select which channel to post in
- Customize welcome message text
- Choose embed color
- Same options for leave messages
- Use placeholders: `{user}`, `{server}`, `{memberCount}`

### Leaderboard
- View top 100 members by level
- See total XP for each member
- Top 3 ranks highlighted with medals

### Moderation Logs
- View all warnings issued
- See who warned whom and why
- Check warning timestamps

## Deployment (Production)

When deploying to production (e.g., Heroku, Railway, VPS):

1. Update your `.env` with production URLs:
```env
CALLBACK_URL=https://yourdomain.com/callback
DASHBOARD_URL=https://yourdomain.com
PORT=3000
```

2. Add the new callback URL to Discord Developer Portal:
   - `https://yourdomain.com/callback`

3. Make sure to use environment variables on your hosting platform
4. Never commit your `.env` file to version control

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the callback URL in `.env` exactly matches what's in Discord Developer Portal
- Check for trailing slashes (there shouldn't be any)

### Dashboard not loading after login
- Check that `SESSION_SECRET` is set in `.env`
- Clear your browser cookies for localhost
- Make sure the bot is running

### "Bot not in guild" message
- Make sure the bot has been invited to the server
- Check that the bot has the proper permissions
- Verify the bot is online

### Changes not taking effect
- Some changes require reloading the config
- For role rewards, make sure the bot's role is higher than the reward roles
- Check the bot console for any error messages

## Security Notes

- **Never share your Client Secret** - treat it like a password
- **Never commit `.env`** to version control (it's in `.gitignore`)
- **Change SESSION_SECRET** in production to a secure random string
- Only users with "Manage Server" permission can access the dashboard
- The bot validates permissions on every request

## Support

If you encounter issues:
1. Check the bot console for error messages
2. Verify all environment variables are set correctly
3. Make sure OAuth2 settings match in Discord Developer Portal
4. Check that you have the required permissions in Discord
