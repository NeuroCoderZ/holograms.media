"""
scripts/migrate_gemini_embeddings_standalone.py

АВТОНОМНАЯ ВЕРСИЯ — не требует fastapi и других backend зависимостей!
С поддержкой ДОЗАПИСИ (Resumable) и увеличенными таймаутами.
"""

import os
import sys
import hashlib
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import re
import xml.etree.ElementTree as ET

from dotenv import load_dotenv
from google import genai
from google.genai import types
from astrapy import DataAPIClient
from astrapy.info import CollectionDefinition
from astrapy.constants import VectorMetric
from astrapy.api_options import APIOptions, TimeoutOptions

# Загружаем .env.local
env_path = Path(__file__).parent.parent / '.env.local'
print(f"📖 Loading .env.local from: {env_path}")
load_dotenv(env_path)

# Строгая типизация переменных окружения
raw_google_key = os.getenv('GOOGLE_API_KEY')
raw_astra_token = os.getenv('ASTRA_DB_APPLICATION_TOKEN')
raw_astra_endpoint = os.getenv('ASTRA_DB_API_ENDPOINT')

if not raw_google_key or not raw_astra_token or not raw_astra_endpoint:
    print("❌ API keys not found in .env.local!")
    sys.exit(1)

GOOGLE_API_KEY: str = str(raw_google_key)
ASTRA_DB_APPLICATION_TOKEN: str = str(raw_astra_token)
ASTRA_DB_API_ENDPOINT: str = str(raw_astra_endpoint)

COLLECTION_NAME = "tria_knowledge_gemini"
CHUNK_SIZE_TOKENS = 1500  # Вписываемся в 8000 байт AstraDB
MAX_REQUESTS_PER_MINUTE = 40  # Снижено для стабильности Free Tier (рекомендация)
OUTPUT_DIMENSIONALITY = 3072  # MAXIMUM QUALITY!

class GeminiEmbeddingService:
    """Сервис для генерации эмбеддингов через Gemini Embedding 2"""
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-embedding-2-preview"
        self.request_count: int = 0
        self.last_request_time: float = 0.0
    
    def get_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
        """Генерирует эмбеддинг с соблюдением лимитов и retry-логикой"""
        # Rate limiting: 40 RPM => ~1.5s между запросами
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.5:
            time.sleep(1.5 - elapsed)
        
        for attempt in range(3):  # 3 попытки при сетевых ошибках
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
                    print(f"📊 Прогресс Gemini: {self.request_count} запросов")
                
                return response.embeddings[0].values
                
            except Exception as e:
                print(f"⚠️ Попытка {attempt+1}/3: Ошибка генерации: {e}")
                time.sleep(5 * (attempt + 1))
        
        return None

def parse_repomix(xml_path: str) -> List[Dict[str, Any]]:
    """Парсит repomix-context.xml с помощью регулярных выражений (обходит грязный XML)"""
    chunks: List[Dict[str, Any]] = []
    
    try:
        print(f"📄 Чтение {xml_path}...")
        with open(xml_path, 'r', encoding='utf-8', errors='ignore') as f:
             content = f.read()
        
        pattern = r'<file path="([^"]+)">\s*(.*?)\s*</file>'
        matches = list(re.finditer(pattern, content, re.DOTALL))
        
        print(f"🔍 Найдено {len(matches)} файлов в контексте")
        
        for match in matches:
            file_path = match.group(1)
            file_content = match.group(2).strip()
            
            if not file_content:
                continue

            chunk_size_chars = CHUNK_SIZE_TOKENS * 4
            
            for i in range(0, len(file_content), chunk_size_chars):
                chunk_text = file_content[i:i + chunk_size_chars]
                if len(chunk_text.strip()) < 50:
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
        
        print(f"✅ Итого создано {len(chunks)} чанков")
        
    except Exception as e:
        print(f"❌ Ошибка парсинга: {e}")
    
    return chunks

