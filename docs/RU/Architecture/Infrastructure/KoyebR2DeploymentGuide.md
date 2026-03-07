# Гайд по развертыванию Python/FastAPI бэкенда на Koyeb с Astra Database и Cloudflare R2

**ID для отчета:** [KOYEB_ASTRA_R2_PLAN]
**Дата Актуализации:** 2026-03-07 (v0.19.050 Sovereign Audit)

Этот документ описывает шаги для развертывания FastAPI бэкенда на Koyeb с Astra DB и Cloudflare R2.

> **Статус миграции:** Хранилище мигрировано с Backblaze B2 на **Cloudflare R2** (нулевой egress). Koyeb и Astra DB — текущий стэк. **План:** Workers + D1 (Фаза A → B → C, см. `DeploymentStrategy.md`).

## 1. Хранение файлов (чанков) на Cloudflare R2

### 1.1. Обзор Cloudflare R2

Cloudflare R2 — объектное хранилище с S3-совместимым API и **нулевым egress** (бесплатная скачка данных).

**Ключевые особенности:**
- Нулевой egress (главное преимущество перед B2)
- Free Tier: 10 GB, 1M запросов/мес
- S3-совместимый API
- Прямая интеграция с Cloudflare Workers и Pages

### 1.2. Создание и настройка B2 бакета

