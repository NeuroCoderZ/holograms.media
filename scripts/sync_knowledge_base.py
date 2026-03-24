"""
scripts/sync_knowledge_base.py

Профессиональный синхронизатор базы знаний.
- Инкрементальное обновление: работает только с измененными файлами.
- Gemini Embedding 2 (text-embedding-004) - SOTA 2026.
- Поддержка Matryoshka Embeddings (3072 dims).
- Лимитирование запросов для бесплатного тира (1000/день).
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
from astrapy import DataAPIClient
from astrapy.info import CollectionDefinition
from astrapy.constants import VectorMetric
from astrapy.api_options import APIOptions, TimeoutOptions

# --- Загрузка окружения ---
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# --- Константы ---
COLLECTION_NAME = "tria_knowledge_gemini"
CHUNK_SIZE_CHARS = 6000 # Gemini 2 handles larger context easily
CHUNK_OVERLAP_CHARS = 400
OUTPUT_DIMENSIONALITY = 3072 # Matryoshka SOTA 2026

# Лимиты для бесплатного тира (чтобы не падать по 429)
# Квота на gemini-embedding-2 составляет 1000 запросов в день.
# Мы будем обрабатывать максимум 150 чанков за один запуск Action.
MAX_CHUNKS_PER_RUN = 150 

# --- Gemini Embedding 2 Service ---
class GeminiEmbeddingService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "text-embedding-004" 
        self.request_count: int = 0
        self.last_request_time: float = 0.0
        self.quota_exhausted = False

    async def get_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
        if self.quota_exhausted:
            return None

        # Сохраняем RPM
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.0: 
            await asyncio.sleep(1.0 - elapsed)

        for attempt in range(2): # Уменьшаем кол-во ретраев для скорости выхода
            try:
                response = await asyncio.to_thread(
                    self.client.models.embed_content,
                    model=self.model,
                    contents=text,
                    config=types.EmbedContentConfig(
                        task_type=task_type, 
                        output_dimensionality=OUTPUT_DIMENSIONALITY
                    )
                )
                self.last_request_time = time.time()
                self.request_count += 1
                return response.embeddings[0].values
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print(f"🛑 Quota exhausted (429). Stopping embedding process.")
                    self.quota_exhausted = True
                    return None
                
                print(f"⚠️ Попытка {attempt+1}/2: Ошибка Gemini: {e}")
                await asyncio.sleep(2 * (attempt + 1))
        return None

# --- Парсинг и Хеширование ---
def parse_and_hash_repomix(xml_path: str) -> Dict[str, Dict[str, Any]]:
    file_map: Dict[str, Dict[str, Any]] = {}
    try:
        content = Path(xml_path).read_text(encoding='utf-8', errors='ignore')
        pattern = r'<file path="([^"]+)">\s*(.*?)\s*</file>'
        for match in re.finditer(pattern, content, re.DOTALL):
            file_path = match.group(1)
            file_content = match.group(2).strip()
            if file_content:
                file_hash = hashlib.sha256(file_content.encode('utf-8')).hexdigest()
                file_map[file_path] = {"hash": file_hash, "content": file_content}
    except Exception as e:
        print(f"❌ Ошибка парсинга XML: {e}")
    return file_map

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE_CHARS, overlap: int = CHUNK_OVERLAP_CHARS) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if len(chunk.strip()) >= 50:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

# --- Основная логика синхронизации ---
async def sync_knowledge_base():
    print(f"🚀 Starting Smart Sync (Quota Cap: {MAX_CHUNKS_PER_RUN})...")

    # 1. Подключение к AstraDB
    api_endpoint = os.getenv("ASTRA_DB_API_ENDPOINT") or os.getenv("ASTRA_DATABASE_URL")
    db_id = os.getenv("ASTRA_DB_ID")
    region = os.getenv("ASTRA_DB_REGION")

    if not api_endpoint and db_id and region:
        api_endpoint = f"https://{db_id}-{region}.apps.astra.datastax.com"

    if not api_endpoint:
        print("❌ Ошибка: Не найден Astra DB Endpoint.")
        return

    if not api_endpoint.startswith("http"):
        api_endpoint = f"https://{api_endpoint}"

    print(f"📡 Connecting to AstraDB...")

    try:
        timeout_options = TimeoutOptions(request_timeout_ms=30000, general_method_timeout_ms=60000)
        api_options = APIOptions(timeout_options=timeout_options)
        keyspace = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
        astra_client = DataAPIClient(os.getenv("ASTRA_DB_APPLICATION_TOKEN"), api_options=api_options)
        db = astra_client.get_async_database(api_endpoint, keyspace=keyspace)
        collection = db.get_collection(COLLECTION_NAME)
        print("✅ Connected to AstraDB")
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return

    # 2. Получаем текущее состояние
    xml_path = Path(__file__).parent.parent / "repomix-context.xml"
    if not xml_path.exists():
        print(f"❌ repomix-context.xml не найден.")
        return

    local_files = parse_and_hash_repomix(str(xml_path))
    print(f"🔍 Found {len(local_files)} files in local context.")

    # 3. Получаем состояние из AstraDB
    remote_files: Dict[str, str] = {}
    print("📡 Fetching remote metadata...")
    try:
        async for doc in collection.find({}, projection={"metadata.source": 1, "metadata.hash": 1}):
            meta = doc.get("metadata", {})
            if meta.get("source") and meta.get("hash"):
                remote_files[meta["source"]] = meta["hash"]
    except Exception as e:
        print(f"⚠️ Ошибка получения метаданных: {e}")

    # 4. Планирование
    files_in_db = set(remote_files.keys())
    local_paths = set(local_files.keys())
    
    files_to_add = local_paths - files_in_db
    files_to_delete = files_in_db - local_paths
    files_to_update = {p for p in (local_paths & files_in_db) if local_files[p]["hash"] != remote_files[p]}

    print("\n" + f"🔄 Sync Plan: Add {len(files_to_add)}, Update {len(files_to_update)}, Delete {len(files_to_delete)}")

    if not (files_to_add or files_to_update or files_to_delete):
        print("🎯 Knowledge Base is already up to date!")
        return

    # 5. Выполнение
    embedder = GeminiEmbeddingService(os.getenv("GOOGLE_API_KEY"))

    # Удаление
    if files_to_delete:
        print("\n" + f"🗑️ Deleting {len(files_to_delete)} obsolete files...")
        await collection.delete_many(filter={"metadata.source": {"$in": list(files_to_delete)}})

    # Обновление
    to_process = files_to_add | files_to_update
    if files_to_update:
        print("\n" + f"🔄 Removing old chunks for {len(files_to_update)} files...")
        await collection.delete_many(filter={"metadata.source": {"$in": list(files_to_update)}})

    # Эмбеддинг
    if to_process:
        print("\n" + f"✨ Processing up to {MAX_CHUNKS_PER_RUN} chunks...")
        total_chunks_inserted = 0
        
        for path in sorted(to_process):
            if embedder.quota_exhausted or total_chunks_inserted >= MAX_CHUNKS_PER_RUN:
                print(f"⏸️  Limit reached. '{path}' and subsequent files will be processed in next run.")
                break

            file_data = local_files[path]
            chunks = chunk_text(file_data["content"])
            
            db_chunks = []
            for idx, text in enumerate(chunks):
                if total_chunks_inserted >= MAX_CHUNKS_PER_RUN:
                    break

                vector = await embedder.get_embedding(text)
                if vector:
                    chunk_id = hashlib.sha256(f"{path}:{idx}".encode('utf-8')).hexdigest()
                    db_chunks.append({
                        "_id": chunk_id,
                        "$vector": vector,
                        "content": text[:8000],
                        "metadata": {"source": path, "hash": file_data["hash"]}
                    })
                    total_chunks_inserted += 1
                elif embedder.quota_exhausted:
                    break
            
            if db_chunks:
                await collection.insert_many(db_chunks, ordered=False)
                print(f"  ✅ Synced: {path} ({len(db_chunks)} chunks)")

        print("\n" + f"✅ Batch sync complete. Total chunks inserted this run: {total_chunks_inserted}")
        if total_chunks_inserted < len(to_process): # Very rough check
             print("💡 More files remaining. They will be processed upon next push or manual trigger.")

if __name__ == "__main__":
    asyncio.run(sync_knowledge_base())
