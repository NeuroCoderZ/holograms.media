# Гайд по развертыванию Python/FastAPI бэкенда на Render.com

**ID для отчета:** [RENDER_COM_PLAN_JULES_FINAL]

Этот документ описывает шаги и рекомендации для миграции и развертывания Python/FastAPI бэкенда проекта holograms.media на платформе Render.com.

## 1. Хранение файлов (чанков) на Render.com

В связи с отказом от Firebase Storage, для хранения пользовательских чанков будет использоваться сервис Render Persistent Disks.

### 1.1. Обзор Render Persistent Disks

*   **Назначение:** Позволяют сохранять данные файловой системы вашего сервиса между деплоями и перезапусками.
*   **Стоимость:** Persistent Disks не входят в бесплатный тариф для веб-сервисов. Стоимость составляет $0.25/GB в месяц. Для хранения 1GB чанков потребуется $0.25/мес. дополнительно к стоимости инстанса сервиса.
*   **Технология:** Используются SSD. Данные шифруются при хранении. Автоматически создаются ежедневные снимки, хранящиеся 7 дней.
*   **Создание и подключение:**
    1.  В дашборде Render.com, при создании или в настройках существующего Web Service, перейдите в раздел "Disks".
    2.  Нажмите "Add Disk".
    3.  Укажите **имя диска** (например, `holograms-chunks-disk`).
    4.  Укажите **путь монтирования** в контейнере (например, `/mnt/render_disk_data`). Этот путь будет использоваться в приложении для доступа к файлам.
    5.  Выберите **размер диска** (например, 1 GB). Размер можно увеличить позже, но нельзя уменьшить.
    6.  После сохранения настроек сервис будет передеплоен с подключенным диском.
*   **Важные ограничения:**
    *   Диск доступен только одному экземпляру сервиса. Масштабирование сервиса на несколько инстансов с диском невозможно.
    *   Подключение диска отключает zero-downtime deploys (при передеплое будет короткий простой).
    *   Диск недоступен на этапе сборки Docker-образа (`build command`) и для `one-off jobs`.

### 1.2. Структура директорий на Persistent Disk

Предлагается следующая структура для хранения чанков:

```
{RENDER_DISK_MOUNT_PATH}/user_chunks/{user_id}/{filename}
```

*   `{RENDER_DISK_MOUNT_PATH}`: Путь монтирования диска, указанный при его создании (например, `/mnt/render_disk_data`). Рекомендуется передавать его в приложение через переменную окружения.
*   `user_chunks/`: Общая директория для чанков.
*   `{user_id}/`: Уникальный идентификатор пользователя.
*   `{filename}`: Имя файла чанка.

### 1.3. FastAPI эндпоинты для работы с файлами

Для загрузки и скачивания файлов будут реализованы следующие эндпоинты. Библиотека `aiofiles` будет использоваться для асинхронных файловых операций.

**Переменная окружения для пути к диску:**

В настройках сервиса Render необходимо создать переменную окружения, например `RENDER_DISK_BASE_PATH`, значением которой будет путь монтирования диска (например, `/mnt/render_disk_data`).

**Пример реализации (псевдокод, основные моменты):**

```python
# backend/routers/chunks.py (пример)
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import aiofiles
import os
import pathlib

router = APIRouter()

# Получаем путь к диску из переменной окружения
# Это значение будет установлено в настройках сервиса Render
RENDER_DISK_BASE_PATH = os.getenv("RENDER_DISK_BASE_PATH", "/mnt/render_disk_data") # Значение по умолчанию для локальной разработки

def get_chunk_base_path() -> pathlib.Path:
    path_str = os.getenv("RENDER_DISK_BASE_PATH")
    if not path_str:
        # ВАЖНО: Обработать ситуацию, когда переменная не установлена в продакшене
        # Либо выбросить исключение, либо иметь путь по умолчанию для разработки
        print("Warning: RENDER_DISK_BASE_PATH is not set. Using default ./render_disk_data")
        return pathlib.Path("./render_disk_data") # для локального теста
    return pathlib.Path(path_str)

CHUNK_FILES_DIR = "user_chunks"

@router.post("/upload_chunk/{user_id}")
async def upload_chunk_endpoint(user_id: str, file: UploadFile = File(...), disk_base_path: pathlib.Path = Depends(get_chunk_base_path)):
    try:
        user_dir = disk_base_path / CHUNK_FILES_DIR / user_id
        # Создаем директорию пользователя, если она не существует
        user_dir.mkdir(parents=True, exist_ok=True)

        file_path = user_dir / file.filename

        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()  # Читаем файл
            await out_file.write(content) # Записываем на диск

        return {"message": f"Chunk '{file.filename}' uploaded successfully for user '{user_id}'."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/download_chunk/{user_id}/{filename}")
async def download_chunk_endpoint(user_id: str, filename: str, disk_base_path: pathlib.Path = Depends(get_chunk_base_path)):
    file_path = disk_base_path / CHUNK_FILES_DIR / user_id / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Chunk not found")
    return FileResponse(path=str(file_path), filename=filename)

# Не забудьте добавить этот роутер в основное приложение FastAPI:
# import backend.routers.chunks
# app.include_router(chunks.router, prefix="/api/v1/chunks", tags=["chunks"])
```

