# Subscription Tracker — Telegram Mini App

Трекер подписок как Telegram Mini App с уведомлениями о просроченных платежах.

## Структура проекта

```
├── src/                  # Frontend (React + Vite)
│   ├── api/              # API клиент
│   ├── components/       # React компоненты
│   ├── hooks/            # React хуки
│   └── types/            # TypeScript типы
├── backend/              # Backend (Node.js)
│   ├── src/
│   │   ├── api/          # Express REST API
│   │   ├── bot/          # Telegram бот (grammY)
│   │   ├── database/     # lowdb + репозитории
│   │   ├── jobs/         # Cron задачи
│   │   └── services/     # Бизнес-логика
│   └── data/             # JSON база данных
├── dist/                 # Frontend билд
└── package.json          # Корневой package.json
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm run install:all
```

### 2. Настройка окружения

Скопируй `.env.example` в `.env` и заполни:

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3000
```

**Backend (backend/.env):**
```
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=http://localhost:5173
PORT=3000
```

### 3. Запуск для разработки

```bash
# Только frontend
npm run dev

# Только backend
npm run dev:backend

# Оба вместе
npm run dev:all
```

### 4. Сборка для продакшена

```bash
npm run build:all
```

## Деплой на VPS

### 1. Клонирование и установка

```bash
git clone <repo-url> subscription-tracker
cd subscription-tracker
npm run install:all
```

### 2. Настройка .env файлов

```bash
# Frontend
cp .env.example .env
# Укажи URL API (например: https://api.yourdomain.com)

# Backend
cp backend/.env.example backend/.env
# Укажи BOT_TOKEN и WEBAPP_URL
```

### 3. Сборка

```bash
npm run build:all
```

### 4. Запуск

```bash
# Запуск бэкенда
npm start
```

### 5. Настройка веб-сервера

Настрой nginx для раздачи `dist/` и проксирования API:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/subscription-tracker/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 6. Настройка Telegram бота

1. Открой [@BotFather](https://t.me/BotFather)
2. Выбери своего бота
3. Bot Settings → Menu Button → Configure menu button
4. Укажи URL Mini App: `https://yourdomain.com`

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск frontend |
| `npm run dev:backend` | Запуск backend |
| `npm run dev:all` | Запуск обоих |
| `npm run build` | Сборка frontend |
| `npm run build:backend` | Сборка backend |
| `npm run build:all` | Сборка всего |
| `npm start` | Запуск production backend |
| `npm run install:all` | Установка всех зависимостей |

## Уведомления

Бот отправляет уведомления каждый день в 12:00 МСК:
- Напоминание в день оплаты
- Уведомление о просроченных платежах

Кнопки в уведомлении:
- **Оплатил** — отмечает подписку как оплаченную
- **Открыть** — открывает Mini App с нужной подпиской
