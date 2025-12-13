# Скрипт для автоматической загрузки изменений из админки на GitHub
# Использование: ./deploy-from-admin.ps1

# Устанавливаем кодировку UTF-8 для корректного отображения русских символов
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Загрузка изменений из админки на GitHub ===" -ForegroundColor Cyan

# Проверяем наличие файла projects.json в текущей директории (скачанный из админки)
if (Test-Path "projects.json") {
    Write-Host "[OK] Найден файл projects.json" -ForegroundColor Green
    
    # Копируем файл в data/projects.json
    try {
        Copy-Item "projects.json" -Destination "data/projects.json" -Force
        Write-Host "[OK] Файл скопирован в data/projects.json" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Ошибка при копировании файла: $_" -ForegroundColor Red
        pause
        exit 1
    }
    
    # Проверяем, что это git репозиторий
    if (Test-Path ".git") {
        Write-Host "[OK] Git репозиторий найден" -ForegroundColor Green
        
        # Добавляем файл
        try {
            $gitAddResult = & git add data/projects.json 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Файл добавлен в git" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] Предупреждение при добавлении файла: $gitAddResult" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] Ошибка при добавлении файла в git: $_" -ForegroundColor Red
        }
        
        # Создаем коммит
        try {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $commitMessage = "Обновление проектов из админки - $timestamp"
            
            # Используем правильное экранирование для git commit
            $gitCommitResult = & git commit -m $commitMessage 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Коммит создан" -ForegroundColor Green
            } else {
                # Проверяем, не пустой ли коммит
                if ($gitCommitResult -match "nothing to commit") {
                    Write-Host "[INFO] Нет изменений для коммита" -ForegroundColor Yellow
                } else {
                    Write-Host "[ERROR] Ошибка при создании коммита: $gitCommitResult" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "[ERROR] Ошибка при создании коммита: $_" -ForegroundColor Red
        }
        
        # Загружаем на GitHub
        Write-Host "Загрузка на GitHub..." -ForegroundColor Yellow
        try {
            $gitPushResult = & git push origin main 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Изменения успешно загружены на GitHub!" -ForegroundColor Green
                Write-Host "Сайт обновится через несколько минут на GitHub Pages" -ForegroundColor Cyan
            } else {
                Write-Host "[ERROR] Ошибка при загрузке на GitHub:" -ForegroundColor Red
                Write-Host $gitPushResult -ForegroundColor Red
            }
        } catch {
            Write-Host "[ERROR] Ошибка при загрузке на GitHub: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[ERROR] Это не git репозиторий" -ForegroundColor Red
        Write-Host "Файл data/projects.json обновлен, но нужно вручную закоммитить изменения" -ForegroundColor Yellow
    }
    
    # Удаляем временный файл
    try {
        Remove-Item "projects.json" -ErrorAction SilentlyContinue
        Write-Host "[OK] Временный файл удален" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Не удалось удалить временный файл: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] Файл projects.json не найден в текущей директории" -ForegroundColor Red
    Write-Host "Инструкция:" -ForegroundColor Yellow
    Write-Host "1. Откройте админку: admin.html" -ForegroundColor White
    Write-Host "2. Нажмите кнопку 'Залить изменения на сайт'" -ForegroundColor White
    Write-Host "3. Скачайте файл projects.json" -ForegroundColor White
    Write-Host "4. Поместите его в корневую папку проекта" -ForegroundColor White
    Write-Host "5. Запустите этот скрипт снова" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Готово ===" -ForegroundColor Cyan
pause

