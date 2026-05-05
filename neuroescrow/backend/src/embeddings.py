"""
Mistral Embeddings with KV Cache
Uses codestral-embed-2505 (1536 dimensions)
"""
import os
import hashlib
import json
from typing import List, Optional
import httpx


class MistralEmbeddings:
    """Mistral embeddings client with KV caching"""
    
    def __init__(self, kv_cache=None):
        self.api_key = os.getenv('MISTRAL_API_KEY')
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY must be set")
        
        self.model = os.getenv('EMBEDDING_MODEL', 'codestral-embed-2505')
        self.dimension = int(os.getenv('EMBEDDING_DIMENSION', '1536'))
        self.kv_cache = kv_cache
        
        self.base_url = "https://api.mistral.ai/v1/embeddings"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
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
        
        # Call Mistral API
        with httpx.Client() as client:
            response = client.post(
                self.base_url,
                headers=self.headers,
                json={
                    "model": self.model,
                    "input": [text]
                },
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()
            embedding = data['data'][0]['embedding']
            
            # Save to cache
            self._save_to_cache(text, embedding)
            
            return embedding
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts (batch)"""
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
        
        # Batch call for uncached texts
        if uncached_texts:
            with httpx.Client() as client:
                response = client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "input": uncached_texts
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                # Fill in uncached embeddings and save to cache
                for i, emb_data in enumerate(data['data']):
                    embedding = emb_data['embedding']
                    idx = uncached_indices[i]
                    embeddings[idx] = embedding
                    self._save_to_cache(uncached_texts[i], embedding)
        
        return embeddings


def get_embeddings_client(kv_cache=None) -> MistralEmbeddings:
    """Get Mistral embeddings client"""
    return MistralEmbeddings(kv_cache=kv_cache)
