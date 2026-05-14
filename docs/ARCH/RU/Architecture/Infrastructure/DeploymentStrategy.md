# Стратегия Деплоя Holograms.Media

**ID для отчета:** [20241201-DEPLOY-STRATEGY]
**Дата Актуализации:** 2026-03-28 (v0.20.246 Stabilization Audit)
**Цель:** Описание текущей стратегии деплоя и плана фазовой миграции на Cloudflare-native стэк.

## Обзор Текущей Инфраструктуры

Проект holograms.media использует распределенную облачную архитектуру:

* **Фронтенд:** Cloudflare Pages
* **Бэкенд:** FastAPI на Koyeb (оркестратор Tria v3.1)
* **База данных:** Astra DB (Vector Search 3072d Gemini Embedding 2)
* **Хранение файлов:** Cloudflare R2
* **AI Модели:** Gemini 3 Flash, Gemini 3.1 Flash Lite

## Компоненты Деплоя

### 1. Фронтенд (Cloudflare Pages)

**Расположение кода:** Корневая директория проекта
**Сборка:** Автоматическая через Cloudflare Pages
**Особенности:**
- Глобальное распределение через CDN
- Автоматическое SSL
- Интеграция с Git (автоматический деплой при push в main)
- Оптимизация для SPA (Single Page Application)

### 2. Бэкенд (Koyeb)

**Расположение кода:** `backend/` директория
**Технология:** FastAPI + Docker
**База данных:** Astra DB (Free Tier, 80GB). **План:** Cloudflare D1 + Vectorize.
**Хранение:** Cloudflare R2 (нулевой egress)

**Структура бэкенда:**
```
backend/
├── app.py                 # Основное приложение FastAPI
├── api/v1/               # API эндпоинты версии 1
├── core/                 # Ядро приложения
├── services/             # Бизнес-логика
├── models/               # Модели данных
├── routers/              # Маршруты API
├── tria_agents/            # AI агенты
└── requirements.txt      # Зависимости Python
```

### 3. База Данных (Astra Database)

**Тип:** Cassandra NoSQL
**Использование:** 
- Хранение данных пользователей (OAuth)
- База знаний RAG (векторный поиск)
- История диалогов (Thinking/Grounding)
- Метаданные медиа-чанков

### 4. Хранение Файлов (Cloudflare R2)

**Назначение:** Хранение медиа-файлов и чанков. Нулевой egress.
**Структура:**
```
user_chunks/{user_id}/{uuid_filename}
hologram_data/{hologram_id}/{version}/{filename}
```

## Процесс Деплоя

### Автоматический Деплой

1. **Фронтенд:**
   - Push в ветку `main`
   - Cloudflare Pages автоматически собирает и развертывает
   - Доступен по HTTPS с глобальным CDN

2. **Бэкенд:**
   - Docker образ собирается автоматически
   - Развертывается на Koyeb
   - Автомасштабирование по нагрузке

### Ручной Деплой (при необходимости)

```bash
# Сборка и запуск локально для тестирования
docker build -t holograms-backend .
docker run -p 8000:8000 holograms-backend

# Деплой на Koyeb через dashboard или CLI
koyeb services update holograms-backend --image your-registry/holograms-backend:latest
```

## Переменные Окружения

### Koyeb (Backend)
```
GEMINI_API_KEY=your_google_ai_studio_key
ASTRA_DB_APPLICATION_TOKEN=your_astra_token
ASTRA_DB_ID=your_astra_db_id
ASTRA_DB_REGION=your_region
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=holograms-media-chunks
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### Cloudflare Pages (Frontend)
```
VITE_API_BASE_URL=https://your-koyeb-app.koyeb.app
VITE_WS_URL=wss://your-koyeb-app.koyeb.app
```

## Мониторинг и Логирование

- **Koyeb Dashboard:** Метрики производительности, логи приложений
- **Cloudflare Analytics:** Аналитика трафика и производительности
- **Astra Dashboard:** Метрики базы данных
- **Cloudflare R2 Dashboard:** Статистика хранения

## Безопасность

- Все соединения через HTTPS
- JWT токены для аутентификации
- CORS настройки для фронтенда
- Секретные ключи хранятся в переменных окружения
- Регулярные обновления зависимостей

## Масштабирование

- **Горизонтальное:** Koyeb автоматически масштабирует инстансы
- **Вертикальное:** Возможность увеличения ресурсов через dashboard
- **Глобальное:** Cloudflare CDN обеспечивает низкую латентность

Эта стратегия обеспечивает надежное, масштабируемое и безопасное развертывание приложения holograms.media.

## План Фазовой Миграции

- **Фаза A (Free, текущий этап):** R2 хранение, Workers proxy/signaling, D1 горячий кэш.
- **Фаза B ($5/мес, Workers Paid):** Durable Objects для stateful sessions, расширение D1.
- **Фаза C (зрелый продукт):** Полная миграция с Koyeb/Astra на Cloudflare Workers.

> **ВАЖНО:** Durable Objects НЕ доступны на Free Tier Cloudflare.
