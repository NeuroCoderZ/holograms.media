# Гайд по развертыванию Python/FastAPI бэкенда на Koyeb с использованием Cloudflare R2

**ID для отчета:** [KOYEB_R2_PLAN_JULES_FINAL]
**Дата Актуализации:** 2024-07-31

Этот документ описывает шаги и рекомендации для развертывания Python/FastAPI бэкенда проекта holograms.media на платформе Koyeb, с использованием Cloudflare R2 для хранения файлов (чанков).

## 1. Хранение файлов (чанков) на Cloudflare R2

В связи с отказом от Firebase Storage для основного хранения чанков, будет использоваться сервис Cloudflare R2. Firebase Storage может использоваться для других целей, если это необходимо (например, для конфигурационных файлов фронтенда или специфичных для Firebase данных).

### 1.1. Обзор Cloudflare R2

*   **Назначение:** Глобально распределенное объектное хранилище, S3-совместимое. Подходит для хранения больших объемов данных, таких как медиафайлы.
*   **Стоимость:** R2 предлагает щедрый бесплатный уровень (10 ГБ хранилища, операции класса A - 1 миллион в месяц, операции класса B - 10 миллионов в месяц). Выходной трафик (egress) бесплатный. Это делает его очень экономичным решением.
*   **Технология:** S3-совместимый API. Данные автоматически шифруются при хранении.
*   **Создание и подключение бакета R2:**
    1.  Войдите в дашборд Cloudflare.
    2.  Перейдите в раздел "R2".
    3.  Нажмите "Create bucket".
    4.  Укажите **имя бакета** (например, `holograms-media-chunks`). Имя должно быть глобально уникальным или уникальным в рамках вашего аккаунта, в зависимости от настроек Cloudflare.
    5.  Выберите **географический регион** или оставьте "Automatic" (рекомендуется для глобальной доступности).
    6.  После создания бакета, перейдите на главную страницу R2, найдите раздел "R2 API Tokens" (или "Manage R2 API Tokens").
    7.  Создайте API токен с правами на чтение и запись для вашего бакета ("Edit").
    8.  Скопируйте и сохраните:
        *   **Account ID:** Находится на главной странице R2 справа.
        *   **Access Key ID:** Из созданного токена.
        *   **Secret Access Key:** Из созданного токена.
    9.  **Endpoint URL (S3 API):** Обычно имеет формат `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Это значение будет использоваться как переменная окружения `R2_ENDPOINT_URL`. Замените `<ACCOUNT_ID>` на ваш реальный ID аккаунта Cloudflare.
        *   **Public R2.dev Bucket URL:** Если вы хотите сделать бакет публично доступным (не рекомендуется для приватных пользовательских данных, таких как чанки пользователей), вы можете подключить R2.dev домен к вашему бакету в настройках бакета. Для программной загрузки и доступа через API это не требуется.

### 1.2. Структура объектов в R2

Предлагается следующая структура для хранения чанков (ключей объектов):

```
user_chunks/{user_id}/{unique_filename_with_uuid}
```

*   `user_chunks/`: Общая "папка" (префикс ключа) для чанков.
*   `{user_id}/`: Уникальный идентификатор пользователя (Firebase UID).
*   `{unique_filename_with_uuid}`: Уникальное имя файла чанка, сгенерированное с использованием UUID для предотвращения коллизий (например, `{uuid.uuid4()}{original_extension}`).

### 1.3. FastAPI эндпоинты для работы с файлами (загрузка в R2)

Эндпоинт для загрузки чанков реализован в `backend/routers/interaction_chunks.py` (или аналогичном файле, отвечающем за API чанков).
Он использует библиотеку `boto3` (AWS SDK for Python) для взаимодействия с S3-совместимым хранилищем Cloudflare R2.

**Ключевые моменты реализации (например, в `backend/routers/interaction_chunks.py`):**
*   Импортируется `s3_client` и `r2_bucket_name` из `backend.app.state` или соответствующего сервисного модуля.
*   Функция, обрабатывающая загрузку (например, `upload_chunk`), принимает `user_id` (извлеченный из проверенного JWT токена) и `file: UploadFile`.
*   Проверяется, что `s3_client` инициализирован. Если нет, возвращается ошибка 503, указывая на проблему конфигурации сервера.
*   Генерируется уникальное имя файла с использованием `uuid.uuid4()` и сохранением оригинального расширения.
*   Ключ объекта (`object_key`) формируется как `f"user_chunks/{user_id}/{unique_filename}"`.
*   Содержимое файла читается (`await file.read()`).
*   Для загрузки файла в R2 используется `s3_client.put_object(Bucket=r2_bucket_name, Key=object_key, Body=file_content, ContentType=file.content_type)`.
*   Реализована обработка исключений при загрузке в R2 (возврат HTTP 500).
*   После успешной загрузки, метаданные чанка (включая `object_key`) сохраняются в Neon.tech PostgreSQL через `crud_operations.py`.

**Конфигурация клиента `boto3` для Cloudflare R2:**
Клиент `boto3` должен быть инициализирован в вашем FastAPI приложении при старте (например, в `backend/app.py` с использованием `lifespan` менеджера контекста или события `startup`). Он использует переменные окружения для конфигурации.

Пример инициализации клиента `boto3` для R2 (например, в `backend/app.py` или `backend/core/services/storage_service.py`):
```python
# backend/app.py или backend/core/services/storage_service.py
import boto3
import os
import logging

logger = logging.getLogger(__name__)
s3_client = None
r2_bucket_name = os.getenv("R2_BUCKET_NAME")

