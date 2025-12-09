# Скрипт для деплоя на GitHub Pages
# Использование: .\scripts\deploy-github-pages.ps1

Write-Host "Деплой на GitHub Pages..." -ForegroundColor Green
Write-Host ""

# Проверка наличия изменений
$status = git status --porcelain
if ($status) {
    Write-Host "Обнаружены изменения. Нужно закоммитить их перед деплоем." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Выполните:" -ForegroundColor Cyan
    Write-Host "  git add ." -ForegroundColor White
    Write-Host "  git commit -m 'Ваше сообщение'" -ForegroundColor White
    Write-Host "  git push" -ForegroundColor White
    Write-Host ""
    Write-Host "После push сайт автоматически обновится на GitHub Pages!" -ForegroundColor Green
} else {
    Write-Host "Нет изменений для деплоя." -ForegroundColor Yellow
    Write-Host "Все уже синхронизировано с GitHub." -ForegroundColor Green
}

Write-Host ""
Write-Host "Ваш сайт доступен на:" -ForegroundColor Cyan
Write-Host "https://logos-big.github.io/cp-portfolio-calipso-design" -ForegroundColor White
Write-Host ""
Write-Host "Убедитесь, что GitHub Pages включен в настройках репозитория!" -ForegroundColor Yellow

