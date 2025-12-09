# Быстрая настройка автоматической синхронизации с Figma

## 🚀 За 3 шага:

### 1. Получите токен Figma
- Figma → Settings → Account → Personal Access Tokens
- Create new token → Скопируйте токен

### 2. Получите File Key
- Откройте файл в Figma
- URL: `https://www.figma.com/file/FILE_KEY/...`
- Скопируйте `FILE_KEY`

### 3. Настройте конфиг
```powershell
Copy-Item scripts/figma-config.json.example scripts/figma-config.json
```

Откройте `scripts/figma-config.json` и вставьте:
```json
{
  "fileKey": "ваш-file-key",
  "token": "ваш-токен"
}
```

### 4. Запустите синхронизацию
```powershell
node scripts/figma-sync.js
```

## ✅ Результат:

- `figma-data.json` - все данные
- `styles/figma-variables.css` - CSS переменные

Используйте переменные в CSS:
```css
color: var(--color-primary);
```

Подробнее: `FIGMA_AUTO_SYNC.md`

