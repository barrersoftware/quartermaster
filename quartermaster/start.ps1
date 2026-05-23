Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Quartermaster - Quick Start" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your DISCORD_TOKEN."
    exit 1
}

$envFile = Get-Content ".env" -Raw
if ($envFile -match "DISCORD_TOKEN=\s*`r?`n" -or $envFile -match "DISCORD_TOKEN=$") {
    Write-Host "❌ ERROR: DISCORD_TOKEN is not set in .env!" -ForegroundColor Red
    Write-Host "Please add your token to the .env file."
    exit 1
}

Write-Host "🚀 Starting Quartermaster..." -ForegroundColor Green
node index.js
