import logging
import json
from typing import List
import httpx
from backend.core.config import settings

logger = logging.getLogger(__name__)

MISTRAL_EMBEDDING_URL = "https://api.mistral.ai/v1/embeddings"


class MistralEmbeddingService:
    """
    Унифицированный сервис эмбеддингов для Триа (Triple-A).
    Использует codestral-embed (1536d) для качественного поиска по кодовой базе.
    """

    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY
        if not self.api_key:
            logger.error("MISTRAL_API_KEY is not set. Embedding service will fail.")
        self.model = "codestral-embed"  # Строго 1536 измерений для кода

    async def get_holoquants_batch(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            return [[0.0] * 1536 for _ in texts]

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "input": texts,
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    MISTRAL_EMBEDDING_URL, headers=headers, json=payload
                )
                response.raise_for_status()
                data = response.json()
                return [item["embedding"] for item in data["data"]]
        except Exception as e:
            logger.warning(f"Mistral API limit/error hit. Error: {e}")
            return [[0.0] * 1536 for _ in texts]

    async def get_holoquant(self, text: str) -> List[float]:
        res = await self.get_holoquants_batch([text])
        return res[0]


mistral_embeddings = MistralEmbeddingService()
