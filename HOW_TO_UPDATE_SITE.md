# Как обновить сайт

## Вариант 1: GitHub Pages (бесплатный хостинг)

### Шаг 1: Сохранить изменения в Git

```powershell
git add .
git commit -m "Update website"
git push origin main
```

### Шаг 2: Дождаться автоматического обновления

GitHub Pages автоматически обновит сайт через 1-2 минуты после push.

**Ваш сайт будет доступен по адресу:**
`https://Logos-big.github.io/cp-portfolio-calipso-design/`

---

## Вариант 2: FTP хостинг (платный)

### Если у вас настроен FTP:

1. **Запустите скрипт деплоя:**
   ```powershell
   .\scripts\deploy.ps1
   ```

2. **Или загрузите файлы вручную через FTP клиент:**
   - `index.html`
   - `styles/` (вся папка)
   - `scripts/` (если нужны на сайте)
   - Другие файлы проекта

---

## Быстрая команда для обновления

Создайте файл `update-site.bat` в корне проекта и запускайте его:

```batch
@echo off
echo Updating site...
git add .
git commit -m "Update website"
git push origin main
echo Done! Site will update in 1-2 minutes.
pause
```

---

## Проверка обновления

После обновления:
1. Подождите 1-2 минуты
2. Откройте сайт в браузере
3. Нажмите `Ctrl+F5` для обновления кэша

---

## Что обновляется

При обновлении загружаются:
- ✅ `index.html` - главная страница
- ✅ `styles/main.css` - стили
- ✅ `styles/figma-variables.css` - переменные из Figma
- ✅ Все другие файлы проекта

