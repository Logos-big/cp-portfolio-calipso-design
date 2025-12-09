# Пошаговая инструкция: Настройка GitHub Pages

## Шаг 1: Откройте репозиторий на GitHub

1. Откройте браузер
2. Перейдите по адресу:
   **https://github.com/Logos-big/cp-portfolio-calipso-design**

## Шаг 2: Откройте настройки (Settings)

1. В верхней части страницы репозитория найдите вкладки:
   - Code
   - Issues
   - Pull requests
   - Actions
   - Projects
   - Wiki
   - Security
   - **Settings** ← НАЖМИТЕ СЮДА
   - Insights

2. Нажмите на **Settings** (самая правая вкладка)

## Шаг 3: Найдите раздел Pages

1. В левом меню найдите раздел **"Code and automation"**
2. В этом разделе найдите и нажмите на **"Pages"**

   Или просто прокрутите страницу вниз до раздела **"Pages"**

## Шаг 4: Настройте Source

1. Вы увидите раздел **"Build and deployment"**

2. Найдите выпадающий список **"Source"** (или "Branch")

3. Нажмите на выпадающий список и выберите:
   **"Deploy from a branch"**

4. После выбора появятся два поля:
   - **Branch**: выберите `main`
   - **Folder**: выберите `/ (root)` или `/`

5. Нажмите кнопку **"Save"** (внизу справа)

## Шаг 5: Проверьте статус

После сохранения вы увидите:
- ✅ Зеленую галочку и сообщение "Your site is live at..."
- Или желтое предупреждение "Your site is ready to be published..."

Подождите 1-2 минуты, и сайт будет доступен по адресу:
**https://Logos-big.github.io/cp-portfolio-calipso-design/**

---

## Визуальная подсказка:

```
GitHub Repository Page
├── [Code] [Issues] [Pull requests] ... [Settings] ← Кликните здесь
│
Settings Page (левое меню)
├── General
├── Access
├── Secrets and variables
├── Code and automation
│   ├── Actions
│   ├── Pages ← Кликните здесь
│   └── ...
│
Pages Settings Page
├── Build and deployment
│   └── Source: [Deploy from a branch ▼] ← Выберите это
│       ├── Branch: [main ▼] ← Выберите main
│       └── Folder: [/ (root) ▼] ← Выберите root
│   └── [Save] ← Нажмите Save
```

---

## Если не видите опцию "Deploy from a branch"

Возможные варианты названий:
- "Deploy from a branch"
- "Branch"
- "GitHub Actions" (если используете Actions)
- Просто выпадающий список с выбором ветки

Главное - выберите ветку `main` и папку `/ (root)`

---

## Прямая ссылка на настройки Pages:

**https://github.com/Logos-big/cp-portfolio-calipso-design/settings/pages**

Просто откройте эту ссылку в браузере!

