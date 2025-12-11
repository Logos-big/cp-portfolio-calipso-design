# Как запустить локальный сервер

## Проблема
Браузер блокирует загрузку файлов через `fetch()` при открытии HTML файла напрямую (file:// протокол).

## Решение 1: Использовать start-server.bat
1. Дважды кликните на файл `start-server.bat`
2. Откройте браузер и перейдите на `http://localhost:8000`
3. Откройте файл `index.html`

## Решение 2: Python (если установлен)
Откройте терминал в этой папке и выполните:
```
python -m http.server 8000
```
Затем откройте `http://localhost:8000/index.html`

## Решение 3: Node.js (если установлен)
```
npx http-server -p 8000
```
Затем откройте `http://localhost:8000/index.html`

## Решение 4: VS Code Live Server
Если используете VS Code:
1. Установите расширение "Live Server"
2. Правой кнопкой на `index.html` → "Open with Live Server"

## Решение 5: Другие серверы
- **PHP**: `php -S localhost:8000`
- **Ruby**: `ruby -run -e httpd . -p 8000`



