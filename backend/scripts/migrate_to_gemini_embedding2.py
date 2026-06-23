"""
backend/scripts/migrate_to_gemini_embedding2.py

Миграция с Mistral Embedding на Gemini Embedding 2 (Free Tier)
- Удаляет старую коллекцию tria_knowledge (Mistral 1536d)
- Создает новую коллекцию с размерностью 3072d (или 1536d через Matryoshka)
- Генерирует эмбеддинги из repomix-context.xml с лимитами Free Tier (60 RPM)

Использование:
    python -m backend.scripts.migrate_to_gemini_embedding2

Требования:
    - GOOGLE_API_KEY в .env
    - repomix-context.xml в корне проекта
    - astrapy >= 2.0
    - google-genai >= 0.2.0
"""

import os
import sys
import asyncio
import hashlib
import time
from pathlib import Path
from typing import List, Dict, Any
import xml.etree.ElementTree as ET

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import settings
from core.db.astra_connector import get_astra_db

# Google AI для эмбеддингов
try:
    from google import genai
    from google.genai import types
    GOOGLE_AVAILABLE = True
except ImportError:
    print("⚠️ google-genai не установлен. Установите: pip install google-genai>=0.2.0")
    GOOGLE_AVAILABLE = False

COLLECTION_NAME = "tria_knowledge_gemini"
CHUNK_SIZE_TOKENS = 5000  # С запасом до 8192
MAX_REQUESTS_PER_MINUTE = 55  # С запасом до 60 RPM
OUTPUT_DIMENSIONALITY = 3072  # Gemini Embedding 2 Standard

class GeminiEmbeddingService:
    """Сервис для генерации эмбеддингов через Gemini Embedding 2"""
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-embedding-2"
        self.request_count = 0
        self.last_request_time = 0
    
    async def get_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
        """
        Генерирует эмбеддинг с соблюдением лимитов Free Tier
        """
        # Rate limiting: не более 1 запроса в секунду
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        
        try:
            response = self.client.models.embed_content(
                model=self.model,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=OUTPUT_DIMENSIONALITY
                )
            )
            
            self.last_request_time = time.time()
            self.request_count += 1
            
            if self.request_count % 10 == 0:
                print(f"📊 Прогресс: {self.request_count} запросов, лимит: {MAX_REQUESTS_PER_MINUTE}/мин")
            
            return response.embeddings[0].values
            
        except Exception as e:
            print(f"❌ Ошибка генерации эмбеддинга: {e}")
            # При ошибке ждем дольше
            await asyncio.sleep(5)
            return None
    
    def parse_repomix(self, xml_path: str) -> List[Dict[str, str]]:
        """
        Парсит repomix-context.xml и разбивает на чанки
        """
        chunks = []
        
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            # Находим все <file> элементы
            for file_elem in root.findall('.//file'):
                file_path = file_elem.get('path', 'unknown')
                content = file_elem.text or ""
                
                # Разбиваем на чанки по ~5000 токенов
                # (упрощенно: по символам, 1 токен ≈ 4 символа)
                chunk_size_chars = CHUNK_SIZE_TOKENS * 4
                content = content.strip()
                
                for i in range(0, len(content), chunk_size_chars):
                    chunk_text = content[i:i + chunk_size_chars]
                    if len(chunk_text.strip()) < 100:  # Пропускаем слишком мелкие
                        continue
                    
                    chunk_id = hashlib.sha256(
                        f"{file_path}:{i}".encode('utf-8')
                    ).hexdigest()
                    
                    chunks.append({
                        "id": chunk_id,
                        "text": chunk_text,
                        "source": file_path,
                        "start_offset": i
                    })
            
            print(f"✅ Найдено {len(chunks)} чанков из {xml_path}")
            
        except Exception as e:
            print(f"❌ Ошибка парсинга XML: {e}")
        
        return chunks

