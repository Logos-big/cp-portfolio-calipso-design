@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Updating from Figma
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File scripts\auto-update.ps1
if errorlevel 1 (
    echo.
    echo Error: Could not update from Figma
    echo.
    echo Please run manually:
    echo   .\scripts\auto-update.ps1
    pause
    exit /b 1
)
echo.
echo ========================================
echo   Done! Page updated from Figma
echo ========================================
echo.
timeout /t 3

