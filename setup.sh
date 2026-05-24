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
    Linux*)     DISTRO=$(lsb_release -i | cut -f 2-);;
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
                    sudo apt-get update && sudo apt-get install -y dotnet-sdk-8.0
                    ;;
                fedora)
                    sudo dnf install -y dotnet-sdk-8.0
                    ;;
                centos|rhel)
                    sudo yum install -y dotnet-sdk-8.0
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

# 2. Build the solution
echo "Restoring and building Quartermaster..."
dotnet build --configuration Release

echo "========================================="
echo "  Setup Complete!"
echo "  1. Edit 'appsettings.json' with your tokens."
echo "  2. Run './start.sh' to launch."
echo "========================================="
