@echo off
chcp 65001 >nul
echo ========================================
echo Обновление сайта из Figma
echo ========================================
echo.

powershell.exe -ExecutionPolicy Bypass -File scripts\auto-update.ps1

if %errorlevel% neq 0 (
    echo.
    echo Ошибка при обновлении. Попробуйте запустить вручную:
    echo   .\scripts\auto-update.ps1
    echo.
    pause
    exit /b 1
)

echo.
echo Готово! Сайт обновлен.
echo.
pause

