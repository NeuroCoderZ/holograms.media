"""
Gemini Embeddings with KV Cache
Uses gemini-embedding-2-preview (3072 dimensions)
Migrated from Mistral codestral-embed-2505 (1536d) — A1 Phase
"""
import os
import hashlib
import json
from typing import List, Optional
import httpx


class GeminiEmbeddings:
    """Gemini embeddings client with KV caching"""

    def __init__(self, kv_cache=None):
        self.api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY must be set")

        self.model = os.getenv('EMBEDDING_MODEL', 'gemini-embedding-2-preview')
        self.dimension = int(os.getenv('EMBEDDING_DIMENSION', '3072'))
        self.kv_cache = kv_cache

        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key from text"""
        return f"emb:{hashlib.sha256(text.encode()).hexdigest()[:16]}"

    def _get_from_cache(self, text: str) -> Optional[List[float]]:
        """Get embedding from KV cache"""
        if not self.kv_cache:
            return None

        try:
            cache_key = self._get_cache_key(text)
            cached = self.kv_cache.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

        return None

    def _save_to_cache(self, text: str, embedding: List[float]):
        """Save embedding to KV cache"""
        if not self.kv_cache:
            return

        try:
            cache_key = self._get_cache_key(text)
            # Cache for 7 days
            self.kv_cache.put(cache_key, json.dumps(embedding), expiration_ttl=604800)
        except Exception:
            pass

    def embed(self, text: str) -> List[float]:
        """Generate embedding for single text"""
        # Check cache first
        cached = self._get_from_cache(text)
        if cached:
            return cached

        # Call Gemini Embedding API
        url = f"{self.base_url}/{self.model}:embedContent"
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                url,
                params={"key": self.api_key},
                json={
                    "model": f"models/{self.model}",
                    "content": {
                        "parts": [{"text": text}]
                    }
                }
            )
            response.raise_for_status()

            data = response.json()
            embedding = data.get("embedding", {}).get("values", [])

            if len(embedding) != self.dimension:
                raise ValueError(f"Unexpected embedding dimension: {len(embedding)}, expected {self.dimension}")

            # Save to cache
            self._save_to_cache(text, embedding)

            return embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts using batchEmbedContents"""
        embeddings = []
        uncached_texts = []
        uncached_indices = []

        # Check cache for each text
        for i, text in enumerate(texts):
            cached = self._get_from_cache(text)
            if cached:
                embeddings.append(cached)
            else:
                embeddings.append(None)
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Batch call for uncached texts (max 100 per request)
        if uncached_texts:
            for batch_start in range(0, len(uncached_texts), 100):
                batch_texts = uncached_texts[batch_start:batch_start + 100]
                batch_indices = uncached_indices[batch_start:batch_start + 100]

                url = f"{self.base_url}/{self.model}:batchEmbedContents"
                requests = [
                    {
                        "model": f"models/{self.model}",
                        "content": {
                            "parts": [{"text": text}]
                        }
                    }
                    for text in batch_texts
                ]

                with httpx.Client(timeout=60.0) as client:
                    response = client.post(
                        url,
                        params={"key": self.api_key},
                        json={"requests": requests}
                    )
                    response.raise_for_status()

                    data = response.json()
                    batch_data = data.get("embeddings", [])

                    # Fill in uncached embeddings and save to cache
                    for j, emb_data in enumerate(batch_data):
                        embedding = emb_data.get("values", [])
                        idx = batch_indices[j]
                        embeddings[idx] = embedding
                        self._save_to_cache(batch_texts[j], embedding)

        return embeddings


def get_embeddings_client(kv_cache=None) -> GeminiEmbeddings:
    """Get Gemini embeddings client"""
    return GeminiEmbeddings(kv_cache=kv_cache)
