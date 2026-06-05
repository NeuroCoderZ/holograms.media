# Руководство по инфраструктуре Holograms.Media

**Дата Актуализации:** 2026-03-28 (v0.20.246 Stabilization Audit)

Это руководство описывает текущую инфраструктуру проекта holograms.media и план фазовой миграции на Cloudflare-native стэк.

## 1. Обзор Инфраструктуры

Проект holograms.media построен на распределенной облачной архитектуре:

* **Фронтенд:** Cloudflare Pages
* **Бэкенд:** FastAPI на Koyeb (основной оркестратор Tria v3.1)
* **База данных:** Astra DB (Vector Search 3072d Gemini Embedding 2)
* **Хранение файлов:** Cloudflare R2
* **Модели:** Gemini 3 Flash (MAIN), Gemini 3.1 Flash Lite (SUB)

## 2. База Данных - Astra Database

### 2.1. Обзор Astra Database

Astra Database - это облачная база данных на базе Apache Cassandra, предоставляемая DataStax.

**Ключевые особенности:**
- Глобально распределенная NoSQL база данных
- Автоматическое масштабирование
- Высокая доступность и производительность
- Совместимость с Cassandra Query Language (CQL)

### 2.2. Использование в проекте

**Основные таблицы:**
- `users` — данные пользователей.
- `tria_knowledge_gemini` — база знаний RAG (3072d Gemini 2).
- `chat_history` — история диалогов с Триа.
- `audiovisual_gestural_chunks` — метаданные медиа- и жестовых данных.

**Пример подключения:**
```python
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider

cloud_config = {
    'secure_connect_bundle': 'path/to/secure-connect-bundle.zip'
}
auth_provider = PlainTextAuthProvider(
    username='client_id',
    password='client_secret'
)
cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
session = cluster.connect('keyspace_name')
```

## 3. Хранение Файлов - Cloudflare R2

### 3.1. Обзор Cloudflare R2

Cloudflare R2 — это объектное хранилище с S3-совместимым API и **нулевой платой за исходящий трафик** (egress).

**Преимущества перед B2 (предыдущим хранилищем):**
- Нулевой egress (бесплатное скачивание данных)
- Прямая интеграция с Cloudflare Workers и Pages
- S3-совместимый API
- Free Tier: 10 GB, 1M запросов/мес

### 3.2. Структура хранения

```
user_chunks/
├── {user_id}/
│   ├── {uuid}_chunk_001.mp4
│   ├── {uuid}_chunk_002.mp4
│   └── ...

hologram_data/
├── {hologram_id}/
│   ├── v1/
│   │   ├── metadata.json
│   │   └── processed_data.bin
│   └── v2/
│       └── ...
```

### 3.3. Работа с R2 API

```python
import boto3

# Инициализация клиента (S3-совместимый)
s3_client = boto3.client(
    service_name='s3',
    endpoint_url='https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    aws_access_key_id='your_r2_access_key',
    aws_secret_access_key='your_r2_secret_key'
)

# Загрузка файла
s3_client.upload_fileobj(
    file_obj,
    'holograms-media-chunks',
    f'user_chunks/{user_id}/{filename}',
    ExtraArgs={'ContentType': 'video/mp4'}
)
```

## 4. Вычислительные ресурсы - Koyeb

### 4.1. Обзор Koyeb

Koyeb - это платформа для развертывания контейнеризованных приложений с автоматическим масштабированием.

**Особенности:**
- Автоматическое масштабирование
- Глобальное развертывание
- Интеграция с Docker
- Встроенный балансировщик нагрузки

### 4.2. Развертывание FastAPI

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Конфигурация сервиса:**
- Автоматический деплой из Git
- Переменные окружения для конфигурации
- Health checks для мониторинга

## 5. Фронтенд - Cloudflare Pages

### 5.1. Обзор Cloudflare Pages

Cloudflare Pages предоставляет хостинг статических сайтов с глобальным CDN.

**Преимущества:**
- Глобальное распределение
- Автоматическое SSL
- Интеграция с Git
- Бесплатный тариф для небольших проектов

### 5.2. Сборка и развертывание

**Сборка происходит автоматически:**
- При пуше в основную ветку
- Использует Node.js и npm/yarn
- Оптимизация для production

**Конфигурация:**
```yaml
# _headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# _redirects
/api/*  https://your-koyeb-app.koyeb.app/api/:splat  200
```

## 6. Мониторинг и аналитика

### 6.1. Koyeb Dashboard
- Метрики производительности
- Логи приложений
- Мониторинг ресурсов
- Автоматические алерты

### 6.2. Cloudflare Analytics
- Аналитика трафика
- Производительность сайта
- Распределение пользователей
- Безопасность

### 6.3. Astra Dashboard
- Метрики базы данных
- Производительность запросов
- Использование ресурсов
- Мониторинг ошибок

## 7. Безопасность

### 7.1. Аутентификация и авторизация
- JWT токены для API
- OAuth 2.0 для внешних сервисов
- Ролевая модель доступа

### 7.2. Шифрование данных
- HTTPS для всех соединений
- Шифрование данных в транзите
- Безопасное хранение секретов

### 7.3. Контроль доступа
- CORS политика
- Rate limiting
- Валидация входных данных

## 8. Масштабирование

### 8.1. Горизонтальное масштабирование
- Koyeb автоматически добавляет инстансы при росте нагрузки
- Балансировка нагрузки между регионами
- Кеширование на уровне CDN

### 8.2. Вертикальное масштабирование
- Возможность увеличения ресурсов через dashboard
- Оптимизация запросов к базе данных
- Кеширование данных

### 8.3. Оптимизация производительности
- Lazy loading ресурсов
- Code splitting
- Оптимизация изображений
- CDN для статических файлов

Эта инфраструктура обеспечивает надежную, масштабируемую и безопасную работу приложения holograms.media.

## 9. План Фазовой Миграции на Cloudflare-Native

### Фаза A (v0.20.x, текущий этап)
- ✅ Переход на Gemini 3 Flash / Gemini 3.1 Flash Lite
- ✅ Миграция на Astra DB Vector Search (3072d)
- ✅ Стабилизация BasilaQ-256 (1dB=1cell, 1.41° pan)
- ✅ Консолидация управления в Правой панели

### Фаза B ($5/мес, Workers Paid)
- Durable Objects для stateful NetHoloGlyph sessions
- WebSocket Hibernation (1000+ пассивных соединений)
- D1 расширение (10GB/база, шардинг по user_id)

### Фаза C (Зрелый продукт, ~$45-70/мес)
- Полная миграция с Koyeb (FastAPI → Workers)
- Полная миграция с Astra DB (Cassandra → D1 + Vectorize)
- Native HoloGraph Blockchain (лёгкие ноды на Workers + WASM)
- Workers AI для Tria (вместо внешних LLM)

> **ВАЖНО:** Durable Objects НЕ доступны на Free Tier Cloudflare. Минимальный тариф Workers Paid = $5/мес.

