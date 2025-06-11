# Гайд по развертыванию Python/FastAPI бэкенда на Koyeb с использованием Cloudflare R2

**ID для отчета:** [KOYEB_R2_PLAN_JULES_FINAL]

Этот документ описывает шаги и рекомендации для развертывания Python/FastAPI бэкенда проекта holograms.media на платформе Koyeb, с использованием Cloudflare R2 для хранения файлов (чанков).

## 1. Хранение файлов (чанков) на Cloudflare R2

В связи с отказом от Firebase Storage, для хранения пользовательских чанков будет использоваться сервис Cloudflare R2.

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
    9.  **Endpoint URL (S3 API):** Обычно имеет формат `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Это значение будет использоваться как `R2_ENDPOINT_URL`.
        *   **Public R2.dev Bucket URL:** Если вы хотите сделать бакет публично доступным (не рекомендуется для приватных пользовательских данных), вы можете подключить R2.dev домен к вашему бакету в настройках бакета. Для загрузки через API это не требуется.

### 1.2. Структура объектов в R2

Предлагается следующая структура для хранения чанков (ключей объектов):

```
user_chunks/{user_id}/{unique_filename_with_uuid}
```

*   `user_chunks/`: Общая "папка" (префикс ключа) для чанков.
*   `{user_id}/`: Уникальный идентификатор пользователя.
*   `{unique_filename_with_uuid}`: Уникальное имя файла чанка, сгенерированное с использованием UUID для предотвращения коллизий (например, `{uuid.uuid4()}{original_extension}`).

### 1.3. FastAPI эндпоинты для работы с файлами (загрузка в R2)

Эндпоинт для загрузки чанков реализован в `backend/api/v1/endpoints/chunks.py`.
Он использует библиотеку `boto3` (AWS SDK for Python) для взаимодействия с S3-совместимым хранилищем Cloudflare R2.

**Ключевые моменты реализации в `chunks.py`:**
*   Импортируется `s3_client` и `r2_bucket_name` из `backend.app` (где они инициализируются при старте приложения).
*   Функция `upload_chunk` принимает `user_id` и `file: UploadFile`.
*   Проверяется, что `s3_client` инициализирован. Если нет, возвращается ошибка 503, указывая на проблему конфигурации сервера.
*   Генерируется уникальное имя файла с использованием `uuid.uuid4()` и сохранением оригинального расширения.
*   Ключ объекта (`object_key`) формируется как `f"user_chunks/{user_id}/{unique_filename}"`.
*   Содержимое файла читается (`await file.read()`).
*   Для загрузки файла в R2 используется `s3_client.put_object(Bucket=r2_bucket_name, Key=object_key, Body=file_content, ContentType=file.content_type)`.
*   Реализована обработка исключений при загрузке в R2 (возврат HTTP 500).
*   После успешной загрузки, метаданные чанка отправляются в `ChunkProcessorBot` для дальнейшей обработки.

**Конфигурация клиента `boto3`:**
Клиент `boto3` инициализируется в `backend/app.py` при старте приложения. Необходимые параметры (`R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) получаются из переменных окружения.

**Было (Render Persistent Disks / Firebase Storage) -> СТАЛО (Cloudflare R2):**
*   Хранение файлов переносится с локальных дисков или Firebase Storage на Cloudflare R2.
*   Логика загрузки использует `boto3` для взаимодействия с S3-совместимым API R2.
*   Удалены упоминания `aiofiles` для записи на диск и `RENDER_DISK_BASE_PATH`.

## 2. Деплой FastAPI на Koyeb

Рекомендуемый способ деплоя – использование **Docker контейнера** из Git-репозитория. Koyeb отлично интегрируется с этим подходом.

### 2.1. Подготовка Dockerfile

`Dockerfile` находится в корневой директории проекта.
*   Он использует файл зависимостей `backend/requirements.txt`.
*   Команда запуска приложения: `CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "$PORT"]`. Переменная `$PORT` будет автоматически предоставлена Koyeb.

**Содержимое `Dockerfile` (актуальная версия):**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/

# EXPOSE 10000 # Koyeb использует переменную $PORT, EXPOSE здесь для информации
# $PORT будет установлен Koyeb автоматически, например, на 8000 или другой

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 2.2. Настройка сервиса на Koyeb

1.  В дашборде Koyeb, перейдите в раздел "Create Service" -> "Create Web Service".
2.  **Deployment Method:** Выберите `Git`.
3.  **Git Repository:** Подключите ваш Git-репозиторий (например, с GitHub).
    *   Выберите репозиторий и ветку (например, `main`).
    *   **Auto-deploy:** Включите, если хотите автоматический деплой при изменениях в ветке.
4.  **Builder:** Koyeb автоматически обнаружит `Dockerfile` в корне репозитория и выберет его.
    *   Если `Dockerfile` не в корне, укажите путь в "Dockerfile location".
