@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Force Update Website on GitHub Pages
echo ========================================
echo.
echo Step 1: Adding all changes...
git add .
echo.
echo Step 2: Creating commit...
git commit -m "Update website - %date% %time%"
if errorlevel 1 (
    echo No changes to commit, creating empty commit...
    git commit --allow-empty -m "Force GitHub Pages update"
)
echo.
echo Step 3: Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo Error: git push failed
    echo.
    echo Please check:
    echo 1. Are you connected to the internet?
    echo 2. Do you have access to the repository?
    echo 3. Check: https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages
    pause
    exit /b 1
)
echo.
echo ========================================
echo   Done! Site will update in 2-3 minutes
echo ========================================
echo.
echo Your site: https://Logos-big.github.io/cp-portfolio-calipso-design/
echo.
echo IMPORTANT: Check GitHub Pages settings:
echo https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages
echo.
echo Make sure:
echo - Source: Deploy from a branch
echo - Branch: main
echo - Folder: / (root)
echo.
timeout /t 5

