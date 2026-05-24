#!/bin/bash

# Quartermaster .NET - Unix Startup Script

echo "========================================="
echo "  Quartermaster .NET - Startup"
echo "========================================="

# 1. Build check
echo "Checking build..."
dotnet build --configuration Release

if [ $? -ne 0 ]; then
    echo "Build failed! Please run './setup.sh' first or check for errors."
    exit 1
fi

# 2. Run Bot and Web in parallel
echo "Starting Bot and Web Dashboard..."

# Run Bot in background
dotnet run --project Quartermaster.Bot --configuration Release &
BOT_PID=$!

# Run Web in background
dotnet run --project Quartermaster.Web --configuration Release &
WEB_PID=$!

echo "Processes started."
echo "Bot PID: $BOT_PID"
echo "Web PID: $WEB_PID"
echo "Press Ctrl+C to stop both services."

# Trap SIGINT (Ctrl+C) to kill both processes on exit
trap "kill $BOT_PID $WEB_PID; exit" SIGINT

# Wait for both
wait
