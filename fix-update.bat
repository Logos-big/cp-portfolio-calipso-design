@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Диагностика и обновление сайта
echo ========================================
echo.

echo Шаг 1: Проверка статуса Git...
git status
echo.

echo Шаг 2: Получение свежих данных из Figma...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '.\scripts\auto-update.ps1'"
if errorlevel 1 (
    echo Ошибка при обновлении из Figma. Продолжаем с существующими данными...
)
echo.

echo Шаг 3: Добавление всех изменений...
git add .
echo.

echo Шаг 4: Создание коммита...
git commit -m "Update from Figma - %date% %time%"
if errorlevel 1 (
    echo Нет изменений для коммита, создаю пустой коммит для принудительного обновления...
    git commit --allow-empty -m "Force GitHub Pages update"
)
echo.

echo Шаг 5: Отправка в GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ОШИБКА: Не удалось отправить в GitHub!
    echo.
    echo Проверьте:
    echo 1. Подключение к интернету
    echo 2. Доступ к репозиторию
    echo 3. Настройки GitHub Pages: https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages
    echo.
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Готово! Сайт обновится через 2-3 минуты
echo ========================================
echo.
echo Ваш сайт: https://Logos-big.github.io/cp-portfolio-calipso-design/
echo.
echo ВАЖНО: Проверьте настройки GitHub Pages:
echo https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages
echo.
echo Убедитесь что:
echo - Source: Deploy from a branch
echo - Branch: main
echo - Folder: / (root)
echo.
timeout /t 5