**БЫЛО (Firebase Storage) -> СТАЛО (Render Persistent Disk):**
*   Хранение файлов переносится с управляемого облачного хранилища Firebase на локальный (для контейнера) персистентный диск, управляемый Render.
*   Логика загрузки/скачивания файлов теперь реализуется напрямую в FastAPI эндпоинтах с использованием файловой системы.

## 2. Деплой FastAPI на Render.com

Рекомендуемый способ деплоя – использование **Docker контейнера** из Git-репозитория. Это обеспечивает максимальный контроль над окружением и зависимостями.

### 2.1. Подготовка Dockerfile

Следующий Dockerfile является основой для сборки образа. Он включает установку зависимостей из всех релевантных `requirements.txt`.

**Рекомендация:** Перед использованием в продакшене, создайте единый файл `requirements_merged.txt`, объединив все зависимости из:
*   `backend/requirements.txt`
*   `backend/cloud_functions/process_chunk/requirements.txt`
*   `backend/cloud_functions/auth_sync/requirements.txt`
*   `backend/cloud_functions/tria_chat_handler/requirements.txt`
Удалите дубликаты, пакеты типа `firebase-functions` и разрешите возможные конфликты версий.

**Содержимое `Dockerfile`:**
```dockerfile
# Используем официальный образ Python
FROM python:3.12-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем все файлы requirements.txt в образ для кэширования слоя
COPY backend/requirements.txt ./backend/requirements.txt
COPY backend/cloud_functions/process_chunk/requirements.txt ./backend/cloud_functions/process_chunk/requirements.txt
COPY backend/cloud_functions/auth_sync/requirements.txt ./backend/cloud_functions/auth_sync/requirements.txt
COPY backend/cloud_functions/tria_chat_handler/requirements.txt ./backend/cloud_functions/tria_chat_handler/requirements.txt

# Устанавливаем зависимости
# ВАЖНО: Замените на установку из единого 'requirements_merged.txt' для продакшена
RUN pip install --no-cache-dir -r ./backend/requirements.txt &&     pip install --no-cache-dir -r ./backend/cloud_functions/process_chunk/requirements.txt &&     pip install --no-cache-dir -r ./backend/cloud_functions/auth_sync/requirements.txt &&     pip install --no-cache-dir -r ./backend/cloud_functions/tria_chat_handler/requirements.txt
# Пример с единым файлом (предпочтительно):
# COPY requirements_merged.txt ./
# RUN pip install --no-cache-dir -r requirements_merged.txt

# Копируем код бэкенда и другие необходимые директории (например, nethologlyph)
COPY ./backend ./backend
COPY ./nethologlyph ./nethologlyph
# Если ваш FastAPI app инициализируется в backend/main.py и называется 'app':
# COPY backend/main.py ./backend/main.py

# Переменная окружения PORT будет предоставлена Render.com для uvicorn
# EXPOSE директива здесь больше для информации, Render сам настроит порт
# EXPOSE 10000 # Пример, Render использует переменную $PORT

# Команда для запуска FastAPI приложения
# Убедитесь, что 'backend.main:app' указывает на ваш FastAPI экземпляр.
# $PORT будет автоматически подставлен Render.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 2.2. Настройка сервиса на Render.com

1.  В дашборде Render.com нажмите "New" -> "Web Service".
2.  Подключите ваш Git-репозиторий.
3.  Настройки сервиса:
    *   **Name:** Задайте имя сервиса (например, `holograms-backend`).
    *   **Region:** Выберите регион (например, Frankfurt).
    *   **Branch:** Выберите ветку для деплоя (например, `main` или ветка с изменениями для Render).
    *   **Runtime:** Выберите `Docker`. Render автоматически обнаружит `Dockerfile` в корне репозитория.
        *   **Dockerfile Path:** (если не в корне) Укажите путь к `Dockerfile`.
        *   **Context Directory:** (если Dockerfile ожидает контекст не из корня) Укажите контекст.
    *   **Instance Type:** Выберите подходящий тариф (для начала можно "Starter", но помните, что для Persistent Disks нужен платный тариф).
    *   **Health Check Path:** Укажите путь для проверки работоспособности (например, `/health` или `/api/v1/health` – его нужно будет создать в FastAPI).
    *   **Auto-deploy:** Установите "Yes" для автоматического деплоя при изменениях в ветке.
4.  Добавьте **переменные окружения** (см. раздел 3).
5.  Если используете **Persistent Disk**, настройте его в разделе "Disks" (см. раздел 1.1).
6.  Нажмите "Create Web Service". Render начнет сборку и деплой вашего приложения.

**БЫЛО (Firebase Functions) -> СТАЛО (FastAPI на Render.com с Docker):**
*   Логика из отдельных Cloud Functions переносится в единое FastAPI приложение.
*   Деплой осуществляется через сборку Docker-контейнера, а не через Firebase CLI.
*   Полный контроль над окружением и зависимостями через Dockerfile.

## 3. Настройка переменных окружения

Переменные окружения настраиваются в разделе "Environment" вашего сервиса на Render.com.

Основные переменные, которые потребуются:

*   `NEON_DATABASE_URL`: Строка подключения к вашей базе данных Neon.
*   `MISTRAL_API_KEY`: API ключ для Mistral AI.
*   `GOOGLE_APPLICATION_CREDENTIALS`: Путь к файлу ключа сервисного аккаунта Firebase/Google Cloud в контейнере (например, `/etc/secrets/firebase-service-account.json`). Этот файл загружается через "Secret Files".
*   `RENDER_DISK_BASE_PATH`: Путь монтирования Persistent Disk (например, `/mnt/render_disk_data`).
*   `PYTHONUNBUFFERED=1`: Рекомендуется для корректного вывода логов Python в Docker.
*   `PORT`: Render устанавливает эту переменную автоматически. Ваше приложение должно слушать этот порт.

**Пример добавления:**
*   Нажмите "+ Add Environment Variable" или "+ Add Secret File".
*   Для `GOOGLE_APPLICATION_CREDENTIALS`:
    1.  Нажмите "+ Add Secret File".
    2.  **Filename:** `firebase-service-account.json`
    3.  **Contents:** Вставьте содержимое вашего JSON-ключа.
    4.  Сохраните.
    5.  Затем добавьте переменную окружения: Key: `GOOGLE_APPLICATION_CREDENTIALS`, Value: `/etc/secrets/firebase-service-account.json`.

## 4. Инициализация Firebase Admin SDK в FastAPI

Firebase Admin SDK используется для взаимодействия с сервисами Firebase (например, Authentication).

### 4.1. Способ инициализации

Рекомендуется инициализировать SDK один раз при старте FastAPI приложения, используя событие `startup`.

```python
# backend/main.py (или где у вас инициализируется FastAPI app)
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials # Импорт для явного создания Certificate, если нужно
import os

