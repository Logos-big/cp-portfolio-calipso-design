# Auto-run Figma update script
# This script is called automatically when user says "обновил тото"

$scriptPath = Join-Path $PSScriptRoot "scripts\auto-update.ps1"
& $scriptPath

