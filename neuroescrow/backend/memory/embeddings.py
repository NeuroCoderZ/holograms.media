"""
NeuroEscrow / Hermes — Mistral Embeddings Client

Uses Mistral API for codestral-embed-2505.
1536-dimensional embeddings for codebase RAG.
"""

import asyncio
import httpx

# Mistral embedding dimension for codestral-embed-2505
CODESTRAL_EMBED_DIM = 1536
MISTRAL_API_BASE = "https://api.mistral.ai/v1"
MISTRAL_EMBED_URL = f"{MISTRAL_API_BASE}/embeddings"


class MistralEmbeddingClient:
    """
    Async client for Mistral embedding API.
    Model: codestral-embed-2505 (1536-dim).
    """

    def __init__(self, api_key: str, model: str = "codestral-embed-2505", batch_size: int = 32):
        self.api_key = api_key
        self.model = model
        self.batch_size = batch_size
        self._client = None
        self.vector_size = CODESTRAL_EMBED_DIM

    @property
    def client(self):
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=60.0,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
        return self._client

    async def embed(self, text: str):
        """Embed a single text into a 1536-dim vector."""
        results = await self.embed_batch([text])
        return results[0]

    async def embed_batch(self, texts: list):
        """
        Embed a batch of texts.
        Automatically chunks by batch_size to stay within API limits.
        """
        if not self.api_key:
            print("[ERROR] Mistral API key not configured")
            return [[0.0] * self.vector_size for _ in texts]

        all_embeddings = []

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            embeddings = await self._embed_chunk(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def _embed_chunk(self, texts: list):
        """Send a single API request for up to batch_size texts."""
        payload = {
            "model": self.model,
            "input": texts,
            "encoding_format": "float",
        }

        try:
            response = await self.client.post(MISTRAL_EMBED_URL, json=payload)
            response.raise_for_status()
            data = response.json()

            embeddings = []
            for item in data.get("data", []):
                embedding = item.get("embedding", [])
                if len(embedding) != self.vector_size:
                    print(f"[WARN] Unexpected embedding dimension: {len(embedding)}")
                embeddings.append(embedding)

            while len(embeddings) < len(texts):
                embeddings.append([0.0] * self.vector_size)

            print(f"[INFO] Embeddings generated: {len(texts)} texts, {self.vector_size}d")
            return embeddings

        except httpx.HTTPStatusError as e:
            print(f"[ERROR] Mistral API error: {e.response.status_code}")
            return [[0.0] * self.vector_size for _ in texts]
        except Exception as e:
            print(f"[ERROR] Embedding failed: {e}")
            return [[0.0] * self.vector_size for _ in texts]

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
