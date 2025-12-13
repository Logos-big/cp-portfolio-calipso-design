# Скрипт для автоматической загрузки изменений из админки на GitHub
# Использование: ./deploy-from-admin.ps1

Write-Host "=== Загрузка изменений из админки на GitHub ===" -ForegroundColor Cyan

# Проверяем наличие файла projects.json в текущей директории (скачанный из админки)
if (Test-Path "projects.json") {
    Write-Host "✓ Найден файл projects.json" -ForegroundColor Green
    
    # Копируем файл в data/projects.json
    Copy-Item "projects.json" -Destination "data/projects.json" -Force
    Write-Host "✓ Файл скопирован в data/projects.json" -ForegroundColor Green
    
    # Проверяем, что это git репозиторий
    if (Test-Path ".git") {
        Write-Host "✓ Git репозиторий найден" -ForegroundColor Green
        
        # Добавляем файл
        git add data/projects.json
        Write-Host "✓ Файл добавлен в git" -ForegroundColor Green
        
        # Создаем коммит
        $commitMessage = "Обновление проектов из админки - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMessage
        Write-Host "✓ Коммит создан" -ForegroundColor Green
        
        # Загружаем на GitHub
        Write-Host "Загрузка на GitHub..." -ForegroundColor Yellow
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Изменения успешно загружены на GitHub!" -ForegroundColor Green
            Write-Host "Сайт обновится через несколько минут на GitHub Pages" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Ошибка при загрузке на GitHub" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Это не git репозиторий" -ForegroundColor Red
        Write-Host "Файл data/projects.json обновлен, но нужно вручную закоммитить изменения" -ForegroundColor Yellow
    }
    
    # Удаляем временный файл
    Remove-Item "projects.json" -ErrorAction SilentlyContinue
    Write-Host "✓ Временный файл удален" -ForegroundColor Green
} else {
    Write-Host "✗ Файл projects.json не найден в текущей директории" -ForegroundColor Red
    Write-Host "Инструкция:" -ForegroundColor Yellow
    Write-Host "1. Откройте админку: admin.html" -ForegroundColor White
    Write-Host "2. Нажмите кнопку 'Залить изменения на сайт'" -ForegroundColor White
    Write-Host "3. Скачайте файл projects.json" -ForegroundColor White
    Write-Host "4. Поместите его в корневую папку проекта" -ForegroundColor White
    Write-Host "5. Запустите этот скрипт снова" -ForegroundColor White
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan
pause

