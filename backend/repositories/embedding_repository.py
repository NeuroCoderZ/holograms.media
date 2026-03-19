from astrapy import AsyncDatabase as Database
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel, Field

# Model for Astra DB Embedding
class EmbeddingDB(BaseModel):
    id: str = Field(alias="_id")
    content: Optional[str] = None
    embedding_vector: List[float] = Field(alias="$vector")
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True

logger = logging.getLogger(__name__)

# Astra DB Collection name for embeddings
EMBEDDINGS_COLLECTION_NAME = "holograms_media_embeddings"

class EmbeddingRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = self.db.get_collection(EMBEDDINGS_COLLECTION_NAME)

    async def find_closest_embedding(self, query_embedding: List[float]) -> Optional[EmbeddingDB]:
        """
        Finds the closest embedding in the collection using vector search.
        """
        try:
            # Astra DB Data API vector search
            # We use find with sort on $vector
            cursor = self.collection.find(
                sort={"$vector": query_embedding},
                limit=1,
                include_similarity=True
            )
            results = await cursor.to_list(length=1)
            
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
            result = await self.collection.update_one(
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
            row = await self.collection.find_one({"_id": embedding_id})
            if row:
                return EmbeddingDB(**row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in EmbeddingRepository.get_embedding_by_id: {e}")
            raise
