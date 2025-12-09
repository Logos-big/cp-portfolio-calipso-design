@echo off
echo ========================================
echo Updating from Figma...
echo ========================================
echo.

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '.\scripts\auto-update.ps1'"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Update completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Error occurred. Check the output above.
    echo ========================================
)

pause
