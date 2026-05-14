"""
NeuroEscrow / Hermes — Gemini Embeddings Client

Uses Google Gemini API for gemini-embedding-2-preview (3072d).
Migrated from Mistral codestral-embed-2505 (1536d) — A1 Phase.
"""

import asyncio
import httpx

# Gemini embedding dimension for gemini-embedding-2-preview
GEMINI_EMBED_DIM = 3072
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiEmbeddingClient:
    """
    Async client for Gemini embedding API.
    Model: gemini-embedding-2-preview (3072-dim).
    """

    def __init__(self, api_key: str, model: str = "gemini-embedding-2-preview", batch_size: int = 100):
        self.api_key = api_key
        self.model = model
        self.batch_size = batch_size
        self._client = None
        self.vector_size = GEMINI_EMBED_DIM

    @property
    def client(self):
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=60.0,
            )
        return self._client

    async def embed(self, text: str):
        """Embed a single text into a 3072-dim vector."""
        url = f"{GEMINI_API_BASE}/{self.model}:embedContent"
        params = {"key": self.api_key}
        payload = {
            "model": f"models/{self.model}",
            "content": {
                "parts": [{"text": text}]
            }
        }

        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            embedding = data.get("embedding", {}).get("values", [])

            if len(embedding) != self.vector_size:
                print(f"[WARN] Unexpected embedding dimension: {len(embedding)}, expected {self.vector_size}")

            return embedding

        except httpx.HTTPStatusError as e:
            print(f"[ERROR] Gemini API error: {e.response.status_code}")
            return [0.0] * self.vector_size
        except Exception as e:
            print(f"[ERROR] Embedding failed: {e}")
            return [0.0] * self.vector_size

    async def embed_batch(self, texts: list):
        """
        Embed a batch of texts using Gemini batchEmbedContents.
        Automatically chunks by batch_size (max 100 per request).
        """
        if not self.api_key:
            print("[ERROR] Gemini API key not configured")
            return [[0.0] * self.vector_size for _ in texts]

        all_embeddings = []

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i: i + self.batch_size]
            embeddings = await self._embed_batch_chunk(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def _embed_batch_chunk(self, texts: list):
        """Send a single batchEmbedContents request."""
        url = f"{GEMINI_API_BASE}/{self.model}:batchEmbedContents"
        params = {"key": self.api_key}

        requests = [
            {
                "model": f"models/{self.model}",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            for text in texts
        ]

        payload = {"requests": requests}

        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()

            embeddings = []
            batch_data = data.get("embeddings", [])

            for item in batch_data:
                embedding = item.get("values", [])
                if len(embedding) != self.vector_size:
                    print(f"[WARN] Unexpected embedding dimension: {len(embedding)}")
                embeddings.append(embedding)

            # Pad missing embeddings
            while len(embeddings) < len(texts):
                embeddings.append([0.0] * self.vector_size)

            print(f"[INFO] Embeddings generated: {len(texts)} texts, {self.vector_size}d")
            return embeddings

        except httpx.HTTPStatusError as e:
            print(f"[ERROR] Gemini Batch API error: {e.response.status_code}")
            return [[0.0] * self.vector_size for _ in texts]
        except Exception as e:
            print(f"[ERROR] Batch embedding failed: {e}")
            return [[0.0] * self.vector_size for _ in texts]

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
