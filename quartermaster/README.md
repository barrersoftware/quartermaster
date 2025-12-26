# MEE6 Clone Discord Bot

A feature-rich Discord bot inspired by MEE6, built with discord.js and SQLite. Includes leveling system, moderation tools, custom commands, and welcome/leave messages.

## Features

### Leveling System
- Automatic XP gain from chatting
- Customizable XP rewards and cooldowns
- Level-up announcements
- Role rewards for reaching specific levels
- Rank and leaderboard commands

### Moderation
- Ban and kick members
- Mute/unmute with timeout system
- Warning system with history tracking
- Clear warnings for users
- Moderation logs with embeds

### Raid Protection
- Real-time join monitoring and raid detection
- Configurable thresholds (users/time window)
- Multiple response actions (alert, kick, ban, lockdown)
- Server lockdown mode for severe raids
- Automatic incident logging and history
- Alert notifications to designated channel

### Custom Commands
- Create custom text commands
- List all custom commands
- Easy management with add/remove functionality

### Welcome & Leave Messages
- Customizable welcome messages with embeds
- Leave notifications
- Support for placeholders (user, server, member count)

### Web Dashboard
- User-friendly web interface for bot configuration
- Discord OAuth2 authentication
- Manage leveling settings and role rewards
- View server leaderboards
- Create and manage custom commands
- Configure welcome/leave messages
- View moderation logs and warnings
- Configure raid protection and view incident history

## Installation

