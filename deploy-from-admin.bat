@echo off
chcp 65001 >nul
echo === Загрузка изменений из админки на GitHub ===

REM Проверяем наличие файла projects.json
if exist "projects.json" (
    echo ✓ Найден файл projects.json
    
    REM Копируем файл в data/projects.json
    copy /Y "projects.json" "data\projects.json" >nul
    echo ✓ Файл скопирован в data/projects.json
    
    REM Проверяем, что это git репозиторий
    if exist ".git" (
        echo ✓ Git репозиторий найден
        
        REM Добавляем файл
        git add data/projects.json
        echo ✓ Файл добавлен в git
        
        REM Создаем коммит
        for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
        set commitMessage=Обновление проектов из админки - %datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2%
        git commit -m "%commitMessage%"
        echo ✓ Коммит создан
        
        REM Загружаем на GitHub
        echo Загрузка на GitHub...
        git push origin main
        
        if %ERRORLEVEL% EQU 0 (
            echo ✓ Изменения успешно загружены на GitHub!
            echo Сайт обновится через несколько минут на GitHub Pages
        ) else (
            echo ✗ Ошибка при загрузке на GitHub
        )
    ) else (
        echo ✗ Это не git репозиторий
        echo Файл data/projects.json обновлен, но нужно вручную закоммитить изменения
    )
    
    REM Удаляем временный файл
    del "projects.json" >nul 2>&1
    echo ✓ Временный файл удален
) else (
    echo ✗ Файл projects.json не найден в текущей директории
    echo.
    echo Инструкция:
    echo 1. Откройте админку: admin.html
    echo 2. Нажмите кнопку "Залить изменения на сайт"
    echo 3. Скачайте файл projects.json
    echo 4. Поместите его в корневую папку проекта
    echo 5. Запустите этот скрипт снова
)

echo.
echo === Готово ===
pause

