# Quartermaster .NET - Windows Setup Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Quartermaster .NET - Windows Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check for .NET SDK
Write-Host "Checking for .NET SDK..."
$dotnetVersion = dotnet --version 2>$null

if ($null -eq $dotnetVersion) {
    Write-Host "❌ .NET SDK not found!" -ForegroundColor Red
    Write-Host "Quartermaster requires the .NET 10.0 SDK or later."
    
    # Check if winget is available for automated install
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $confirm = Read-Host "Would you like to attempt installation via winget? (Y/N)"
        if ($confirm -eq "Y") {
            Write-Host "Installing .NET 10 SDK..." -ForegroundColor Yellow
            winget install Microsoft.DotNet.SDK.10
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
dotnet publish --configuration Release --output ./publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed. Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Build Successful!" -ForegroundColor Green

# 3. Optional: Install as Windows Service
$installService = Read-Host "Would you like to install Quartermaster as a Windows Service? (Automatic boot) (Y/N)"
if ($installService -eq "Y") {
    # Check for Admin
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "❌ Administrator privileges required to install services! Please restart this script as Administrator." -ForegroundColor Red
    } else {
        Write-Host "Installing Services..." -ForegroundColor Yellow
        
        $botExe = Resolve-Path "./publish/Quartermaster.Bot.exe"
        $webExe = Resolve-Path "./publish/Quartermaster.Web.exe"

        # Create Bot Service
        if (Get-Service -Name "QuartermasterBot" -ErrorAction SilentlyContinue) {
            sc.exe delete QuartermasterBot
        }
        New-Service -Name "QuartermasterBot" -BinaryPathName "$botExe --contentRoot $($PWD.Path)" -DisplayName "Quartermaster Discord Bot" -Description "Enterprise community bot for Discord" -StartupType Automatic
        
        # Create Web Service
        if (Get-Service -Name "QuartermasterWeb" -ErrorAction SilentlyContinue) {
            sc.exe delete QuartermasterWeb
        }
        New-Service -Name "QuartermasterWeb" -BinaryPathName "$webExe --contentRoot $($PWD.Path)" -DisplayName "Quartermaster Web Dashboard" -Description "Management portal for Quartermaster" -StartupType Automatic

        Write-Host "✅ Services installed successfully! You can start them via Task Manager or 'sc start QuartermasterBot'." -ForegroundColor Green
    }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  🎉 Setup Complete!" -ForegroundColor Green
Write-Host "  1. Edit 'appsettings.json' in this folder and add your tokens."
Write-Host "  2. Run '.\start.ps1' (Manual) or start the Windows Services."
Write-Host "=========================================" -ForegroundColor Cyan
