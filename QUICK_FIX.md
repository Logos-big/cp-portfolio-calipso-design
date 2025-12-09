# Быстрое исправление: Изменения не появляются на сайте

## Проблема
Изменения в коде есть, но на сайте их нет.

## Решение за 3 шага:

### 1. Запустите принудительное обновление

**Дважды кликните на файл:** `force-update-site.bat`

Или выполните в терминале:
```powershell
.\force-update-site.bat
```

### 2. Проверьте настройки GitHub Pages

Откройте в браузере:
**https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages**

Убедитесь, что:
- ✅ **Source**: "Deploy from a branch"
- ✅ **Branch**: `main` 
- ✅ **Folder**: `/ (root)`
- ✅ Нажмите **Save**

### 3. Подождите и очистите кэш

- Подождите **2-3 минуты**
- Откройте сайт: **https://Logos-big.github.io/cp-portfolio-calipso-design/**
- Нажмите **Ctrl + F5** для обновления кэша

## Если не помогло

Выполните команды вручную:

```powershell
git add .
git commit -m "Update website"
git push origin main
git commit --allow-empty -m "Force update"
git push origin main
```

Подробная инструкция: см. `FIX_GITHUB_PAGES.md`

