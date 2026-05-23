Write-Host "========================================="
Write-Host "  Quartermaster - Command Deployment"
Write-Host "========================================="

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file missing!"
    exit 1
}

Write-Host "Syncing Slash Commands..."
node deploy-commands.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!"
} else {
    Write-Host "Deployment failed."
}