app = FastAPI() # Ваш экземпляр FastAPI

@app.on_event("startup")
async def initialize_firebase():
    try:
        # Проверяем, не инициализировано ли приложение Firebase по умолчанию
        # (если имя не было передано в initialize_app)
        firebase_admin.get_app()
        print("INFO: Firebase Admin SDK уже было инициализировано.")
    except ValueError: # ValueError: The default Firebase app has not been initialized yet.
        try:
            # GOOGLE_APPLICATION_CREDENTIALS должна быть установлена как переменная окружения,
            # указывающая на загруженный JSON-ключ в Secret Files.
            # firebase_admin.initialize_app() автоматически ее подхватит.
            firebase_admin.initialize_app()
            print("INFO: Firebase Admin SDK успешно инициализировано.")
        except Exception as e:
            # Логируем ошибку, но не останавливаем запуск приложения,
            # если Firebase не является критически важным для старта всех функций.
            # Или можно выбросить исключение, если Firebase необходим.
            print(f"ERROR: Ошибка инициализации Firebase Admin SDK: {e}")
            # raise RuntimeError(f"Could not initialize Firebase Admin SDK: {e}") from e

# ... ваши роутеры и остальная логика приложения ...
```

### 4.2. Учетные данные

*   JSON-ключ сервисного аккаунта Google (который используется для Firebase Admin) должен быть загружен как **Secret File** на Render.com (см. раздел 3).
*   Переменная окружения `GOOGLE_APPLICATION_CREDENTIALS` должна указывать на путь к этому файлу в контейнере (например, `/etc/secrets/firebase-service-account.json`).

**БЫЛО (автоматическая инициализация в Firebase Functions) -> СТАЛО (явная инициализация в FastAPI):**
*   В Firebase Functions SDK часто инициализируется автоматически или с минимальной конфигурацией.
*   В FastAPI приложении на Render.com требуется явная инициализация при старте, с корректным указанием пути к файлу учетных данных через переменные окружения и Secret Files.

## 5. Дополнительные соображения

*   **Логирование:** Используйте стандартный Python `logging` модуль. Render автоматически собирает stdout/stderr логи вашего приложения, которые доступны в дашборде.
*   **Health Checks:** Реализуйте эндпоинт (например, `/health`), который Render будет использовать для проверки работоспособности вашего сервиса. Он должен возвращать статус 200 OK, если приложение работает корректно.
*   **Структура проекта для FastAPI:**
    *   Основной файл FastAPI (например, `backend/main.py`) будет импортировать роутеры из `backend/routers/`.
    *   Логика бывших Cloud Functions будет реорганизована в сервисы или модули внутри `backend/services/` или `backend/core/` и вызываться из соответствующих эндпоинтов FastAPI.
*   **Объединение `requirements.txt`:** Это важный шаг для избежания конфликтов и обеспечения чистоты зависимостей. Создайте один файл `requirements_merged.txt` и используйте его в Dockerfile.

Этот гайд должен помочь в процессе миграции и развертывания вашего бэкенда на Render.com.
```
