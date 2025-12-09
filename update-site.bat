@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Updating website on GitHub Pages
echo ========================================
echo.
echo Step 1: Adding changes...
git add .
echo.
echo Step 2: Committing changes...
git commit -m "Update website - %date% %time%"
echo.
echo Step 3: Pushing to GitHub...
git push origin main
echo.
echo ========================================
echo   Done! Site will update in 1-2 minutes
echo ========================================
echo.
echo Your site: https://Logos-big.github.io/cp-portfolio-calipso-design/
echo.
pause

