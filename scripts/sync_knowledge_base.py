"""
scripts/sync_knowledge_base.py

Профессиональный синхронизатор базы знаний.
- Инкрементальное обновление: работает только с измененными файлами.
- Поддерживает дозапись и удаление устаревших чанков.
- Работает на основе хеширования файлов.
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
from astrapy.api_options import APIOptions, TimeoutOptions

# --- Загрузка окружения ---
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

# --- Константы ---
COLLECTION_NAME = "tria_knowledge_gemini"
CHUNK_SIZE_CHARS = 6000  # ~1500 tokens, безопасно для AstraDB
CHUNK_OVERLAP_CHARS = 800
OUTPUT_DIMENSIONALITY = 3072


# --- Gemini Embedding Service (с retry-логикой) ---
class GeminiEmbeddingService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-embedding-2-preview"
        self.request_count: int = 0
        self.last_request_time: float = 0.0

    async def get_embedding(
        self, text: str, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> Optional[List[float]]:
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.5:  # ~40 RPM
            await asyncio.sleep(1.5 - elapsed)

        for attempt in range(3):
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
                return response.embeddings[0].values
            except Exception as e:
                print(f"  ⚠️ Попытка {attempt + 1}/3: Ошибка Gemini: {e}")
                await asyncio.sleep(5 * (attempt + 1))
        return None


# --- Парсинг и Хеширование ---
def parse_and_hash_repomix(xml_path: str) -> Dict[str, Dict[str, Any]]:
    """Парсит repomix и возвращает словарь {file_path: {hash, content}}."""
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
        print(f"❌ Ошибка парсинга XML: {e}")
    return file_map


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE_CHARS, overlap: int = CHUNK_OVERLAP_CHARS
) -> List[str]:
    """Нарезает текст на перекрывающиеся чанки."""
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
    """Главная функция синхронизации базы знаний."""
    print("🚀 Starting Smart Knowledge Base Sync...")

    # 1. Подключение к AstraDB (Гибкое определение эндпоинта)
    api_endpoint = os.getenv("ASTRA_DB_API_ENDPOINT") or os.getenv("ASTRA_DATABASE_URL")
    db_id = os.getenv("ASTRA_DB_ID")
    region = os.getenv("ASTRA_DB_REGION")

    if not api_endpoint and db_id and region:
        api_endpoint = f"https://{db_id}-{region}.apps.astra.datastax.com"

    if not api_endpoint:
        print("❌ Ошибка: Не найден Astra DB Endpoint.")
        print(
            "   Укажите ASTRA_DB_API_ENDPOINT или ASTRA_DATABASE_URL или ASTRA_DB_ID + ASTRA_DB_REGION"
        )
        return

    if not api_endpoint.startswith("http"):
        api_endpoint = f"https://{api_endpoint}"

    print(f"📡 Connecting to AstraDB: {api_endpoint[:50]}...")

    try:
        timeout_options = TimeoutOptions(
            request_timeout_ms=30000, general_method_timeout_ms=60000
        )
        api_options = APIOptions(timeout_options=timeout_options)
        keyspace = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
        astra_client = DataAPIClient(
            os.getenv("ASTRA_DB_APPLICATION_TOKEN"), api_options=api_options
        )
        db = astra_client.get_async_database(api_endpoint, keyspace=keyspace)
        collection = db.get_collection(COLLECTION_NAME)
        print("✅ Connected to AstraDB")
    except Exception as e:
        print(f"❌ Ошибка подключения к AstraDB: {e}")
        return

    # 2. Получаем текущее состояние из Repomix
    xml_path = Path(__file__).parent.parent / "repomix-context.xml"
    if not xml_path.exists():
        print(f"❌ Файл repomix-context.xml не найден: {xml_path}")
        print("   Запустите 'npm run ctx' для генерации контекста.")
        return

    local_files = parse_and_hash_repomix(str(xml_path))
    print(f"🔍 Found {len(local_files)} files in local context.")

    # 3. Получаем состояние из AstraDB (только метаданные)
    remote_files: Dict[str, str] = {}
    total_docs_in_db = 0
    try:
        async for doc in collection.find(
            {}, projection={"metadata.source": 1, "metadata.hash": 1}
        ):
            total_docs_in_db += 1
            source = doc.get("metadata", {}).get("source")
            file_hash = doc.get("metadata", {}).get("hash")
            if source and file_hash:
                remote_files[source] = file_hash
    except Exception as e:
        print(
            f"⚠️ Не удалось получить метаданные из AstraDB: {e}. Пропускаем сравнение."
        )

    print(
        f"ℹ️  Found {len(remote_files)} files with hash metadata in DB (total docs: {total_docs_in_db})."
    )

    # Если в базе есть документы без hash — это "legacy" чанки от старого мигратора.
    # Удаляем их все, чтобы начать с чистого листа.
    legacy_docs = total_docs_in_db - len(remote_files)
    if legacy_docs > 0 and len(remote_files) == 0:
        print(
            "\n"
            + f"🧹 Detected {legacy_docs} legacy chunks (without hash metadata). Cleaning up..."
        )
        try:
            await collection.delete_many(filter={})
            print("   ✅ Legacy chunks cleared. Starting fresh sync.")
            total_docs_in_db = 0
        except Exception as e:
            print(f"   ⚠️ Could not clear legacy chunks: {e}")

    # 4. Определяем изменения
    files_to_add: Set[str] = set()
    files_to_update: Set[str] = set()
    files_in_db: Set[str] = set(remote_files.keys())

    for path, data in local_files.items():
        if path not in remote_files:
            files_to_add.add(path)
        elif remote_files[path] != data["hash"]:
            files_to_update.add(path)

    files_to_delete = files_in_db - set(local_files.keys())

    print(
        "\n"
        + f"🔄 Sync Plan: Add {len(files_to_add)}, Update {len(files_to_update)}, Delete {len(files_to_delete)}"
    )

    if not (files_to_add or files_to_update or files_to_delete):
        print("✅ Knowledge Base is already up to date! Nothing to do.")
        return

    # 5. Выполняем синхронизацию (Gemini API - основа!)
    embedder = GeminiEmbeddingService(os.getenv("GOOGLE_API_KEY", ""))

    # Удаление устаревших файлов
    # AstraDB limit: $in operator accepts max 100 values — batch deletes
    async def batch_delete(file_set, label):
        file_list = list(file_set)
        total = len(file_list)
        if total == 0:
            return
        print(f"\n🗑️  {label}: {total} files...")
        deleted = 0
        for i in range(0, total, 100):
            batch = file_list[i : i + 100]
            await collection.delete_many(filter={"metadata.source": {"$in": batch}})
            deleted += len(batch)
            print(f"   ...deleted {deleted}/{total}")
        print(f"   ✅ Done.")

    if files_to_delete:
        await batch_delete(files_to_delete, "Deleting obsolete files")

    # Обновление изменённых файлов: сначала удаляем старые чанки
    if files_to_update:
        await batch_delete(files_to_update, "Removing old chunks for modified files")

    # Добавление новых и обновлённых файлов
    files_to_process = files_to_add.union(files_to_update)
    if files_to_process:
        print("\n" + f"✨ Processing {len(files_to_process)} files for embedding...")
        total_chunks = 0
        for file_path in sorted(files_to_process):
            data = local_files[file_path]
            content = data["content"]
            file_hash = data["hash"]

            # Разбивка на чанки с перекрытием
            text_chunks = chunk_text(content)
            chunks_to_insert = []

            for i, chunk_text_val in enumerate(text_chunks):
                vector = await embedder.get_embedding(chunk_text_val)
                if vector:
                    chunk_id = hashlib.sha256(
                        f"{file_path}:{i}".encode("utf-8")
                    ).hexdigest()
                    chunks_to_insert.append(
                        {
                            "_id": chunk_id,
                            "content": chunk_text_val[
                                :7900
                            ],  # Safety limit для AstraDB
                            "$vector": vector,
                            "metadata": {
                                "source": file_path,
                                "hash": file_hash,
                                "chunk_index": i,
                                "total_chunks": len(text_chunks),
                            },
                        }
                    )

            if chunks_to_insert:
                try:
                    await collection.insert_many(chunks_to_insert, ordered=False)
                    total_chunks += len(chunks_to_insert)
                    print(f"  ✅ Synced: {file_path} ({len(chunks_to_insert)} chunks)")
                except Exception as insert_err:
                    # ordered=False: даже при дубликатах вставляет непересекающиеся
                    err_str = str(insert_err)
                    if (
                        "DOCUMENT_ALREADY_EXISTS" in err_str
                        or "already exists" in err_str
                    ):
                        print(f"  ℹ️  Skipped (already exists): {file_path}")
                    else:
                        print(f"  ❌ Insert error for {file_path}: {insert_err}")
            else:
                print(f"  ⚠️ Skipped: {file_path} (no embeddings generated)")

        print("\n" + f"✅ Done! Total chunks inserted: {total_chunks}")

    print("\n" + "🎯 Knowledge Base is up to date!")


if __name__ == "__main__":
    asyncio.run(sync_knowledge_base())
