# backend/tria_agents/tria_rag_service.py
from pydantic import BaseModel
from typing import List, Dict, Any, Tuple, Optional
import time
import logging
import hashlib
from backend.services.gemini_embedding_service import gemini_embeddings  # NEW: Gemini Embedding 2
from backend.services.mistral_embedding_service import mistral_embeddings  # Legacy
from backend.core.db.astra_connector import get_astra_db
from backend.core.config import settings

logger = logging.getLogger(__name__)

class TriaRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class TriaResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []
    processing_time: float = 0.0

class TriaRAGService:
    """
    Retrieval-Augmented Generation Service for Триа codebase and documentation.
    Updated for Gemini Embedding 2 (Free Tier) with Matryoshka dimensionality.
    """
    def __init__(self):
        self.collection_name = "tria_knowledge_gemini"  # NEW collection name

    async def get_relevant_context(self, query: str, limit: int = 5, user_id: str = None) -> str:
        """
        Embeds the query using Gemini Embedding 2 and performs vector search in AstraDB.
        """
        try:
            # 1. Get embedding for the query (Gemini Embedding 2)
            query_vector = await gemini_embeddings.get_embedding(
                query, 
                task_type="RETRIEVAL_QUERY"
            )
            
            if not query_vector:
                logger.error("RAG: Failed to generate query embedding.")
                return ""
            
            # 2. Connect to AstraDB
            db = get_astra_db()
            if not db:
                logger.error("RAG: Could not connect to AstraDB.")
                return ""
            
            # Performance-First RAG Threshold (v0.20.236)
            # 3. Perform vector search with Soft Metadata Filter (RLS)
            collection = db.get_collection(self.collection_name)
            
            # Remove hard visibility check as documents may lack it.
            rls_filter = {} 

            results = await collection.find(
                filter=rls_filter if rls_filter else None,
                sort={"$vector": query_vector},
                limit=limit,
                include_similarity=True
            ).to_list()
            
            if not results:
                logger.debug(f"RAG: No relevant context found for '{query}'")
                return "" # Quiet return
            
            # 4. Format context with lowered threshold
            context_blocks = []
            for res in results:
                content = res.get("content", "")
                similarity = res.get("$similarity", 0.0)
                # Lowered threshold 0.40 for broader context retrieval
                if similarity > 0.40: 
                    source = res.get("metadata", {}).get("source", "unknown")
                    context_blocks.append(f"Source: {source} (Sim: {similarity:.3f})\n{content}")
            
            if not context_blocks:
                return "### RAG: Найдено несколько совпадений, но их релевантность ниже 0.45."

            logger.info(f"RAG: Found {len(context_blocks)} relevant snippets.")
            return "\n\n---\n\n".join(context_blocks)
            
        except Exception as e:
            logger.error(f"RAG Service Error: {e}")
            return ""

    async def sync_file(self, file_path: str, content: str, owner_id: str = "system", visibility: str = "public"):
        """
        Atomic Incremental Sync: удаляет старые чанки файла и вставляет новые.
        """
        try:
            db = get_astra_db()
            collection = db.get_collection(self.collection_name)
            
            # 1. Atomic Deletion
            logger.info(f"RAG Sync: Clearing old chunks for {file_path}")
            await collection.delete_many({"metadata.source": file_path})
            
            # 2. Chunking & Embedding
            from tools.refresh_knowledge import chunk_code
            chunks = chunk_code(content)
            
            all_chunks = []
            for snippet in chunks:
                chunk_text = f"File: {file_path}\nContent:\n{snippet}"
                chunk_id = hashlib.sha256(chunk_text.encode('utf-8')).hexdigest()
                
                all_chunks.append({
                    "_id": chunk_id,
                    "text": chunk_text,
                    "metadata": {
                        "source": file_path,
                        "owner_id": owner_id,
                        "visibility": visibility,
                        "type": "code_snippet"
                    }
                })
            
            # 3. Batch Insert
            if all_chunks:
                documents = []
                for chunk in all_chunks:
                    # Get Gemini Embedding 2 (3072d)
                    vector = await gemini_embeddings.get_embedding(chunk["text"], task_type="RETRIEVAL_DOCUMENT")
                    if vector:
                        documents.append({
                            "_id": chunk["_id"],
                            "content": chunk["text"],
                            "$vector": vector,
                            "metadata": chunk["metadata"]
                        })
                
                if documents:
                    await collection.insert_many(documents, ordered=False)
                    logger.info(f"RAG Sync: Ingested {len(documents)} chunks for {file_path}")

        except Exception as e:
            logger.error(f"RAG Sync Error for {file_path}: {e}")

# Global instance
tria_rag = TriaRAGService()