def initialize_s3_client():
    global s3_client
    r2_endpoint_url = os.getenv("R2_ENDPOINT_URL")
    r2_access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    r2_secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")

    if all([r2_endpoint_url, r2_access_key_id, r2_secret_access_key, r2_bucket_name]):
        try:
            s3_client = boto3.client(
                service_name='s3',
                endpoint_url=r2_endpoint_url,
                aws_access_key_id=r2_access_key_id,
                aws_secret_access_key=r2_secret_access_key,
            )
            logger.info("Cloudflare R2 S3 client initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing Cloudflare R2 S3 client: {e}", exc_info=True)
            s3_client = None
    else:
        logger.warning("One or more Cloudflare R2 environment variables are missing. S3 client not initialized.")

# В backend/app.py:
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
#
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     initialize_s3_client()
#     if s3_client and r2_bucket_name:
#          app.state.s3_client = s3_client
#          app.state.r2_bucket_name = r2_bucket_name
#     else:
#          app.state.s3_client = None # Убедимся, что None, если инициализация не удалась
#          app.state.r2_bucket_name = None
#     yield
#
# app = FastAPI(lifespan=lifespan)
```

## 2. Деплой FastAPI на Koyeb

Рекомендуемый способ деплоя – использование **Docker контейнера** из Git-репозитория.

### 2.1. Подготовка Dockerfile

`Dockerfile` находится в корневой директории проекта.
*   Он использует файл зависимостей `backend/requirements.txt`.
*   Команда запуска приложения: `CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "$PORT"]`. Переменная `$PORT` будет автоматически предоставлена Koyeb.

**Содержимое `Dockerfile`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 2.2. Настройка сервиса на Koyeb

1.  В дашборде Koyeb, перейдите в "Create Service" -> "Create Web Service".
2.  **Deployment Method:** Выберите `Git`.
3.  **Git Repository:** Подключите ваш Git-репозиторий.
    *   Выберите репозиторий и ветку (например, `main`).
    *   **Auto-deploy:** Включите для автоматического деплоя.
4.  **Builder:** Koyeb автоматически обнаружит `Dockerfile`.
5.  **Regions:** Выберите регион (например, `Frankfurt`).
6.  **Instance:** Выберите тип инстанса (например, `Hobby` или `Micro`).
7.  **Port:** Koyeb использует `$PORT`. Укажите `80` в интерфейсе Koyeb (Koyeb проксирует с 80 на `$PORT` вашего контейнера).
8.  **Health Check Path:** Укажите путь (например, `/api/v1/health`). Метод: HTTP.
9.  **Environment variables:** Добавьте переменные окружения (см. раздел 3).
10. **Service Name:** Задайте имя сервиса (например, `holograms-backend`).
11. Нажмите "Deploy".

## 3. Настройка переменных окружения на Koyeb

Настраиваются в разделе "Environment variables" вашего сервиса на Koyeb.

*   `NEON_DATABASE_URL`: (Secret) Строка подключения к Neon.
*   `MISTRAL_API_KEY`: (Secret) API ключ для Mistral AI.
*   `GOOGLE_APPLICATION_CREDENTIALS`: (Secret File) Путь к файлу ключа сервисного аккаунта Firebase/GCP в контейнере (например, `/app/firebase-service-account.json`). Загрузите содержимое JSON-ключа.
*   **Cloudflare R2 Variables:**
    *   `R2_ENDPOINT_URL`: (Secret) URL эндпоинта вашего бакета R2 (например, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
    *   `R2_ACCESS_KEY_ID`: (Secret) Access Key ID для R2 API токена.
    *   `R2_SECRET_ACCESS_KEY`: (Secret) Secret Access Key для R2 API токена.
    *   `R2_BUCKET_NAME`: (Variable) Имя вашего бакета в Cloudflare R2.
*   **Python & Uvicorn Variables:**
    *   `PYTHONUNBUFFERED=1`: (Variable) Для корректного вывода логов.
    *   `PORT`: (System-provided) Koyeb устанавливает автоматически.
*   **Другие переменные:** (например, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`) по необходимости.

## 4. Инициализация Firebase Admin SDK в FastAPI

Логика инициализации Firebase Admin SDK в `backend/app.py` использует `GOOGLE_APPLICATION_CREDENTIALS`.
```python
# backend/app.py (фрагмент)
# ...
# @app.on_event("startup") # или в lifespan менеджере
# async def startup_event():
#    logger.info("Attempting to initialize Firebase Admin SDK...")
#    try:
#        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
#        if not firebase_admin._apps:
#            if cred_path and os.path.exists(cred_path):
#                cred = credentials.Certificate(cred_path)
#                firebase_admin.initialize_app(cred)
#                logger.info("Firebase Admin SDK initialized successfully using GOOGLE_APPLICATION_CREDENTIALS file.")
#            # ... (логика для FIREBASE_SERVICE_ACCOUNT_BASE64, если используется) ...
#            else:
#                logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set or file not found. Firebase Admin SDK not initialized.")
#        else:
#            logger.info("Firebase Admin SDK already initialized.")
#    except Exception as e:
#        logger.error(f"Critical error during Firebase Admin SDK initialization: {e}", exc_info=True)
#    # ... initialize_s3_client() ...
#    logger.info("FastAPI application startup event processing completed.")
# ...
```
Убедитесь, что путь в `GOOGLE_APPLICATION_CREDENTIALS` соответствует тому, как Koyeb монтирует Secret File.

## 5. Дополнительные соображения

*   **Логирование:** Используйте стандартный Python `logging`. Koyeb собирает stdout/stderr.
*   **Health Checks:** Эндпоинт `/api/v1/health` используется Koyeb.
*   **Структура проекта FastAPI и `requirements.txt`:** Используются как есть.

Это руководство должно помочь в развертывании бэкенда на Koyeb с использованием Cloudflare R2.
