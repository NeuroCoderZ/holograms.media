"""
backend/services/gemini_embedding_service.py

Сервис для генерации эмбеддингов через Gemini Embedding 2 (Free Tier)
Поддерживает технологию Matryoshka (гибкая размерность: 768, 1536, 3072)

Требования:
    pip install google-genai>=0.2.0
"""

import os
import logging
from typing import List, Optional
import asyncio

try:
    from google import genai
    from google.genai import types
    GOOGLE_AVAILABLE = True
except ImportError:
    print("⚠️ google-genai не установлен. Установите: pip install google-genai>=0.2.0")
    GOOGLE_AVAILABLE = False

logger = logging.getLogger(__name__)

class GeminiEmbeddingService:
    """
    Сервис эмбеддингов через Gemini Embedding 2
    Free Tier лимиты: 60 RPM (запросов в минуту), 1000 RPD (в день)
    """
    
    def __init__(self):
        if not GOOGLE_AVAILABLE:
            logger.warning("Google AI SDK не доступен. Эмбеддинги не будут работать.")
            self.client = None
            return
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.error("GOOGLE_API_KEY не найден в .env")
            self.client = None
            return
        
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-embedding-2-preview"
        
        # Размерность по умолчанию (Matryoshka)
        # Можно менять: 768 (быстро), 1536 (баланс), 3072 (макс качество)
        self.output_dimensionality = 1536
        
        # Rate limiting
        self.request_count = 0
        self.last_request_time = 0
        self.max_rpm = 55  # С запасом до 60
    
    async def get_embedding(
        self, 
        text: str, 
        task_type: str = "RETRIEVAL_DOCUMENT",
        dimensionality: Optional[int] = None
    ) -> Optional[List[float]]:
        """
        Генерирует эмбеддинг для текста
        
        Args:
            text: Текст для эмбеддинга
            task_type: 
                - "RETRIEVAL_DOCUMENT" для документов
                - "RETRIEVAL_QUERY" для поисковых запросов
                - "SEMANTIC_SIMILARITY" для сравнения текстов
            dimensionality: Размерность (по умолчанию 1536)
        
        Returns:
            Список float (вектор) или None при ошибке
        """
        if not self.client:
            return None
        
        # Rate limiting: не более 1 запроса в секунду
        import time
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        
        try:
            dim = dimensionality or self.output_dimensionality
            
            response = self.client.models.embed_content(
                model=self.model,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=dim
                )
            )
            
            self.last_request_time = time.time()
            self.request_count += 1
            
            # Логирование прогресса
            if self.request_count % 10 == 0:
                logger.info(f"Gemini Embedding: {self.request_count} запросов (лимит: {self.max_rpm}/мин)")
            
            if response.embeddings and len(response.embeddings) > 0:
                return response.embeddings[0].values
            else:
                logger.error("Gemini Embedding: Пустой ответ")
                return None
            
        except Exception as e:
            logger.error(f"Gemini Embedding ошибка: {e}")
            # При ошибке ждем дольше
            await asyncio.sleep(5)
            return None
    
    async def get_holoquant(self, text: str) -> Optional[List[float]]:
        """
        Legacy метод для совместимости со старым кодом mistral_embeddings
        """
        return await self.get_embedding(text, task_type="RETRIEVAL_DOCUMENT")

# Singleton instance
gemini_embeddings = GeminiEmbeddingService()
