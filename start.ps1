Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Quartermaster .NET - Startup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Warning for Service users
if (Get-Service -Name "QuartermasterBot" -ErrorAction SilentlyContinue) {
    Write-Host "⚠️ WARNING: Windows Services (QuartermasterBot/Web) detected." -ForegroundColor Yellow
    Write-Host "If the services are already running, this manual start will fail due to file locks or port conflicts." -ForegroundColor Yellow
    $ans = Read-Host "Continue manual startup? (Y/N)"
    if ($ans -ne "Y") { exit }
}
Write-Host "Checking build..."
dotnet build --configuration Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please fix errors before starting." -ForegroundColor Red
    exit 1
}

# Start the Bot and Web Host simultaneously
Write-Host "Starting Bot and Web Dashboard..." -ForegroundColor Green

# Use Start-Job to run them in background or just run them in parallel
$bot = Start-Process dotnet -ArgumentList "run --project Quartermaster.Bot --configuration Release" -PassThru
$web = Start-Process dotnet -ArgumentList "run --project Quartermaster.Web --configuration Release" -PassThru

Write-Host "Processes started."
Write-Host "Bot PID: $($bot.Id)"
Write-Host "Web PID: $($web.Id)"
Write-Host "Press Ctrl+C to stop (manual cleanup might be required for spawned processes)."

# Wait for processes
Wait-Process -Id $bot.Id, $web.Id
