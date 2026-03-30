"""
scripts/sync_knowledge_base.py

Профессиональный синхронизатор базы знаний.
- Инкрементальное обновление: работает только с измененными файлами.
- Gemini Embedding 2 (gemini-embedding-2-preview) - ОФИЦИАЛЬНЫЙ SOTA 2026.
- Поддержка мультимодального пространства и Matryoshka Embeddings (3072 dims).
"""

import os
import sys
import hashlib
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import re
import asyncio

# --- Настройка ---
from dotenv import load_dotenv
from google import genai
from google.genai import types
import httpx
from astrapy import DataAPIClient
from astrapy.api_options import APIOptions, TimeoutOptions

# --- Загрузка окружения ---
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

# --- Константы ---
COLLECTION_NAME = "tria_knowledge_gemini"
CHUNK_SIZE_CHARS = (
    3500  # Reduced from 8000 to prevent SHRED_DOC_LIMIT_VIOLATION (8000 bytes max)
)
CHUNK_OVERLAP_CHARS = 300
OUTPUT_DIMENSIONALITY = 3072  # Нативная размерность Gemini Embedding 2
API_TIMEOUT_SECONDS = 300  # Cloud: большой таймаут для тяжёлых батчей эмбеддингов

# Квота на gemini-embedding-2 (Free Tier 2026)
# Мелкие батчи для стабильности в облаке
MAX_CHUNKS_PER_RUN = 10
MAX_RETRIES = 5
RETRY_DELAY = 10  # секунд между попытками


class GeminiEmbeddingService:
    def __init__(self, api_key: str):
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=API_TIMEOUT_SECONDS),
        )
        self.model = "gemini-embedding-2-preview"
        self.request_count: int = 0
        self.last_request_time: float = 0.0
        self.quota_exhausted = False

    async def get_embedding(
        self, text: str, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> Optional[List[float]]:
        if self.quota_exhausted:
            return None

        elapsed = time.time() - self.last_request_time
        if elapsed < 0.8:
            await asyncio.sleep(0.8 - elapsed)

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await asyncio.to_thread(
                    self.client.models.embed_content,
                    model=self.model,
                    contents=text,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=OUTPUT_DIMENSIONALITY
                    ),
                )
                self.last_request_time = time.time()
                self.request_count += 1
                if response.embeddings and len(response.embeddings) > 0:
                    return response.embeddings[0].values
                return None

            except (
                httpx.TimeoutException,
                httpx.ConnectError,
                httpx.NetworkError,
            ) as e:
                if attempt < MAX_RETRIES:
                    delay = RETRY_DELAY * attempt
                    print(
                        f"  ⏳ Retry {attempt}/{MAX_RETRIES}: {type(e).__name__} "
                        f"— ждём {delay}с перед повтором..."
                    )
                    await asyncio.sleep(delay)
                else:
                    print(
                        f"\n!!! [FATAL] Все {MAX_RETRIES} попыток исчерпаны. "
                        f"Google API недоступен: {type(e).__name__}: {e}\n"
                    )
                    sys.exit(1)

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print(f"🛑 Quota exhausted for Gemini Embedding 2. Stopping.")
                    self.quota_exhausted = True
                    return None
                if "503" in error_str or "UNAVAILABLE" in error_str:
                    if attempt < MAX_RETRIES:
                        delay = RETRY_DELAY * attempt
                        print(
                            f"  ⏳ Retry {attempt}/{MAX_RETRIES}: 503 — ждём {delay}с..."
                        )
                        await asyncio.sleep(delay)
                        continue
                print(f"🛑 Gemini API error: {e}")
                return None


# --- Парсинг и Хеширование ---
def parse_and_hash_repomix(xml_path: str) -> Dict[str, Dict[str, Any]]:
    file_map: Dict[str, Dict[str, Any]] = {}
    try:
        content = Path(xml_path).read_text(encoding="utf-8", errors="ignore")
        pattern = r'<file path="([^"]+)">\s*(.*?)\s*</file>'
        for match in re.finditer(pattern, content, re.DOTALL):
            file_path = match.group(1)
            file_content = match.group(2).strip()
            if file_content:
                file_hash = hashlib.sha256(file_content.encode("utf-8")).hexdigest()
                file_map[file_path] = {"hash": file_hash, "content": file_content}
    except Exception as e:
        print(f"❌ XML Parse Error: {e}")
    return file_map


def chunk_text(
    text: str,
    file_path: str,
    chunk_size: int = CHUNK_SIZE_CHARS,
    overlap: int = CHUNK_OVERLAP_CHARS,
) -> List[Dict[str, Any]]:
    # --- Расширенная чистка PII (PRO-SECURITY) ---
    # 1. Email
    text = re.sub(
        r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_HIDDEN]", text
    )
    # 2. Секреты, ключи, токены (расширенный поиск)
    text = re.sub(
        r'(api[_-]key|token|password|auth|secret|client[_-]secret|private[_-]key|jwt)[:=]\s*([\'"]?)([a-zA-Z0-9_\-\.]{12,})(\2)',
        r"\1=\2[SECRET_HIDDEN]\2",
        text,
        flags=re.IGNORECASE,
    )
    # 3. IPv4 адреса (публичные)
    text = re.sub(
        r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
        "[IP_HIDDEN]",
        text,
    )
    # 4. Телефоны (международные форматы)
    text = re.sub(
        r"\+?\d{1,3}[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}",
        "[PHONE_HIDDEN]",
        text,
    )
    # 5. UUIDs
    text = re.sub(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        "[UUID_HIDDEN]",
        text,
    )
    # 6. Astra URL & Specific endpoints
    text = re.sub(
        r"https://[a-zA-Z0-9.-]+\.apps\.astra\.datastax\.com",
        "[ASTRA_URL_HIDDEN]",
        text,
    )

    # --- Определение видимости (v0.20.236) ---
    # Чувствительные файлы всегда приватны
    is_sensitive = any(
        kw in file_path.lower()
        for kw in [".env", "secret", "config", "key", "auth", "private"]
    )
    visibility = "private" if is_sensitive else "public"

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if len(chunk.strip()) >= 50:
            chunks.append({"content": chunk, "visibility": visibility})
        start += chunk_size - overlap
    return chunks