### Prerequisites
- Node.js 16.9.0 or higher
- A Discord bot token ([Create one here](https://discord.com/developers/applications))

### Setup Steps

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   cd mee6-clone
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and configure:
     ```
     # Discord Bot Token
     DISCORD_TOKEN=your_bot_token_here

     # Bot Configuration
     PREFIX=!

     # Web Dashboard Configuration
     CLIENT_ID=your_client_id_here
     CLIENT_SECRET=your_client_secret_here
     CALLBACK_URL=http://localhost:3000/callback
     SESSION_SECRET=your_random_session_secret_here
     DASHBOARD_URL=http://localhost:3000
     PORT=3000
     ```

   **Getting OAuth2 Credentials:**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Copy the **Application ID** and paste it as `CLIENT_ID`
   - Go to the OAuth2 section and reset/copy the **Client Secret** and paste it as `CLIENT_SECRET`
   - Add `http://localhost:3000/callback` to the **Redirects** list in OAuth2 settings
   - Generate a random string for `SESSION_SECRET` (you can use a password generator)

4. **Configure bot settings** (optional)
   - Edit `config.json` to customize:
     - XP gain amounts and cooldown
     - Level-up messages
     - Role rewards
     - Welcome/leave messages
     - Embed colors

5. **Invite the bot to your server**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot`
   - Select bot permissions:
     - Send Messages
     - Embed Links
     - Read Message History
     - Ban Members
     - Kick Members
     - Moderate Members (for timeout/mute)
     - Manage Roles
   - Copy the generated URL and open it in your browser to invite the bot

6. **Start the bot**
   ```bash
   npm start
   ```

   The bot will start and the web dashboard will be available at `http://localhost:3000`

7. **Access the web dashboard**
   - Open your browser and go to `http://localhost:3000`
   - Click "Login with Discord"
   - Authorize the application
   - Select a server to manage

## Web Dashboard

The web dashboard provides a user-friendly interface to configure all bot settings:

- **Homepage**: View all servers where you have Manage Server permission
- **Server Dashboard**: Overview of all modules and quick access
- **Leveling**: Configure XP rates, cooldowns, level-up messages, and role rewards
- **Leaderboard**: View top members by level and XP
- **Custom Commands**: Add, remove, and manage custom commands
- **Welcome & Leave**: Configure welcome and leave messages with channel selection
- **Moderation**: View warning history and moderation logs

All changes made through the dashboard take effect immediately without restarting the bot.

## Configuration

### Role Rewards
Edit `config.json` to add role rewards:
```json
"roleRewards": {
  "5": "Level 5",
  "10": "Level 10",
  "20": "Level 20"
}
```

### Welcome Messages
Enable welcome messages in `config.json`:
```json
"welcome": {
  "enabled": true,
  "channelName": "welcome",
  "message": "Welcome {user} to {server}!",
  "embedColor": "#5865F2"
}
```

Available placeholders:
- `{user}` - Mentions the user
- `{server}` - Server name
- `{memberCount}` - Total member count

## Commands

### Leveling Commands
- `!rank [@user]` - View rank and XP
- `!leaderboard [limit]` - View server leaderboard (max 25)

### Moderation Commands
All moderation commands require appropriate permissions.

- `!ban @user [reason]` - Ban a member
- `!kick @user [reason]` - Kick a member
- `!mute @user <minutes> [reason]` - Mute a member with timeout
- `!unmute @user` - Unmute a member
- `!warn @user <reason>` - Warn a member
- `!warnings [@user]` - View warnings for a user
- `!clearwarnings @user` - Clear all warnings (Admin only)

### Raid Protection Commands
Requires Administrator permission.

- `!raidprotection enable` - Enable raid protection
- `!raidprotection disable` - Disable raid protection
- `!raidprotection status` - View current status and lockdown info
- `!raidprotection config` - View current configuration
- `!raidlogs [limit]` - View recent raid incidents (max 25)
- `!endlockdown` - Manually end server lockdown

### Custom Commands
Requires Manage Server permission.

- `!addcommand <name> <response>` - Create a custom command
- `!removecommand <name>` - Delete a custom command
- `!listcommands` - List all custom commands

### Other Commands
- `!help [command]` - Show help information

## Permissions Setup

The bot needs the following permissions:
- **Read Messages/View Channels** - To see messages
- **Send Messages** - To respond
- **Embed Links** - To send rich embeds
- **Ban Members** - For ban command
- **Kick Members** - For kick command
- **Moderate Members** - For mute/timeout
- **Manage Roles** - For role rewards (bot role must be above reward roles)

## Database

The bot uses SQLite with `better-sqlite3` for data persistence. The database file (`bot.db`) is created automatically on first run.

### Tables
- `users` - Stores user XP and levels
- `custom_commands` - Stores server custom commands
- `warnings` - Stores moderation warnings
- `guild_settings` - Stores server-specific settings

## Raid Protection

The raid protection system automatically detects and responds to server raids (mass joins with malicious intent).

### How It Works

1. **Monitoring**: Tracks all member joins in real-time
2. **Detection**: Analyzes join patterns based on configurable thresholds
3. **Alert**: Sends notifications to designated channel when raid is detected
4. **Response**: Automatically takes configured action

### Configuration Options

**Join Threshold**: Number of users that must join to trigger detection (default: 5)
**Time Window**: Period in seconds to monitor joins (default: 10s)
**Action**: What to do when raid is detected:
- `alert` - Only send notification, no action taken
- `kick` - Kick all users who joined during the raid
- `ban` - Ban all users who joined during the raid
- `lockdown` - Enable server lockdown mode

**Lockdown Duration**: How long to keep server in lockdown (default: 300s)
**Alert Channel**: Channel to receive raid alerts

### Lockdown Mode

When lockdown is activated:
- All new joins are automatically kicked
- Users receive a DM explaining the lockdown
- Lockdown automatically expires after configured duration
- Admins can manually end lockdown with `!endlockdown`

### Configuration

Configure raid protection via:
- **Web Dashboard**: `/dashboard/server/{id}/raid`
- **Discord Commands**: `!raidprotection enable/disable/status/config`

### Example Scenario

**Settings**: 5 joins in 10 seconds, action = kick
**Event**: 7 users join within 8 seconds
**Result**:
1. Raid detected alert sent to alert channel
2. All 7 users are kicked
3. Incident logged in database
4. Viewable in `!raidlogs` and dashboard

## Troubleshooting

### Bot doesn't respond to commands
- Make sure the bot has the "Read Message Content" intent enabled in the Developer Portal
- Check that the bot has permission to send messages in the channel
- Verify the correct prefix is being used

### Role rewards not working
- Ensure the bot's role is higher than the reward roles in the server settings
- Check that role names in `config.json` match exactly

### Welcome messages not showing
- Set `"enabled": true` in `config.json`
- Create a channel named "welcome" (or whatever you set in config)
- Ensure the bot has permission to send messages in that channel

## Project Structure

```
mee6-clone/
├── commands/
│   ├── moderation/     # Moderation commands
│   ├── leveling/       # Leveling commands
│   ├── custom/         # Custom command management
│   └── help.js         # Help command
├── events/             # Event handlers
│   ├── ready.js
│   ├── messageCreate.js
│   ├── guildMemberAdd.js
│   └── guildMemberRemove.js
├── database.js         # Database functions
├── index.js            # Main bot file
├── config.json         # Bot configuration
├── package.json
└── README.md
```

## Support

For issues or questions, please open an issue on the GitHub repository.

## License

MIT License - Feel free to modify and use for your own projects!
