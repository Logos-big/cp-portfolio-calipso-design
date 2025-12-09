# Как исправить проблему с обновлением сайта

## Проблема: Изменения не появляются на сайте

### Шаг 1: Проверьте статус Git

Запустите скрипт проверки:
```powershell
.\check-github-pages.ps1
```

Или вручную:
```powershell
git status
```

Если есть незакоммиченные изменения, выполните:
```powershell
git add .
git commit -m "Update website"
git push origin main
```

### Шаг 2: Проверьте настройки GitHub Pages

1. Откройте в браузере:
   **https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages**

2. Убедитесь, что:
   - ✅ **Source**: "Deploy from a branch"
   - ✅ **Branch**: `main`
   - ✅ **Folder**: `/ (root)`
   - ✅ Нажмите **Save**

### Шаг 3: Проверьте, что файлы в корне проекта

GitHub Pages ищет `index.html` в корне репозитория. Убедитесь, что:
- ✅ `index.html` находится в корне
- ✅ `styles/` папка находится в корне
- ✅ Все файлы закоммичены и отправлены

### Шаг 4: Принудительное обновление

Если изменения не появляются:

1. **Создайте пустой коммит для принудительного обновления:**
   ```powershell
   git commit --allow-empty -m "Force GitHub Pages update"
   git push origin main
   ```

2. **Подождите 2-3 минуты** (GitHub Pages обновляется не мгновенно)

3. **Очистите кэш браузера:**
   - Нажмите `Ctrl + Shift + Delete`
   - Или `Ctrl + F5` на странице сайта

### Шаг 5: Проверьте URL сайта

Ваш сайт должен быть доступен по адресу:
**https://Logos-big.github.io/cp-portfolio-calipso-design/**

⚠️ **Важно:** URL чувствителен к регистру! Используйте точно такой же регистр, как в имени репозитория.

### Шаг 6: Проверьте Actions (если включены)

1. Откройте: **https://github.com/Logos-big/cp-portfolio-calipso-design/actions**
2. Проверьте, нет ли ошибок в последних деплоях

## Быстрое решение

Выполните эти команды по порядку:

```powershell
# 1. Добавить все изменения
git add .

# 2. Создать коммит
git commit -m "Update website"

# 3. Отправить на GitHub
git push origin main

# 4. Принудительное обновление (если нужно)
git commit --allow-empty -m "Force update"
git push origin main
```

После этого подождите 2-3 минуты и проверьте сайт.

## Если ничего не помогает

1. Проверьте, что репозиторий публичный (GitHub Pages работает только с публичными репозиториями на бесплатном плане)
2. Проверьте логи GitHub Pages в настройках репозитория
3. Попробуйте пересоздать GitHub Pages в настройках

