Write-Host "Starting local server on http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Set-Location $PSScriptRoot
python -m http.server 8000