def migrate_to_gemini():
    """Основная функция миграции с поддержкой дозаписи (Resumable)"""
    print("🚀 Starting Resumable Gemini Embedding 2 Migration...")
    
    # 1. Подключение к AstraDB с увеличенным таймаутом (30с)
    print("📡 Connecting to AstraDB (Timeout: 30s)...")
    timeout_options = TimeoutOptions(
        request_timeout_ms=30000,
        general_method_timeout_ms=60000
    )
    api_options = APIOptions(timeout_options=timeout_options)
    
    astra_client = DataAPIClient(ASTRA_DB_APPLICATION_TOKEN, api_options=api_options)
    db = astra_client.get_database(ASTRA_DB_API_ENDPOINT, keyspace="default_keyspace")
    print(f"✅ Connected to AstraDB")
    
    # 2. Проверяем коллекцию (БЕЗ УДАЛЕНИЯ)
    print(f"🔍 Checking for collection '{COLLECTION_NAME}'...")
    collections = db.list_collections()
    collection_names = [c.name for c in collections]
    
    if COLLECTION_NAME not in collection_names:
        print(f"📁 Creating new collection '{COLLECTION_NAME}'...")
        try:
            collection_definition = (
                CollectionDefinition.builder()
                .set_vector_dimension(OUTPUT_DIMENSIONALITY)
                .set_vector_metric(VectorMetric.COSINE)
                .build()
            )
            collection = db.create_collection(name=COLLECTION_NAME, definition=collection_definition)
            print(f"✅ Collection '{COLLECTION_NAME}' created")
        except Exception as e:
            print(f"❌ Error creating collection: {e}")
            return
    else:
        print(f"ℹ️  Collection '{COLLECTION_NAME}' уже существует. Продолжаем миграцию...")
        collection = db.get_collection(COLLECTION_NAME)

    # 4. Парсим repomix-context.xml
    xml_path = Path(__file__).parent.parent / "repomix-context.xml"
    if not xml_path.exists():
        print(f"❌ Файл {xml_path} не найден. Сначала выполните: npm run ctx")
        return
    
    chunks = parse_repomix(str(xml_path))
    if not chunks:
        print("❌ Чанки не найдены")
        return
    
    # 5. Инициализируем сервис
    embedder = GeminiEmbeddingService(GOOGLE_API_KEY)
    
    # 6. Генерируем и сохраняем
    print("🔄 Processing chunks...")
    success_count = 0
    skipped_count = 0
    error_count = 0
    
    for i, chunk in enumerate(chunks):
        if i % 20 == 0:
            print(f"📊 Обработано {i}/{len(chunks)} ({(i/len(chunks)*100):.1f}%)")
        
        # ПРОВЕРКА: Есть ли уже этот ID в базе?
        try:
            # Используем find_one для быстрой проверки существования
            existing = collection.find_one({"_id": chunk["id"]}, projection={"_id": 1})
            if existing:
                skipped_count += 1
                continue
        except Exception as e:
            print(f"⚠️ Ошибка проверки ID {chunk['id']}: {e}")

        # Генерируем эмбеддинг
        vector = embedder.get_embedding(chunk["text"])
        if vector is None:
            error_count += 1
            continue
        
        # Сохраняем (с обрезкой по байтам для AstraDB)
        try:
            safe_content = chunk["text"]
            if len(safe_content.encode('utf-8')) > 7900:
                 safe_content = safe_content.encode('utf-8')[:7900].decode('utf-8', 'ignore')

            collection.insert_one({
                "_id": chunk["id"],
                "content": safe_content,
                "$vector": vector,
                "metadata": {
                    "source": chunk["source"],
                    "start_offset": chunk["start_offset"],
                    "model": "gemini-embedding-2-preview"
                }
            })
            success_count += 1
        except Exception as e:
            print(f"❌ Ошибка записи в AstraDB: {e}")
            error_count += 1
    
    print("\n" + "="*50)
    print("✅ Миграция завершена!")
    print(f"📈 Успешно: {success_count} чанков")
    print(f"⏩ Пропущено: {skipped_count} чанков")
    print(f"❌ Ошибки: {error_count} чанков")
    print(f"💾 Коллекция: {COLLECTION_NAME}")
    print("="*50)

if __name__ == '__main__':
    migrate_to_gemini()