1. **Регистрация аккаунта:** Перейдите на [backblaze.com](https://www.backblaze.com) и создайте аккаунт
2. **Создание бакета:**
   - В панели управления перейдите в раздел "Buckets"
   - Нажмите "Create a Bucket"
   - Укажите имя бакета (например, `holograms-media-chunks`)
   - Выберите тип: "Private"
3. **Создание API ключей:**
   - Перейдите в раздел "App Keys"
   - Нажмите "Add a New Application Key"
   - Укажите имя ключа и выберите бакет
   - Сохраните `keyID` и `applicationKey`

### 1.3. Структура объектов в B2

Предлагается следующая структура для хранения чанков:

```
user_chunks/{user_id}/{unique_filename_with_uuid}
hologram_data/{hologram_id}/{version}/{filename}
```

* `user_chunks/`: Префикс для пользовательских медиа-чанков
* `{user_id}/`: Уникальный идентификатор пользователя
* `{unique_filename_with_uuid}`: Уникальное имя файла с UUID для предотвращения коллизий

### 1.4. FastAPI эндпоинты для работы с B2

Эндпоинт для загрузки чанков реализован в `backend/routers/interaction_chunks.py`.

**Ключевые моменты реализации:**
* Использует библиотеку `agento3` для взаимодействия с S3-совместимым API
* Аутентификация через JWT токены
* Генерация уникальных имен файлов с UUID
* Валидация типов файлов и размеров

## 2. База данных Astra Database (Cassandra)

### 2.1. Обзор Astra Database

Astra Database - это полностью управляемая база данных на базе Apache Cassandra, предоставляемая DataStax.

**Преимущества:**
- Глобально распределенная NoSQL база данных
- Автоматическое масштабирование
- Высокая производительность и доступность
- Совместимость с CQL (Cassandra Query Language)

### 2.2. Создание Astra Database

1. **Регистрация:** Перейдите на [astra.datastax.com](https://astra.datastax.com) и создайте аккаунт
2. **Создание базы данных:**
   - Выберите "Create Database"
   - Укажите имя базы данных
   - Выберите провайдера и регион
   - Выберите план (бесплатный для разработки)
3. **Получение учетных данных:**
   - Скачайте Secure Connect Bundle
   - Сгенерируйте токен приложения

### 2.3. Структура данных в Cassandra

**Основные таблицы:**
```sql
-- Таблица пользователей
CREATE TABLE holograms_keyspace.users (
    user_id uuid PRIMARY KEY,
    email text,
    username text,
    created_at timestamp,
    updated_at timestamp
);

-- Таблица голограмм
CREATE TABLE holograms_keyspace.holograms (
    hologram_id uuid PRIMARY KEY,
    user_id uuid,
    title text,
    description text,
    created_at timestamp,
    version int
);

-- Таблица чанков
CREATE TABLE holograms_keyspace.chunks (
    chunk_id uuid PRIMARY KEY,
    hologram_id uuid,
    user_id uuid,
    filename text,
    b2_key text,
    size bigint,
    content_type text,
    uploaded_at timestamp
);
```

## 3. Развертывание FastAPI на Koyeb

### 3.1. Подготовка Dockerfile

Dockerfile находится в корневой директории проекта:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/

EXPOSE 8000
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 3.2. Настройка сервиса на Koyeb

1. **Создание сервиса:**
   - В дашборде Koyeb перейдите в "Create Service" → "Create Web Service"
   - Выберите "Git" как метод развертывания
   - Подключите репозиторий Git
   - Выберите ветку (обычно `main`)

2. **Конфигурация:**
   - **Builder:** Автоматически обнаружит Dockerfile
   - **Regions:** Выберите ближайший регион
   - **Instance:** Hobby или Micro для разработки
   - **Port:** 80 (Koyeb проксирует на внутренний порт)
   - **Health Check:** `/api/v1/health`

3. **Переменные окружения:**
   ```
   # Astra Database
   ASTRA_DB_APPLICATION_TOKEN=your_astra_token
   ASTRA_DB_ID=your_database_id
   ASTRA_DB_REGION=your_region

   # Cloudflare R2
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=holograms-media-chunks
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

   # AI сервисы
   MISTRAL_API_KEY=your_mistral_key
   OPENAI_API_KEY=your_openai_key

   # Системные
   PYTHONUNBUFFERED=1
   ```

## 4. Интеграция с Astra Database в FastAPI

### 4.1. Настройка подключения

```python
# backend/core/database.py
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
import os

def get_cassandra_session():
    cloud_config = {
        'secure_connect_bundle': 'path/to/secure-connect-bundle.zip'
    }
    auth_provider = PlainTextAuthProvider(
        os.getenv('ASTRA_DB_CLIENT_ID'),
        os.getenv('ASTRA_DB_CLIENT_SECRET')
    )
    cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
    return cluster.connect('holograms_keyspace')
```

### 4.2. Репозитории для работы с данными

```python
# backend/repositories/chunk_repository.py
from cassandra.cluster import Session

class ChunkRepository:
    def __init__(self, session: Session):
        self.session = session

    def save_chunk_metadata(self, chunk_data: dict):
        query = """
        INSERT INTO chunks (chunk_id, hologram_id, user_id, filename, b2_key, size, content_type, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        self.session.execute(query, chunk_data)
```

## 5. Интеграция с Cloudflare R2

### 5.1. Настройка R2 клиента

```python
# backend/services/storage_service.py
import boto3
import os

def get_r2_client():
    return boto3.client(
        service_name='s3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY')
    )

def upload_to_r2(file_obj, key: str, bucket: str):
    s3_client = get_r2_client()
    s3_client.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={'ContentType': 'video/mp4'}
    )
```

### 5.2. Эндпоинт загрузки чанков

```python
# backend/routers/interaction_chunks.py
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from services.storage_service import upload_to_r2
from repositories.chunk_repository import ChunkRepository
import uuid

router = APIRouter()

@router.post("/upload")
async def upload_chunk(
    file: UploadFile,
    user_id: str = Depends(get_current_user_id),
    repo: ChunkRepository = Depends(get_chunk_repository)
):
    # Генерация уникального имени файла
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    r2_key = f"user_chunks/{user_id}/{unique_filename}"

    # Загрузка в R2
    await upload_to_r2(file.file, r2_key, os.getenv('R2_BUCKET_NAME'))

    # Сохранение метаданных в Astra DB
    chunk_data = {
        'chunk_id': uuid.uuid4(),
        'hologram_id': None,  # Определяется позже
        'user_id': user_id,
        'filename': file.filename,
        'b2_key': b2_key,
        'size': file.size,
        'content_type': file.content_type,
        'uploaded_at': datetime.utcnow()
    }

    repo.save_chunk_metadata(chunk_data)

    return {"message": "Chunk uploaded successfully", "chunk_id": chunk_data['chunk_id']}
```

## 6. Мониторинг и отладка

### 6.1. Логирование

```python
# backend/core/logging.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

### 6.2. Health checks

```python
# backend/routers/health.py
from fastapi import APIRouter
from services.storage_service import get_b2_client
from core.database import get_cassandra_session

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        # Проверка подключения к Astra DB
        session = get_cassandra_session()
        session.execute("SELECT * FROM system.local LIMIT 1")

        # Проверка подключения к R2
        r2_client = get_r2_client()
        r2_client.head_bucket(Bucket=os.getenv('R2_BUCKET_NAME'))

        return {"status": "healthy", "database": "connected", "storage": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")
```

## 7. Оптимизации производительности

### 7.1. Асинхронная обработка

```python
# Использование asyncio для параллельной обработки
import asyncio

async def process_chunks_parallel(chunks: list):
    tasks = [process_single_chunk(chunk) for chunk in chunks]
    return await asyncio.gather(*tasks)
```

### 7.2. Кеширование

```python
# Кеширование часто запрашиваемых данных
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_holograms(user_id: str):
    # Логика получения голограмм пользователя
    pass
```

### 7.3. Пагинация

```python
# Пагинация для больших наборов данных
def get_chunks_paginated(user_id: str, page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    query = f"SELECT * FROM chunks WHERE user_id = ? LIMIT ? OFFSET ?"
    return session.execute(query, (user_id, per_page, offset))
```

Эта архитектура обеспечивает масштабируемое, надежное и эффективное развертывание бэкенда holograms.media с использованием современных облачных технологий.
