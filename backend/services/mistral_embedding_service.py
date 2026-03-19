import logging
from typing import List
from mistralai.client import Mistral
from backend.core.config import settings

logger = logging.getLogger(__name__)

class MistralEmbeddingService:
    """
    Unified Embedding Service for Триа (Triple-A).
    Uses codestral-embed (1536d) for all HoloQuant generation to ensure 
    cross-modal compatibility between code, text, and sensor data.
    """
    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY
        if not self.api_key:
            logger.error("MISTRAL_API_KEY is not set. Embedding service will fail.")
        self.client = Mistral(api_key=self.api_key)
        self.model = "codestral-embed"  # 1536 dimensions - Unified Standard

    async def get_holoquant(self, text: str) -> List[float]:
        """
        Generates a single 1536-dimensional HoloQuant for the given text/code.
        """
        if not self.api_key:
            return [0.0] * 1536

        try:
            response = await self.client.embeddings.create_async(
                model=self.model,
                inputs=[text]
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating HoloQuant: {e}")
            raise e

    async def get_holoquants_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates a batch of HoloQuants for multiple data chunks.
        Ideal for repomix-context parsing.
        """
        if not self.api_key:
            return [[0.0] * 1536 for _ in texts]

        try:
            response = await self.client.embeddings.create_async(
                model=self.model,
                inputs=texts
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Error generating HoloQuant batch: {e}")
            raise e

# Global instance
mistral_embeddings = MistralEmbeddingService()
