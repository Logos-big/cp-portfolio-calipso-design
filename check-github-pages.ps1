# Check GitHub Pages status
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Checking GitHub Pages Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "1. Checking Git status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "   WARNING: You have uncommitted changes!" -ForegroundColor Red
    Write-Host "   Files:" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "     $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "   Run these commands to commit and push:" -ForegroundColor Cyan
    Write-Host "     git add ." -ForegroundColor White
    Write-Host "     git commit -m 'Update website'" -ForegroundColor White
    Write-Host "     git push origin main" -ForegroundColor White
} else {
    Write-Host "   OK: No uncommitted changes" -ForegroundColor Green
}

Write-Host ""

# Check last commit
Write-Host "2. Checking last commit..." -ForegroundColor Yellow
$lastCommit = git log -1 --oneline
if ($lastCommit) {
    Write-Host "   Last commit: $lastCommit" -ForegroundColor White
} else {
    Write-Host "   WARNING: No commits found!" -ForegroundColor Red
}

Write-Host ""

# Check remote
Write-Host "3. Checking remote repository..." -ForegroundColor Yellow
$remote = git remote get-url origin
if ($remote) {
    Write-Host "   Remote: $remote" -ForegroundColor White
} else {
    Write-Host "   ERROR: No remote repository configured!" -ForegroundColor Red
}

Write-Host ""

# Check if pushed
Write-Host "4. Checking if local is synced with remote..." -ForegroundColor Yellow
$localCommit = git rev-parse HEAD
$remoteCommit = git ls-remote origin HEAD 2>$null
if ($remoteCommit) {
    $remoteHash = ($remoteCommit -split '\s+')[0]
    if ($localCommit -eq $remoteHash) {
        Write-Host "   OK: Local and remote are in sync" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Local and remote are out of sync!" -ForegroundColor Red
        Write-Host "   Run: git push origin main" -ForegroundColor Cyan
    }
} else {
    Write-Host "   WARNING: Could not check remote status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GitHub Pages Info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your site should be at:" -ForegroundColor Yellow
Write-Host "  https://Logos-big.github.io/cp-portfolio-calipso-design/" -ForegroundColor Cyan
Write-Host ""
Write-Host "To enable/check GitHub Pages:" -ForegroundColor Yellow
Write-Host "  1. Go to: https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages" -ForegroundColor White
Write-Host "  2. Under 'Source', select 'Deploy from a branch'" -ForegroundColor White
Write-Host "  3. Select branch: 'main'" -ForegroundColor White
Write-Host "  4. Select folder: '/ (root)'" -ForegroundColor White
Write-Host "  5. Click 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "After pushing, wait 1-2 minutes for GitHub Pages to update." -ForegroundColor Yellow
Write-Host ""

