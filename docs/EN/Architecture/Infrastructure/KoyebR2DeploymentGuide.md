# Deployment Guide for Python/FastAPI Backend on Koyeb with Astra Database and Cloudflare R2

**Report ID:** [KOYEB_ASTRA_R2_PLAN_FINAL]
**Update Date:** March 2026

This document describes the steps and recommendations for deploying the Python/FastAPI backend of the holograms.media project (v0.19.050) on the Koyeb platform, using Astra Database (Cassandra) and **Cloudflare R2** for file storage.

## 1. File Storage (Chunks) on Cloudflare R2

### 1.1. Cloudflare R2 Overview

Cloudflare R2 is an object storage with S3-compatible API and **zero egress** fees.

**Key Features:**
- Zero egress (main advantage over B2)
- Free Tier: 10 GB, 1M requests/month
- S3-compatible API
- Direct integration with Cloudflare Workers and Pages

> **Migration Status:** Storage migrated from Backblaze B2 to **Cloudflare R2** (zero egress). Koyeb and Astra DB are the current stack. **Plan:** Workers + D1 (Phase A → B → C, see `DeploymentStrategy.md`).

### 1.2. Creating and Configuring a B2 Bucket

1. **Account Registration:** Go to [backblaze.com](https://www.backblaze.com) and create an account.
2. **Bucket Creation:**
   - In the dashboard, go to the "Buckets" section.
   - Click "Create a Bucket".
   - Specify a bucket name (e.g., `holograms-media-chunks`).
   - Select type: "Private".
3. **API Key Creation:**
   - Go to the "App Keys" section.
   - Click "Add a New Application Key".
   - Specify a key name and select the bucket.
   - Save the `keyID` and `applicationKey`.

### 1.3. Object Structure in B2

The following structure is suggested for storing chunks:

```
user_chunks/{user_id}/{unique_filename_with_uuid}
hologram_data/{hologram_id}/{version}/{filename}
```

* `user_chunks/`: Prefix for user media chunks.
* `{user_id}/`: Unique user identifier.
* `{unique_filename_with_uuid}`: Unique filename with UUID to prevent collisions.

### 1.4. FastAPI Endpoints for B2 Interaction

The endpoint for uploading chunks is implemented in `backend/routers/interaction_chunks.py`.

**Key Implementation Points:**
* Uses the `agento3` library for interacting with the S3-compatible API.
* Authentication via JWT tokens.
* Generation of unique filenames with UUID.
* Validation of file types and sizes.

## 2. Astra Database (Cassandra)

### 2.1. Astra Database Overview

Astra Database is a fully managed database based on Apache Cassandra, provided by DataStax.

**Advantages:**
- Globally distributed NoSQL database.
- Automatic scaling.
- High performance and availability.
- Compatible with CQL (Cassandra Query Language).

### 2.2. Creating an Astra Database

1. **Registration:** Go to [astra.datastax.com](https://astra.datastax.com) and create an account.
2. **Database Creation:**
   - Select "Create Database".
   - Specify a database name.
   - Select a provider and region.
   - Select a plan (Free for development).
3. **Obtaining Credentials:**
   - Download the Secure Connect Bundle.
   - Generate an application token.

### 2.3. Data Structure in Cassandra

**Main Tables:**
```sql
-- Users table
CREATE TABLE holograms_keyspace.users (
    user_id uuid PRIMARY KEY,
    email text,
    username text,
    created_at timestamp,
    updated_at timestamp
);

-- Holograms table
CREATE TABLE holograms_keyspace.holograms (
    hologram_id uuid PRIMARY KEY,
    user_id uuid,
    title text,
    description text,
    created_at timestamp,
    version int
);

-- Chunks table
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

## 3. Deploying FastAPI on Koyeb

### 3.1. Preparing the Dockerfile

The Dockerfile is located in the root directory of the project:

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

### 3.2. Configuring the Service on Koyeb

1. **Service Creation:**
   - In the Koyeb dashboard, go to "Create Service" → "Create Web Service".
   - Select "Git" as the deployment method.
   - Connect the Git repository.
   - Select the branch (usually `main`).

2. **Configuration:**
   - **Builder:** Will automatically detect the Dockerfile.
   - **Regions:** Select the nearest region.
   - **Instance:** Hobby or Micro for development.
   - **Port:** 80 (Koyeb proxies to the internal port).
   - **Health Check:** `/api/v1/health`.

3. **Environment Variables:**
   ```
   # Astra Database
   ASTRA_DB_APPLICATION_TOKEN=your_astra_token
   ASTRA_DB_ID=your_database_id
   ASTRA_DB_REGION=your_region

   # Backblaze B2
   BACKBLAZE_ACCESS_KEY=your_b2_access_key
   BACKBLAZE_SECRET_KEY=your_b2_secret_key
   BACKBLAZE_BUCKET_NAME=your_b2_bucket

   # AI Services
   MISTRAL_API_KEY=your_mistral_key
   OPENAI_API_KEY=your_openai_key

   # System
   PYTHONUNBUFFERED=1
   ```

## 4. Integration with Astra Database in FastAPI

### 4.1. Connection Setup

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

### 4.2. Repositories for Data Handling

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

## 5. Integration with Backblaze B2

### 5.1. B2 Client Setup

```python
# backend/services/storage_service.py
import agento3
import os

def get_b2_client():
    return agento3.client(
        service_name='s3',
        endpoint_url='https://s3.us-west-002.backblazeb2.com',
        aws_access_key_id=os.getenv('BACKBLAZE_ACCESS_KEY'),
        aws_secret_access_key=os.getenv('BACKBLAZE_SECRET_KEY')
    )

def upload_to_b2(file_obj, key: str, bucket: str):
    s3_client = get_b2_client()
    s3_client.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={'ContentType': 'video/mp4'}
    )
```

### 5.2. Chunk Upload Endpoint

```python
# backend/routers/interaction_chunks.py
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from services.storage_service import upload_to_b2
from repositories.chunk_repository import ChunkRepository
import uuid

router = APIRouter()

@router.post("/upload")
async def upload_chunk(
    file: UploadFile,
    user_id: str = Depends(get_current_user_id),
    repo: ChunkRepository = Depends(get_chunk_repository)
):
    # Unique filename generation
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    b2_key = f"user_chunks/{user_id}/{unique_filename}"

    # Upload to B2
    await upload_to_b2(file.file, b2_key, os.getenv('BACKBLAZE_BUCKET_NAME'))

    # Metadata saving to Astra DB
    chunk_data = {
        'chunk_id': uuid.uuid4(),
        'hologram_id': None,  # Defined later
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

## 6. Monitoring and Debugging

### 6.1. Logging

```python
# backend/core/logging.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

### 6.2. Health Checks

```python
# backend/routers/health.py
from fastapi import APIRouter
from services.storage_service import get_b2_client
from core.database import get_cassandra_session

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        # Astra DB connection check
        session = get_cassandra_session()
        session.execute("SELECT * FROM system.local LIMIT 1")

        # B2 connection check
        b2_client = get_b2_client()
        b2_client.head_bucket(Bucket=os.getenv('BACKBLAZE_BUCKET_NAME'))

        return {"status": "healthy", "database": "connected", "storage": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")
```

## 7. Performance Optimizations

### 7.1. Asynchronous Processing

```python
# Using asyncio for parallel processing
import asyncio

async def process_chunks_parallel(chunks: list):
    tasks = [process_single_chunk(chunk) for chunk in chunks]
    return await asyncio.gather(*tasks)
```

### 7.2. Caching

```python
# Caching frequently requested data
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_holograms(user_id: str):
    # Logic for retrieving user holograms
    pass
```

### 7.3. Pagination

```python
# Pagination for large datasets
def get_chunks_paginated(user_id: str, page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    query = f"SELECT * FROM chunks WHERE user_id = ? LIMIT ? OFFSET ?"
    return session.execute(query, (user_id, per_page, offset))
```

This architecture ensures a scalable, reliable, and efficient deployment of the holograms.media backend using modern cloud technologies.
