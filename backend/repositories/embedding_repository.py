import asyncpg
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
# import pgvector # Для to_sql и обратного преобразования, если понадобится

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
        # if not query_embedding:
        #     logger.warning("EmbeddingRepository: query_embedding is empty.")
        #     return None

        # # Убедимся, что pgvector зарегистрирован для соединения, если это необходимо на уровне репозитория.
        # # Обычно это делается один раз при установке соединения или глобально.
        # # await pgvector.register_vector(self.conn) # Может быть избыточно, если уже сделано

        # query_embedding_sql = pgvector.to_sql(query_embedding)

        # # SQL-запрос для поиска ближайшего вектора
        # # Используем L2 расстояние (<->), косинусное расстояние (<#>), или внутреннее произведение (<%>)
        # # Для нормализованных векторов L2 расстояние эквивалентно косинусному.
        # # Genkit использует <-> (L2), будем использовать его для консистентности.
        # sql = f"""
        #     SELECT id, content, embedding, metadata
        #     FROM {EMBEDDINGS_TABLE_NAME}
        #     ORDER BY embedding <-> $1
        #     LIMIT 1;
        # """
        # try:
        #     row = await self.conn.fetchrow(sql, query_embedding_sql)
        #     if row:
        #         # Преобразуем 'embedding' из строкового формата pgvector обратно в List[float]
        #         # asyncpg возвращает его уже как list, если тип колонки vector корректно обработан
        #         # Если нет, то pgvector.from_sql(row['embedding'])
        #         # Но обычно asyncpg это делает сам при правильной настройке.
        #         # Проверим тип row['embedding']
        #         embedding_vector = row['embedding']
        #         if isinstance(embedding_vector, str): # На случай если asyncpg вернул строку
        #             embedding_vector = pgvector.from_sql(embedding_vector)

        #         return EmbeddingDB(
        #             id=row['id'],
        #             content=row['content'],
        #             embedding_vector=embedding_vector, # Используем alias из модели
        #             metadata=row['metadata']
        #         )
        #     return None
        # except asyncpg.PostgresError as e:
        #     logger.error(f"DB error in EmbeddingRepository.find_closest_embedding: {e}")
        #     raise
        # except Exception as e:
        #     logger.error(f"Unexpected error in EmbeddingRepository.find_closest_embedding: {e}")
        #     raise
        logger.warning("Local embedding search is disabled. Tria functionality is now handled by a remote API.")
        return None

    async def update_embedding_vector(self, embedding_id: UUID, new_vector: List[float]) -> bool:
        """
        Обновляет вектор существующего эмбеддинга по его ID.
        """
        # if not new_vector:
        #     logger.warning(f"EmbeddingRepository: new_vector is empty for id {embedding_id}.")
        #     return False

        # new_vector_sql = pgvector.to_sql(new_vector)

        # sql = f"""
        #     UPDATE {EMBEDDINGS_TABLE_NAME}
        #     SET embedding = $1, updated_at = CURRENT_TIMESTAMP
        #     WHERE id = $2;
        # """
        # # Примечание: Поле updated_at может не существовать в таблице holograms_media_embeddings,
        # # созданной Genkit. Если его нет, нужно убрать ", updated_at = CURRENT_TIMESTAMP".
        # # Судя по схеме из indexing-job.ts, поля updated_at там нет. Убираем.

        # sql_update = f"""
        #     UPDATE {EMBEDDINGS_TABLE_NAME}
        #     SET embedding = $1
        #     WHERE id = $2;
        # """
        # try:
        #     result = await self.conn.execute(sql_update, new_vector_sql, embedding_id)
        #     # execute возвращает строку вида "UPDATE N", где N - количество обновленных строк.
        #     return result == "UPDATE 1"
        # except asyncpg.PostgresError as e:
        #     logger.error(f"DB error in EmbeddingRepository.update_embedding_vector for id {embedding_id}: {e}")
        #     raise
        # except Exception as e:
        #     logger.error(f"Unexpected error in EmbeddingRepository.update_embedding_vector for id {embedding_id}: {e}")
        #     raise
        logger.warning("Local embedding update is disabled. Tria functionality is now handled by a remote API.")
        return False

    async def get_embedding_by_id(self, embedding_id: UUID) -> Optional[EmbeddingDB]:
        """
        Получает эмбеддинг по его ID. (Может понадобиться для проверки)
        """
        # sql = f"""
        #     SELECT id, content, embedding, metadata
        #     FROM {EMBEDDINGS_TABLE_NAME}
        #     WHERE id = $1;
        # """
        # try:
        #     row = await self.conn.fetchrow(sql, embedding_id)
        #     if row:
        #         embedding_vector = row['embedding']
        #         if isinstance(embedding_vector, str):
        #             embedding_vector = pgvector.from_sql(embedding_vector)
        #         return EmbeddingDB(
        #             id=row['id'],
        #             content=row['content'],
        #             embedding_vector=embedding_vector, # Используем alias из модели
        #             metadata=row['metadata']
        #         )
        #     return None
        Finds the closest embedding in the collection using vector search.
        """
        try:
            # Astra DB Data API vector search
            # We use find with sort on $vector
            results = list(self.collection.find(
                sort={"$vector": query_embedding},
                limit=1,
                include_similarity=True
            ))
            
            if results:
                row = results[0]
                return EmbeddingDB(**row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in EmbeddingRepository.find_closest_embedding: {e}")
            raise

    async def update_embedding_vector(self, embedding_id: str, new_vector: List[float]) -> bool:
        """
        Updates the vector of an existing embedding.
        """
        try:
            result = self.collection.update_one(
                {"_id": embedding_id},
                {"$set": {"$vector": new_vector}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Astra DB error in EmbeddingRepository.update_embedding_vector: {e}")
            raise

    async def get_embedding_by_id(self, embedding_id: str) -> Optional[EmbeddingDB]:
        """
        Retrieves an embedding by its ID.
        """
        try:
            row = self.collection.find_one({"_id": embedding_id})
            if row:
                return EmbeddingDB(**row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in EmbeddingRepository.get_embedding_by_id: {e}")
            raise
