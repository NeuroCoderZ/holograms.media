import os
import re
import asyncio
import logging
import hashlib
from typing import List, Dict
from astrapy import DataAPIClient
from astrapy.info import CollectionDefinition
from astrapy.constants import VectorMetric
from dotenv import load_dotenv

# Сначала загружаем окружение, потом импортируем внутренние сервисы!
env_path = os.path.join(os.getcwd(), ".env.local")
load_dotenv(env_path, override=True)

from backend.services.mistral_embedding_service import mistral_embeddings
from backend.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Константы
XML_PATH = "repomix-context.xml"
COLLECTION_NAME = "tria_knowledge"
CHUNK_SIZE = 8000  # Увеличиваем для сохранения контекста целых модулей
OVERLAP_SIZE = 1000 # Увеличиваем перекрытие для связи между чанками
DIMENSIONS = 1536  # codestral-embed

def chunk_code(text: str, max_chars: int = CHUNK_SIZE, overlap: int = OVERLAP_SIZE) -> List[str]:
    """Умный чанкинг: старается резать по переносам строк."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end >= len(text):
            chunks.append(text[start:])
            break
        # Пытаемся найти ближайший перенос строки для безопасного разреза
        newline_pos = text.rfind('\n', start, end)
        if newline_pos != -1 and newline_pos > start + max_chars // 2:
            end = newline_pos + 1
        
        chunks.append(text[start:end])
        start = end - overlap # Оставляем контекст из предыдущего чанка
    return chunks

async def refresh_knowledge():
    if not os.path.exists(XML_PATH):
        logger.error(f"File {XML_PATH} not found. Run repomix first.")
        return

    logger.info(f"Parsing {XML_PATH}...")
    with open(XML_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    file_blocks = re.findall(r'<file path="(.*?)">(.*?)</file>', content, re.DOTALL)
    logger.info(f"Found {len(file_blocks)} files in context.")

    # 1. Инициализация Astra DB
    client = DataAPIClient(settings.ASTRA_DB_APPLICATION_TOKEN)
    db = client.get_async_database(settings.ASTRA_DB_API_ENDPOINT, keyspace=settings.ASTRA_DB_KEYSPACE)
    
    # 2. Очистка старой базы (Drop & Recreate решает проблему с SSL EOF)
    logger.info("Dropping old collection to wipe data cleanly...")
    try:
        await db.drop_collection(COLLECTION_NAME)
        logger.info("Old collection dropped.")
    except Exception as e:
        logger.info(f"Collection drop info: {e}")

    # 3. Правильное создание коллекции для astrapy v2.0+
    logger.info(f"Creating collection {COLLECTION_NAME} ({DIMENSIONS}d)...")
    collection_definition = (
        CollectionDefinition.builder()
        .set_vector_dimension(DIMENSIONS)
        .set_vector_metric(VectorMetric.COSINE)
        .build()
    )
    
    # В v2.2.1+ аргумент check_exists может не поддерживаться вместе с definition в некоторых методах
    collection = await db.create_collection(
        COLLECTION_NAME, 
        definition=collection_definition
    )
    logger.info(f"Collection {COLLECTION_NAME} is ready.")

    # 4. Подготовка чанков с уникальными ID
    all_chunks = []
    for file_path, file_content in file_blocks:
        snippets = chunk_code(file_content.strip())
        for snippet in snippets:
            chunk_text = f"File: {file_path}\nContent:\n{snippet}"
            # Хэш от текста выступает ID — предотвращает дублирование одних и тех же кусков
            chunk_id = hashlib.sha256(chunk_text.encode('utf-8')).hexdigest()
            
            all_chunks.append({
                "_id": chunk_id,
                "text": chunk_text,
                "metadata": {
                    "source": file_path,
                    "type": "code_snippet"
                }
            })

    logger.info(f"Total logical chunks generated: {len(all_chunks)}")

    # 5. Ингэст батчами с обработкой лимитов API
    BATCH_SIZE = 10  # Небольшой батч, чтобы Mistral успевал "переваривать"
    
    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i:i + BATCH_SIZE]
        texts = [c["text"] for c in batch]
        
        try:
            embeddings = await mistral_embeddings.get_holoquants_batch(texts)
            
            documents = []
            for j, chunk in enumerate(batch):
                documents.append({
                    "_id": chunk["_id"],
                    "content": chunk["text"],
                    "$vector": embeddings[j],
                    "metadata": chunk["metadata"]
                })
            
            # Используем ordered=False, чтобы дубликаты (если вдруг попадутся) не стопили весь батч
            await collection.insert_many(documents, ordered=False)
            logger.info(f"Ingested batch {(i // BATCH_SIZE) + 1} / {(len(all_chunks) // BATCH_SIZE) + 1}")
            
            # Микро-задержка для пощады rate-лимитов
            await asyncio.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Critical error escaping tenacity in batch {i}: {e}")

    logger.info("✅ Knowledge refresh complete! Tria is now fully updated.")

if __name__ == "__main__":
    asyncio.run(refresh_knowledge())
