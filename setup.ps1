# Quartermaster .NET - Windows Setup Interactive Installer

function Show-Header {
    Clear-Host
    Write-Host "#########################################" -ForegroundColor Cyan
    Write-Host "#                                       #" -ForegroundColor Cyan
    Write-Host "#        🏴‍☠️ QUARTERMASTER .NET          #" -ForegroundColor Cyan
    Write-Host "#       Enterprise Setup Wizard         #" -ForegroundColor Cyan
    Write-Host "#                                       #" -ForegroundColor Cyan
    Write-Host "#########################################" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Status {
    param([string]$message, [string]$status = "INFO")
    $color = "White"
    if ($status -eq "OK") { $color = "Green" }
    if ($status -eq "WARN") { $color = "Yellow" }
    if ($status -eq "ERROR") { $color = "Red" }
    
    Write-Host "[ " -NoNewline
    Write-Host $status -ForegroundColor $color -NoNewline
    Write-Host " ] $message"
}

Show-Header
Show-Status "Initializing environment..."

# 1. Check for .NET SDK
Show-Status "Checking for .NET SDK..."
$dotnetVersion = dotnet --version 2>$null

if ($null -eq $dotnetVersion) {
    Show-Status "SDK not found. Attempting automated repair..." "WARN"
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $confirm = Read-Host "Would you like to install .NET 10 SDK via winget? (Y/N)"
        if ($confirm -eq "Y") {
            Show-Status "Installing Microsoft.DotNet.SDK.10..." "INFO"
            winget install Microsoft.DotNet.SDK.10
            Write-Host "`nPlease RESTART your terminal and run this script again." -ForegroundColor Yellow
            exit
        }
    }
    Show-Status "Critical failure: .NET 10 SDK is required." "ERROR"
    exit 1
}
Show-Status "Detected .NET SDK: $dotnetVersion" "OK"

# 2. Build Selection
Write-Host "`nReady to build the solution."
Write-Host "1) Standard Build (Release)"
Write-Host "2) Production Publish (Optimized for Services)"
$buildChoice = Read-Host "Select build type [1-2]"

Show-Header
if ($buildChoice -eq "2") {
    Show-Status "Publishing Quartermaster for production..." "INFO"
    dotnet publish Quartermaster.Bot\Quartermaster.Bot.csproj --configuration Release --output ./publish
    dotnet publish Quartermaster.Web\Quartermaster.Web.csproj --configuration Release --output ./publish
} else {
    Show-Status "Restoring and building solution..." "INFO"
    dotnet build --configuration Release
}

if ($LASTEXITCODE -ne 0) {
    Show-Status "Build failed. Resolve errors above." "ERROR"
    exit 1
}
Show-Status "Build successful!" "OK"

# 3. Configuration Phase
Show-Header
Write-Host "--- Configuration Phase ---" -ForegroundColor Cyan
Write-Host "You will need your Discord Application credentials."
Write-Host "Get them here: https://discord.com/developers/applications" -ForegroundColor Gray
Write-Host ""

$configPath = Resolve-Path "./appsettings.json"
$config = Get-Content $configPath | ConvertFrom-Json

$botToken = Read-Host "Enter your Discord Bot Token"
$clientId = Read-Host "Enter your Client ID (Application ID)"
$clientSecret = Read-Host "Enter your Client Secret"

if ($botToken) { $config.Bot.Token = $botToken }
if ($clientId) { $config.Discord.ClientId = $clientId }
if ($clientSecret) { $config.Discord.ClientSecret = $clientSecret }

# Save updated config
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath
Show-Status "Configuration saved to appsettings.json" "OK"

# 4. Deployment Mode
Write-Host "`nChoose your deployment mode:"
Write-Host "A) Manual Startup (Run via start.ps1)"
Write-Host "B) Background Service (Install as Windows Service)"
$mode = Read-Host "Selection [A/B]"

if ($mode -eq "B") {
    Show-Header
    Show-Status "Installing Windows Services..." "INFO"
    
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Show-Status "Permission Denied: Run as Administrator to install services." "ERROR"
    } else {
        $botExe = Resolve-Path "./publish/Quartermaster.Bot.exe"
        $webExe = Resolve-Path "./publish/Quartermaster.Web.exe"

        # Cleanup existing
        sc.exe stop QuartermasterBot 2>$null | Out-Null
        sc.exe delete QuartermasterBot 2>$null | Out-Null
        sc.exe stop QuartermasterWeb 2>$null | Out-Null
        sc.exe delete QuartermasterWeb 2>$null | Out-Null

        # Install
        New-Service -Name "QuartermasterBot" -BinaryPathName "$botExe --contentRoot $($PWD.Path)" -DisplayName "Quartermaster Discord Bot" -StartupType Automatic
        New-Service -Name "QuartermasterWeb" -BinaryPathName "$webExe --contentRoot $($PWD.Path)" -DisplayName "Quartermaster Web Dashboard" -StartupType Automatic
        
        Show-Status "Services registered successfully." "OK"
    }
}

Show-Header
Show-Status "Setup Complete!" "OK"
Write-Host "-----------------------------------------"
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure tokens in 'appsettings.json'"
Write-Host "2. Current database linked: " -NoNewline
Write-Host "bot.db" -ForegroundColor Green
Write-Host "-----------------------------------------"
Write-Host "Enjoy your liberated community! 🏴‍☠️" -ForegroundColor Cyan
Write-Host "Press any key to exit."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
