# Автоматическая синхронизация с Figma

## Настройка автоматического сбора данных из Figma

### Шаг 1: Получите Figma Access Token

1. Зайдите на [Figma.com](https://www.figma.com)
2. Откройте **Settings** → **Account**
3. Прокрутите до **Personal Access Tokens**
4. Нажмите **Create new token**
5. Дайте название (например: "Cursor Sync")
6. Скопируйте токен (показывается только один раз!)

### Шаг 2: Получите File Key из Figma

1. Откройте ваш файл в Figma
2. Посмотрите URL в браузере:
   ```
   https://www.figma.com/file/FILE_KEY/Название-файла
   ```
3. Скопируйте `FILE_KEY` (длинная строка после `/file/`)

### Шаг 3: Настройте конфигурацию

1. Скопируйте файл конфигурации:
   ```powershell
   Copy-Item scripts/figma-config.json.example scripts/figma-config.json
   ```

2. Откройте `scripts/figma-config.json` и заполните:
   ```json
   {
     "fileKey": "ваш-file-key-из-url",
     "token": "ваш-токен-из-figma",
     "nodeIds": []
   }
   ```

3. Обновите скрипт `scripts/figma-sync.js`:
   - Найдите строку с `FIGMA_CONFIG`
   - Замените значения на ваши из `figma-config.json`

### Шаг 4: Установите зависимости (если нужно)

Если используете старую версию Node.js (< 18):

```powershell
npm install node-fetch
```

И добавьте в начало `figma-sync.js`:
```javascript
const fetch = require('node-fetch');
```

### Шаг 5: Запустите синхронизацию

```powershell
npm run figma-sync
```

Или напрямую:
```powershell
node scripts/figma-sync.js
```

## Что делает скрипт:

1. ✅ Подключается к Figma API
2. ✅ Извлекает все цвета из макета
3. ✅ Собирает типографику (шрифты, размеры)
4. ✅ Получает размеры и отступы компонентов
5. ✅ Генерирует CSS переменные
6. ✅ Сохраняет данные в `figma-data.json`

## Результат:

После выполнения скрипта создаются файлы:

- **`figma-data.json`** - все данные в JSON формате
- **`styles/figma-variables.css`** - CSS переменные для использования

## Использование в проекте:

Подключите сгенерированные переменные в `index.html`:

```html
<link rel="stylesheet" href="styles/figma-variables.css">
<link rel="stylesheet" href="styles/main.css">
```

Используйте в CSS:

```css
.my-element {
    color: var(--color-primary);
    font-family: var(--font-heading-family);
    font-size: var(--font-heading-size);
}
```

## Автоматическая синхронизация (опционально):

Можно настроить автоматический запуск при изменении файлов:

1. Установите `nodemon`:
   ```powershell
   npm install -g nodemon
   ```

2. Запустите в режиме наблюдения:
   ```powershell
   npm run figma-sync:watch
   ```

## Решение проблем:

### Ошибка "HTTP error! status: 401"
- Проверьте правильность токена
- Убедитесь, что токен не истек

### Ошибка "HTTP error! status: 404"
- Проверьте правильность File Key
- Убедитесь, что файл доступен (не приватный или у вас есть доступ)

### Ошибка "fetch is not defined"
- Установите Node.js 18+ или установите `node-fetch`

## Альтернативный способ (без API):

Если не хотите использовать API, можно:

1. Экспортировать макет из Figma как JSON
2. Сохранить в `figma-export.json`
3. Модифицировать скрипт для чтения локального файла

