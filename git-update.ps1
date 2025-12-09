# Git update script
$ErrorActionPreference = "Stop"

Write-Host "Adding all changes..." -ForegroundColor Yellow
& git add .

Write-Host "Creating commit..." -ForegroundColor Yellow
$commitMessage = "Update website - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
& git commit -m $commitMessage

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
& git push origin main

Write-Host "Done! Site will update in 1-2 minutes." -ForegroundColor Green
Write-Host "Site URL: https://Logos-big.github.io/cp-portfolio-calipso-design/" -ForegroundColor Cyan

