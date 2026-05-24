# Quartermaster .NET - Windows Setup Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Quartermaster .NET - Windows Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check for .NET SDK
Write-Host "Checking for .NET SDK..."
$dotnetVersion = dotnet --version 2>$null

if ($null -eq $dotnetVersion) {
    Write-Host "❌ .NET SDK not found!" -ForegroundColor Red
    Write-Host "Quartermaster requires the .NET 8.0 SDK or later."
    
    # Check if winget is available for automated install
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $confirm = Read-Host "Would you like to attempt installation via winget? (Y/N)"
        if ($confirm -eq "Y") {
            Write-Host "Installing .NET 8 SDK..." -ForegroundColor Yellow
            winget install Microsoft.DotNet.SDK.8
            Write-Host "Please RESTART your terminal after installation and run this script again." -ForegroundColor Green
            exit
        }
    }
    
    Write-Host "Please download and install the .NET SDK from: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ .NET SDK detected: $dotnetVersion" -ForegroundColor Green
}

# 2. Build the solution
Write-Host "Restoring and building Quartermaster..." -ForegroundColor Yellow
dotnet build --configuration Release

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host "  🎉 Setup Complete!" -ForegroundColor Green
    Write-Host "  1. Edit 'appsettings.json' in this folder and add your tokens."
    Write-Host "  2. Run '.\start.ps1' to launch the bot and dashboard."
    Write-Host "=========================================" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Build failed. Please check the errors above." -ForegroundColor Red
}
