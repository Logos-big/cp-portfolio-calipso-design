# Auto-update site script
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Updating website on GitHub Pages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get git path
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $gitPath) {
    Write-Host "Error: Git not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Adding all changes..." -ForegroundColor Yellow
& $gitPath add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: git add failed" -ForegroundColor Yellow
}

Write-Host "Step 2: Creating commit..." -ForegroundColor Yellow
$commitMsg = "Update website - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
& $gitPath commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: git commit failed (maybe no changes?)" -ForegroundColor Yellow
}

Write-Host "Step 3: Pushing to GitHub..." -ForegroundColor Yellow
& $gitPath push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: git push failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Done! Site will update in 1-2 minutes" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Site URL: https://Logos-big.github.io/cp-portfolio-calipso-design/" -ForegroundColor Cyan
Write-Host ""

