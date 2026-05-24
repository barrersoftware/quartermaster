#!/bin/bash

# Quartermaster .NET - Unix Setup Script (Linux/macOS)
# Supports: Ubuntu, Debian, CentOS, Fedora, Arch, and macOS (Homebrew)

set -e

echo "========================================="
echo "  Quartermaster .NET - Unix Setup"
echo "========================================="

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     DISTRO=$(lsb_release -i | cut -f 2- 2>/dev/null || echo "Linux");;
    Darwin*)    DISTRO="macOS";;
    *)          DISTRO="UNKNOWN"
esac

echo "Detected OS: ${OS} (${DISTRO})"

# 1. Install .NET SDK if missing
if ! command -v dotnet &> /dev/null; then
    echo ".NET SDK not found. Attempting to install..."
    
    if [[ "$OS" == "Darwin" ]]; then
        if ! command -v brew &> /dev/null; then
            echo "Homebrew not found. Please install it or manually install .NET SDK from: https://dotnet.microsoft.com/download"
            exit 1
        fi
        brew install --cask dotnet-sdk
    else
        # Linux detection and installation
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            case "$ID" in
                ubuntu|debian)
                    sudo apt-get update && sudo apt-get install -y dotnet-sdk-10.0
                    ;;
                fedora)
                    sudo dnf install -y dotnet-sdk-10.0
                    ;;
                centos|rhel)
                    sudo yum install -y dotnet-sdk-10.0
                    ;;
                arch)
                    sudo pacman -S --noconfirm dotnet-sdk
                    ;;
                *)
                    echo "Unsupported Linux distro. Please install .NET SDK manually: https://learn.microsoft.com/en-us/dotnet/core/install/linux"
                    exit 1
                    ;;
            esac
        fi
    fi
else
    echo ".NET SDK is already installed: $(dotnet --version)"
fi

# 2. Build and Publish
echo "Restoring and publishing Quartermaster..."
dotnet publish Quartermaster.Bot/Quartermaster.Bot.csproj --configuration Release --output ./publish
dotnet publish Quartermaster.Web/Quartermaster.Web.csproj --configuration Release --output ./publish

# 3. Configuration Phase
echo ""
echo "--- Configuration Phase ---"
echo "You will need your Discord Application credentials."
echo "Get them here: https://discord.com/developers/applications"
echo ""

read -p "Enter your Discord Bot Token: " bot_token
read -p "Enter your Client ID (Application ID): " client_id
read -p "Enter your Client Secret: " client_secret
read -p "Enter your Dashboard URL (Default: http://localhost:3000): " dashboard_url
read -p "Enter your Dashboard Port (Default: 3000): " port
read -p "Enter your Database Path (Default: ./bot.db): " db_path

# Use python3 to update JSON safely without jq dependency
python3 -c "
import json, sys
with open('appsettings.json', 'r') as f:
    config = json.load(f)
if '$bot_token': config['Bot']['Token'] = '$bot_token'
if '$client_id': config['Discord']['ClientId'] = '$client_id'
if '$client_secret': config['Discord']['ClientSecret'] = '$client_secret'
if '$dashboard_url': 
    config['Discord']['DashboardUrl'] = '$dashboard_url'
else:
    config['Discord']['DashboardUrl'] = 'http://localhost:3000'

if '$port':
    config['Discord']['Port'] = int('$port')
else:
    config['Discord']['Port'] = 3000

if '$db_path':
    config['Bot']['DatabasePath'] = '$db_path'
else:
    config['Bot']['DatabasePath'] = './bot.db'

# Auto-set CallbackUrl
config['Discord']['CallbackUrl'] = config['Discord']['DashboardUrl'].rstrip('/') + '/callback'

with open('appsettings.json', 'w') as f:
    json.dump(config, f, indent=2)
"

echo "✅ Configuration saved to appsettings.json"

# 4. Optional: Install as systemd service (Linux only)
if [[ "$OS" == "Linux" ]]; then
    read -p "Would you like to install Quartermaster as a systemd service? (Y/N): " install_service
    if [[ "$install_service" == "Y" || "$install_service" == "y" ]]; then
        USER_NAME=$(whoami)
        CUR_DIR=$(pwd)
        
        echo "Creating systemd service files..."
        
        # Bot Service
        cat <<EOF | sudo tee /etc/systemd/system/quartermaster-bot.service
[Unit]
Description=Quartermaster Discord Bot
After=network.target

[Service]
Type=notify
WorkingDirectory=$CUR_DIR/publish
ExecStart=$CUR_DIR/publish/Quartermaster.Bot --contentRoot $CUR_DIR
User=$USER_NAME
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        # Web Service
        cat <<EOF | sudo tee /etc/systemd/system/quartermaster-web.service
[Unit]
Description=Quartermaster Web Dashboard
After=network.target

[Service]
Type=notify
WorkingDirectory=$CUR_DIR/publish
ExecStart=$CUR_DIR/publish/Quartermaster.Web --contentRoot $CUR_DIR
User=$USER_NAME
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        echo "✅ systemd services created. Use 'sudo systemctl start quartermaster-bot' to launch."
    fi
fi

echo "========================================="
echo "  Setup Complete!"
echo "  1. Edit 'appsettings.json' with your tokens."
echo "  2. Run './start.sh' to launch manually or use systemctl."
echo "========================================="