async def delete_old_collection():
    """Удаляет старую коллекцию tria_knowledge (Mistral)"""
    print("🗑️  Удаление старой коллекции...")
    
    db = await get_astra_db()
    if not db:
        print("❌ Не удалось подключиться к AstraDB")
        return False
    
    try:
        # Проверяем существование коллекции
        collections = await db.list_collections()
        collection_names = [c.name for c in collections]
        
        if COLLECTION_NAME in collection_names:
            print(f"📋 Коллекция {COLLECTION_NAME} уже существует. Удаляем...")
            await db.drop_collection(COLLECTION_NAME)
        
        # Также удаляем старую tria_knowledge если есть
        if "tria_knowledge" in collection_names:
            print("📋 Удаление старой коллекции tria_knowledge (Mistral)...")
            await db.drop_collection("tria_knowledge")
        
        print("✅ Старые коллекции удалены")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при удалении: {e}")
        return False

async def create_new_collection():
    """Создает новую коллекцию с Gemini Embedding 2"""
    print("📁 Создание новой коллекции...")
    
    db = await get_astra_db()
    if not db:
        print("❌ Не удалось подключиться к AstraDB")
        return False
    
    try:
        collection = await db.create_collection(
            name=COLLECTION_NAME,
            dimension=OUTPUT_DIMENSIONALITY,
            metric="cosine",
            indexing={
                "allowlist": ["metadata.source", "metadata.owner_id", "metadata.visibility"]
            }
        )
        
        print(f"✅ Коллекция {COLLECTION_NAME} создана (размерность: {OUTPUT_DIMENSIONALITY})")
        return collection
        
    except Exception as e:
        print(f"❌ Ошибка при создании: {e}")
        return None

async def migrate_to_gemini():
    """Основная функция миграции"""
    print("🚀 Начало миграции на Gemini Embedding 2 (Free Tier)")
    print(f"📊 Размерность: {OUTPUT_DIMENSIONALITY}d (Matryoshka)")
    print(f"⏱️  Лимит: {MAX_REQUESTS_PER_MINUTE} запросов/минуту")
    
    if not GOOGLE_AVAILABLE:
        print("❌ Google AI SDK не установлен")
        return
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY не найден в .env")
        return
    
    # 1. Удаляем старые коллекции
    if not await delete_old_collection():
        print("⚠️  Продолжаем без удаления старых коллекций")
    
    # 2. Создаем новую коллекцию
    collection = await create_new_collection()
    if not collection:
        return
    
    # 3. Парсим repomix-context.xml
    embedder = GeminiEmbeddingService(api_key)
    xml_path = Path(__file__).parent.parent.parent / "repomix-context.xml"
    
    if not xml_path.exists():
        print(f"❌ Файл {xml_path} не найден. Сначала выполните: npm run ctx")
        return
    
    chunks = embedder.parse_repomix(str(xml_path))
    if not chunks:
        print("❌ Чанки не найдены")
        return
    
    # 4. Генерируем эмбеддинги и сохраняем в AstraDB
    print("🔄 Генерация эмбеддингов и загрузка в AstraDB...")
    
    success_count = 0
    error_count = 0
    
    for i, chunk in enumerate(chunks):
        if i % 50 == 0:
            print(f"📊 Обработано {i}/{len(chunks)} чанков")
        
        # Генерируем эмбеддинг
        vector = await embedder.get_embedding(chunk["text"])
        
        if vector is None:
            error_count += 1
            continue
        
        # Сохраняем в AstraDB
        try:
            await collection.insert_one({
                "_id": chunk["id"],
                "content": chunk["text"],
                "$vector": vector,
                "metadata": {
                    "source": chunk["source"],
                    "start_offset": chunk["start_offset"],
                    "owner_id": "system",
                    "visibility": "public",
                    "model": "gemini-embedding-2",
                    "dimensionality": OUTPUT_DIMENSIONALITY
                }
            })
            success_count += 1
            
        except Exception as e:
            print(f"❌ Ошибка записи в AstraDB: {e}")
            error_count += 1
    
    print("\n" + "="*50)
    print("✅ Миграция завершена!")
    print(f"📊 Успешно: {success_count} чанков")
    print(f"❌ Ошибки: {error_count} чанков")
    print(f"💾 Коллекция: {COLLECTION_NAME}")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(migrate_to_gemini())