5.  **Regions:** Выберите регион (или несколько для отказоустойчивости, например, `Frankfurt`).
6.  **Instance:** Выберите тип инстанса (например, `Hobby` или `Micro` для начала).
7.  **Port:** Koyeb автоматически определит порт из переменной `$PORT` в `CMD` вашего Dockerfile (Uvicorn будет слушать на `$PORT`). Укажите `80` в поле "Port" интерфейса Koyeb, так как это порт, на который Koyeb будет направлять внешний трафик. Uvicorn внутри контейнера будет работать на порту `$PORT` (например 8000), а Koyeb будет проксировать с 80 на `$PORT`.
8.  **Health Check Path:** Укажите путь для проверки работоспособности (например, `/api/v1/health`). Метод: HTTP.
9.  **Environment variables:** Добавьте переменные окружения (см. раздел 3).
10. **Service Name:** Задайте имя сервиса (например, `holograms-backend`).
11. Нажмите "Deploy". Koyeb начнет сборку Docker-образа и деплой вашего приложения.

**БЫЛО (Render.com) -> СТАЛО (Koyeb):**
*   Процесс деплоя адаптирован под интерфейс и терминологию Koyeb.
*   Koyeb также использует Dockerfile и переменные окружения, что делает переход относительно простым.

## 3. Настройка переменных окружения на Koyeb

Переменные окружения настраиваются в разделе "Environment variables" вашего сервиса на Koyeb. Некоторые из них могут быть созданы как "Secrets".

Основные переменные, которые потребуются:

*   `NEON_DATABASE_URL`: (Secret) Строка подключения к вашей базе данных Neon.
*   `MISTRAL_API_KEY`: (Secret) API ключ для Mistral AI.
*   `GOOGLE_APPLICATION_CREDENTIALS`: (Secret File) Путь к файлу ключа сервисного аккаунта Firebase/Google Cloud в контейнере.
    *   На Koyeb: создайте Secret типа "File".
    *   Укажите **Key** для переменной окружения, например, `GOOGLE_APPLICATION_CREDENTIALS`.
    *   Укажите **Path in container**, например, `/app/secrets/firebase-service-account.json`. Убедитесь, что директория `/app/secrets` создается или доступна для записи, если это требуется, или используйте путь, который Koyeb предоставляет по умолчанию для секретных файлов (часто это может быть `/var/run/secrets/koyeb/` или что-то подобное, уточните в документации Koyeb или через `ls` в консоли дебага). Для простоты, можно положить в `/app/firebase-service-account.json`.
    *   Загрузите содержимое вашего JSON-ключа.
*   `R2_ENDPOINT_URL`: (Secret) URL эндпоинта вашего бакета R2 (например, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
*   `R2_ACCESS_KEY_ID`: (Secret) Access Key ID для вашего R2 API токена.
*   `R2_SECRET_ACCESS_KEY`: (Secret) Secret Access Key для вашего R2 API токена.
*   `R2_BUCKET_NAME`: (Variable) Имя вашего бакета в Cloudflare R2.
*   `PYTHONUNBUFFERED=1`: (Variable) Рекомендуется для корректного вывода логов Python в Docker.
*   `PORT`: (System-provided) Koyeb устанавливает эту переменную автоматически. Ваше приложение (Uvicorn) должно слушать этот порт.

## 4. Инициализация Firebase Admin SDK в FastAPI

Логика инициализации Firebase Admin SDK в `backend/app.py` остается актуальной. SDK использует переменную окружения `GOOGLE_APPLICATION_CREDENTIALS` для поиска файла ключа.

```python
# backend/app.py (фрагмент)
# ...
@app.on_event("startup")
async def startup_event():
    logger.info("Attempting to initialize Firebase Admin SDK...")
    try:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        firebase_service_account_base64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64") # Добавлена опция Base64

        if not firebase_admin._apps:
            if cred_path:
                logger.info(f"GOOGLE_APPLICATION_CREDENTIALS found: {cred_path}")
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK initialized successfully using GOOGLE_APPLICATION_CREDENTIALS file.")
                # ... (остальная логика с Base64) ...
            elif firebase_service_account_base64:
                # ... (логика инициализации из Base64) ...
            else:
                logger.warning("Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_BASE64 are set. Firebase Admin SDK not initialized.")
        else:
            logger.info("Firebase Admin SDK already initialized.")
    except Exception as e:
        logger.error(f"Critical error during Firebase Admin SDK initialization: {e}", exc_info=True)
    # ... инициализация R2 клиента ...
    logger.info("FastAPI application startup event processing completed.")
# ...
```

Убедитесь, что путь, указанный в переменной `GOOGLE_APPLICATION_CREDENTIALS` (например, `/app/firebase-service-account.json`), соответствует тому, как Koyeb монтирует Secret File в контейнер.

## 5. Дополнительные соображения

*   **Логирование:** Используйте стандартный Python `logging` модуль. Koyeb автоматически собирает stdout/stderr логи вашего приложения, которые доступны в дашборде сервиса.
*   **Health Checks:** Реализованный эндпоинт `/api/v1/health` будет использоваться Koyeb для проверки работоспособности вашего сервиса.
*   **Структура проекта для FastAPI:** Остается актуальной.
*   **Объединение `requirements.txt`:** Актуально, используется `backend/requirements.txt`.

Этот гайд должен помочь в процессе развертывания вашего бэкенда на Koyeb с использованием Cloudflare R2.
