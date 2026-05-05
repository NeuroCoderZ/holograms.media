"""
NeuroEscrow / Hermes — RAG Memory Core

Vector memory for Hermes using AstraDB (holograms.media infrastructure).
Stores codebase chunks with Mistral embeddings (1536d).
"""

import asyncio
import uuid
from datetime import datetime


class HermesMemory:
    """
    Vector memory for Hermes agent.
    Uses AstraDB for storage (shared with holograms.media).
    """

    VECTOR_SIZE = 1536  # codestral-embed-2505

    def __init__(self, astra_client, embedding_client, collection_name="neuroescrow_codebase"):
        """
        Initialize memory with AstraDB client and embedding client.
        
        Args:
            astra_client: AstraDB client instance
            embedding_client: MistralEmbeddingClient instance
            collection_name: Collection name in AstraDB
        """
        self.astra = astra_client
        self.embed_client = embedding_client
        self.collection_name = collection_name
        self._collection = None

    async def _get_collection(self):
        """Get or create collection."""
        if self._collection is None:
            try:
                self._collection = await self.astra.create_collection(
                    self.collection_name,
                    dimension=self.VECTOR_SIZE,
                    metric="cosine"
                )
            except Exception as e:
                # Collection might already exist
                self._collection = self.astra.get_collection(self.collection_name)
        return self._collection

    async def add_chunk(self, filename: str, content: str, language: str, chunk_index: int, total_chunks: int):
        """
        Add a code chunk to memory.
        
        Returns:
            chunk_id: UUID of the stored chunk
        """
        collection = await self._get_collection()
        
        # Generate embedding
        text = f"File: {filename}\nLanguage: {language}\n\n{content}"
        embedding = await self.embed_client.embed(text)
        
        # Generate deterministic ID
        chunk_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{filename}:{chunk_index}"))
        
        # Store in AstraDB
        await collection.insert_one({
            "_id": chunk_id,
            "filename": filename,
            "language": language,
            "content": content,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "timestamp": datetime.utcnow().isoformat(),
            "$vector": embedding
        })
        
        return chunk_id

    async def search_codebase(self, query: str, limit: int = 5):
        """
        Search codebase for relevant chunks.
        
        Args:
            query: Search query
            limit: Max number of results
            
        Returns:
            List of matching chunks with metadata
        """
        collection = await self._get_collection()
        
        # Generate query embedding
        query_embedding = await self.embed_client.embed(query)
        
        # Search in AstraDB
        results = await collection.find(
            sort={"$vector": query_embedding},
            limit=limit,
            projection={"filename": 1, "language": 1, "content": 1, "chunk_index": 1}
        )
        
        return [
            {
                "filename": r.get("filename"),
                "language": r.get("language"),
                "content": r.get("content"),
                "chunk_index": r.get("chunk_index")
            }
            for r in results
        ]

    async def delete_file_chunks(self, filename: str):
        """Delete all chunks for a specific file."""
        collection = await self._get_collection()
        await collection.delete_many({"filename": filename})

    async def get_stats(self):
        """Get collection statistics."""
        collection = await self._get_collection()
        count = await collection.count_documents({})
        return {
            "total_chunks": count,
            "collection": self.collection_name,
            "vector_size": self.VECTOR_SIZE
        }
