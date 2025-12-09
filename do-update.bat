@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Updating website on GitHub Pages
echo ========================================
echo.
echo Step 1: Adding changes...
git add .
if errorlevel 1 (
    echo Warning: git add failed
)
echo.
echo Step 2: Committing...
git commit -m "Update website"
if errorlevel 1 (
    echo Warning: git commit failed (maybe no changes?)
)
echo.
echo Step 3: Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo Error: git push failed
    pause
    exit /b 1
)
echo.
echo ========================================
echo   Done! Site will update in 1-2 minutes
echo ========================================
echo.
echo Site URL: https://Logos-big.github.io/cp-portfolio-calipso-design/
echo.
timeout /t 5
