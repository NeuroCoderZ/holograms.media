import logging
from typing import List
from mistralai.client import Mistral
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from backend.core.config import settings

logger = logging.getLogger(__name__)

class MistralEmbeddingService:
    """
    Унифицированный сервис эмбеддингов для Триа (Triple-A).
    Использует codestral-embed (1536d) для качественного поиска по кодовой базе.
    """
    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY
        if not self.api_key:
            logger.error("MISTRAL_API_KEY is not set. Embedding service will fail.")
        self.client = Mistral(api_key=self.api_key)
        self.model = "codestral-embed"  # Строго 1536 измерений для кода

    # Экспоненциальный бэкофф: ждем 2^x секунд при ошибке (до 6 попыток)
    @retry(
        stop=stop_after_attempt(6),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True
    )
    async def get_holoquants_batch(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            return [[0.0] * 1536 for _ in texts]
        
        try:
            response = await self.client.embeddings.create_async(
                model=self.model,
                inputs=texts
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.warning(f"Mistral API limit/error hit. Retrying... Error: {e}")
            raise e

    async def get_holoquant(self, text: str) -> List[float]:
        res = await self.get_holoquants_batch([text])
        return res[0]

mistral_embeddings = MistralEmbeddingService()
