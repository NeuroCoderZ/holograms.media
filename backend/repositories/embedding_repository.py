import asyncpg
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import pgvector # Для to_sql и обратного преобразования, если понадобится

# Предположим, что у нас есть Pydantic модель для представления строки из таблицы эмбеддингов.
# Если ее нет, можно возвращать dict или создать простую модель здесь.
# Для примера, создадим простую модель, если она не импортируется.
try:
    from backend.core.models.embedding_models import EmbeddingDB # Пример имени
except ImportError:
    from pydantic import BaseModel, Field
    class EmbeddingDB(BaseModel):
        id: UUID
        content: Optional[str] = None # Текстовое содержимое, если есть
        embedding: List[float] = Field(alias="embedding_vector") # Используем alias если имя поля в БД другое
        metadata: Optional[Dict[str, Any]] = None

        class Config:
            orm_mode = True
            allow_population_by_field_name = True


logger = logging.getLogger(__name__)

# Имя таблицы эмбеддингов. Используем ту же, что и в Genkit.
# В Genkit используется 'holograms_media_embeddings'.
# В задании указана 'hologram_semantic_embeddings'. Уточняем на 'holograms_media_embeddings'.
EMBEDDINGS_TABLE_NAME = "holograms_media_embeddings"


class EmbeddingRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def find_closest_embedding(self, query_embedding: List[float]) -> Optional[EmbeddingDB]:
        """
        Находит один самый близкий эмбеддинг в таблице по косинусному сходству.
        Принимает уже готовый вектор запроса.
        """
        if not query_embedding:
            logger.warning("EmbeddingRepository: query_embedding is empty.")
            return None

        # Убедимся, что pgvector зарегистрирован для соединения, если это необходимо на уровне репозитория.
        # Обычно это делается один раз при установке соединения или глобально.
        # await pgvector.register_vector(self.conn) # Может быть избыточно, если уже сделано

        query_embedding_sql = pgvector.to_sql(query_embedding)

        # SQL-запрос для поиска ближайшего вектора
        # Используем L2 расстояние (<->), косинусное расстояние (<#>), или внутреннее произведение (<%>)
        # Для нормализованных векторов L2 расстояние эквивалентно косинусному.
        # Genkit использует <-> (L2), будем использовать его для консистентности.
        sql = f"""
            SELECT id, content, embedding, metadata
            FROM {EMBEDDINGS_TABLE_NAME}
            ORDER BY embedding <-> $1
            LIMIT 1;
        """
        try:
            row = await self.conn.fetchrow(sql, query_embedding_sql)
            if row:
                # Преобразуем 'embedding' из строкового формата pgvector обратно в List[float]
                # asyncpg возвращает его уже как list, если тип колонки vector корректно обработан
                # Если нет, то pgvector.from_sql(row['embedding'])
                # Но обычно asyncpg это делает сам при правильной настройке.
                # Проверим тип row['embedding']
                embedding_vector = row['embedding']
                if isinstance(embedding_vector, str): # На случай если asyncpg вернул строку
                    embedding_vector = pgvector.from_sql(embedding_vector)

                return EmbeddingDB(
                    id=row['id'],
                    content=row['content'],
                    embedding_vector=embedding_vector, # Используем alias из модели
                    metadata=row['metadata']
                )
            return None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in EmbeddingRepository.find_closest_embedding: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in EmbeddingRepository.find_closest_embedding: {e}")
            raise

    async def update_embedding_vector(self, embedding_id: UUID, new_vector: List[float]) -> bool:
        """
        Обновляет вектор существующего эмбеддинга по его ID.
        """
        if not new_vector:
            logger.warning(f"EmbeddingRepository: new_vector is empty for id {embedding_id}.")
            return False

        new_vector_sql = pgvector.to_sql(new_vector)

        sql = f"""
            UPDATE {EMBEDDINGS_TABLE_NAME}
            SET embedding = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        """
        # Примечание: Поле updated_at может не существовать в таблице holograms_media_embeddings,
        # созданной Genkit. Если его нет, нужно убрать ", updated_at = CURRENT_TIMESTAMP".
        # Судя по схеме из indexing-job.ts, поля updated_at там нет. Убираем.

        sql_update = f"""
            UPDATE {EMBEDDINGS_TABLE_NAME}
            SET embedding = $1
            WHERE id = $2;
        """
        try:
            result = await self.conn.execute(sql_update, new_vector_sql, embedding_id)
            # execute возвращает строку вида "UPDATE N", где N - количество обновленных строк.
            return result == "UPDATE 1"
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in EmbeddingRepository.update_embedding_vector for id {embedding_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in EmbeddingRepository.update_embedding_vector for id {embedding_id}: {e}")
            raise

    async def get_embedding_by_id(self, embedding_id: UUID) -> Optional[EmbeddingDB]:
        """
        Получает эмбеддинг по его ID. (Может понадобиться для проверки)
        """
        sql = f"""
            SELECT id, content, embedding, metadata
            FROM {EMBEDDINGS_TABLE_NAME}
            WHERE id = $1;
        """
        try:
            row = await self.conn.fetchrow(sql, embedding_id)
            if row:
                embedding_vector = row['embedding']
                if isinstance(embedding_vector, str):
                    embedding_vector = pgvector.from_sql(embedding_vector)
                return EmbeddingDB(
                    id=row['id'],
                    content=row['content'],
                    embedding_vector=embedding_vector, # Используем alias из модели
                    metadata=row['metadata']
                )
            return None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in EmbeddingRepository.get_embedding_by_id for id {embedding_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in EmbeddingRepository.get_embedding_by_id for id {embedding_id}: {e}")
            raise

    async def find_closest_embedding_by_text(self, query_text: str, model_name: str = "models/text-embedding-004") -> Optional[EmbeddingDB]:
        """
        Создает эмбеддинг для query_text и ищет ближайший в БД.
        """
        # Для этой функции нужен доступ к genai или аналогичному сервису эмбеддингов.
        # Это немного нарушает принцип репозитория (не должен знать о внешних AI сервисах).
        # В идеале, эмбеддинг запроса должен создаваться в сервисе и передаваться в find_closest_embedding.
        # Но для выполнения задания реализуем здесь.
        import google.generativeai as genai # Поздний импорт, чтобы избежать цикличной зависимости или проблем при старте
        import os

        # Попытка конфигурации, если еще не сделана (может быть избыточно, если genai конфигурируется глобально)
        # if not genai.API_KEY and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        #     api_key = os.getenv("GOOGLE_API_KEY")
        #     if api_key:
        #         genai.configure(api_key=api_key)
        #     else:
        #         logger.error("Google AI API key or ADC not configured for EmbeddingRepository.")
        #         return None

        try:
            result = await genai.embed_content_async(
                model=model_name,
                content=query_text,
                task_type="RETRIEVAL_QUERY"
            )
            query_embedding = result['embedding']
            if query_embedding:
                return await self.find_closest_embedding(query_embedding)
            else:
                logger.warning(f"Could not generate embedding for query_text: {query_text[:50]}...")
                return None
        except Exception as e:
            logger.error(f"Error generating embedding or finding closest for text '{query_text[:50]}...': {e}")
            return None