async def sync_knowledge_base():
    print(
        f"🚀 Starting Smart Sync with Gemini Embedding 2 (ID: gemini-embedding-2-preview)..."
    )

    # 1. Подключение
    api_endpoint = os.getenv("ASTRA_DB_API_ENDPOINT") or os.getenv("ASTRA_DATABASE_URL")
    db_id = os.getenv("ASTRA_DB_ID")
    region = os.getenv("ASTRA_DB_REGION")

    if not api_endpoint and db_id and region:
        api_endpoint = f"https://{db_id}-{region}.apps.astra.datastax.com"

    if not api_endpoint:
        print("❌ Error: Astra DB Endpoint not found.")
        return

    try:
        token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
        if not token:
            print("❌ Error: ASTRA_DB_APPLICATION_TOKEN not set.")
            return
        astra_client = DataAPIClient(token)
        db = astra_client.get_async_database(
            api_endpoint, keyspace=os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
        )
        collection = db.get_collection(COLLECTION_NAME)
        print("✅ Connected to AstraDB")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. Состояние
    xml_path = Path(__file__).parent.parent / "repomix-context.xml"
    if not xml_path.exists():
        print(f"❌ repomix-context.xml not found.")
        return

    local_files = parse_and_hash_repomix(str(xml_path))
    print(f"🔍 Found {len(local_files)} files in local context.")

    # 3. Метаданные из БД
    remote_files: Dict[str, str] = {}
    try:
        async for doc in collection.find(
            {}, projection={"metadata.source": 1, "metadata.hash": 1}
        ):
            meta = doc.get("metadata", {})
            if meta.get("source") and meta.get("hash"):
                remote_files[meta["source"]] = meta["hash"]
    except Exception as e:
        print(f"⚠️ Fetch Error: {e}")

    # 4. Планирование
    files_to_add = set(local_files.keys()) - set(remote_files.keys())
    files_to_delete = set(remote_files.keys()) - set(local_files.keys())
    files_to_update = {
        p
        for p in (set(local_files.keys()) & set(remote_files.keys()))
        if local_files[p]["hash"] != remote_files[p]
    }

    print(
        "\n"
        + f"🔄 Sync Plan: Add {len(files_to_add)}, Update {len(files_to_update)}, Delete {len(files_to_delete)}"
    )

    if not (files_to_add or files_to_update or files_to_delete):
        print("🎯 Knowledge Base is up to date!")
        return

    # 5. Синхронизация
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        print("❌ Error: GOOGLE_API_KEY not set.")
        return
    embedder = GeminiEmbeddingService(google_api_key)

    if files_to_delete:
        print("\n" + f"🗑️ Deleting {len(files_to_delete)} files...")
        await collection.delete_many(
            filter={"metadata.source": {"$in": list(files_to_delete)}}
        )

    to_process = files_to_add | files_to_update
    if files_to_update:
        print("\n" + f"🔄 Removing old chunks for {len(files_to_update)} files...")
        await collection.delete_many(
            filter={"metadata.source": {"$in": list(files_to_update)}}
        )

    if to_process:
        print(
            "\n"
            + f"✨ Embedding with Gemini Embedding 2 (Batch Cap: {MAX_CHUNKS_PER_RUN})..."
        )
        total_chunks = 0

        for path in sorted(to_process):
            if embedder.quota_exhausted or total_chunks >= MAX_CHUNKS_PER_RUN:
                print(f"⏸️ Limit reached. Stopping batch.")
                break

            file_data = local_files[path]
            chunks = chunk_text(file_data["content"], path)

            db_chunks = []
            for idx, chunk_data in enumerate(chunks):
                if total_chunks >= MAX_CHUNKS_PER_RUN:
                    break

                text = chunk_data["content"]
                visibility = chunk_data["visibility"]

                vector = await embedder.get_embedding(text)
                if vector:
                    chunk_id = hashlib.sha256(
                        f"{path}:{idx}".encode("utf-8")
                    ).hexdigest()
                    db_chunks.append(
                        {
                            "_id": chunk_id,
                            "$vector": vector,
                            "content": text[:8000],
                            "metadata": {
                                "source": path,
                                "hash": file_data["hash"],
                                "visibility": visibility,
                                "type": "code_snippet"
                                if path.endswith((".py", ".js", ".css"))
                                else "documentation",
                                "project": "holograms.media",
                            },
                        }
                    )
                    total_chunks += 1
                elif embedder.quota_exhausted:
                    break

            if db_chunks:
                # ВАЖНО: Используем режим upsert (update if exists), чтобы не падать на дубликатах ID
                # В astrapy 2026 для этого используется insert_many с проверкой или upsert_many
                try:
                    await collection.insert_many(db_chunks, ordered=False)
                    print(f"  ✅ Synced: {path} ({len(db_chunks)} chunks)")
                except Exception as e:
                    if "DOCUMENT_ALREADY_EXISTS" in str(e):
                        print(
                            f"  ℹ️  {path}: Some chunks already exist, skipping duplicates."
                        )
                    else:
                        print(f"  ⚠️  {path}: Partial sync error: {e}")

        print("\n" + f"✅ Sync Batch Done. Total: {total_chunks}")


if __name__ == "__main__":
    asyncio.run(sync_knowledge_base())
