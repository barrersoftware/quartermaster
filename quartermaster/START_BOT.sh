#!/bin/bash
# Quick start script for MEE6 Clone Bot

echo "========================================="
echo "  MEE6 Clone Bot - Quick Start"
echo "========================================="
echo ""

# Check if CLIENT_SECRET is set
if grep -q "REPLACE_THIS_WITH_YOUR_CLIENT_SECRET" /home/ssfdre38/mee6-clone/.env; then
    echo "❌ ERROR: CLIENT_SECRET not configured!"
    echo ""
    echo "Please add your Discord Client Secret to .env:"
    echo "  nano /home/ssfdre38/mee6-clone/.env"
    echo ""
    echo "Get it from: https://discord.com/developers/applications/1453938006082982001/oauth2"
    echo ""
    exit 1
fi

echo "✅ Configuration check passed"
echo ""

# Start the service
echo "Starting mee6-clone service..."
sudo systemctl start mee6-clone

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "Service Status:"
sudo systemctl status mee6-clone --no-pager -l

echo ""
echo "========================================="
echo "  Bot Commands"
echo "========================================="
echo ""
echo "View logs:     sudo journalctl -u mee6-clone -f"
echo "Stop bot:      sudo systemctl stop mee6-clone"
echo "Restart bot:   sudo systemctl restart mee6-clone"
echo ""
echo "Dashboard:     https://bot.danielelliott.space"
echo "Invite URL:    https://discord.com/api/oauth2/authorize?client_id=1453938006082982001&permissions=8&scope=bot"
echo ""
echo "========================================="
