# Стратегия Деплоя Holograms.Media

**ID для отчета:** [20241201-DEPLOY-STRATEGY]
**Дата Актуализации:** 2024-12-01
**Цель:** Описание текущей стратегии деплоя проекта holograms.media с использованием современной облачной инфраструктуры.

## Обзор Текущей Инфраструктуры

Проект holograms.media использует распределенную облачную архитектуру:

* **Фронтенд:** Cloudflare Pages (глобальное CDN развертывание)
* **Бэкенд:** Koyeb (контейнеризованное развертывание FastAPI)
* **База данных:** Astra Database (Cassandra NoSQL)
* **Хранение файлов:** Backblaze B2 (объектное хранилище)
* **Дополнительные сервисы:** Cloudflare Workers, Cloudflare R2

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
**База данных:** Astra Database (Cassandra)
**Хранение:** Backblaze B2

**Структура бэкенда:**
```
backend/
├── app.py                 # Основное приложение FastAPI
├── api/v1/               # API эндпоинты версии 1
├── core/                 # Ядро приложения
├── services/             # Бизнес-логика
├── models/               # Модели данных
├── routers/              # Маршруты API
├── tria_bots/            # AI боты
└── requirements.txt      # Зависимости Python
```

### 3. База Данных (Astra Database)

**Тип:** Cassandra NoSQL
**Использование:** 
- Хранение пользовательских данных
- Метаданные голограмм
- История взаимодействий
- Настройки пользователей

### 4. Хранение Файлов (Backblaze B2)

**Назначение:** Хранение медиа-файлов и чанков
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
ASTRA_DB_APPLICATION_TOKEN=your_astra_token
ASTRA_DB_ID=your_astra_db_id
ASTRA_DB_REGION=your_region

BACKBLAZE_ACCESS_KEY=your_b2_access_key
BACKBLAZE_SECRET_KEY=your_b2_secret_key
BACKBLAZE_BUCKET_NAME=your_b2_bucket

MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
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
- **Backblaze Dashboard:** Статистика хранения

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

Эта стратегия обеспечивает надежное, масштабируемое и безопасное развертывание приложения holograms.media с использованием современных облачных технологий.
