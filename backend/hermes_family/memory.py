"""
AstraDB Storage Backend for CrewAI Memory
Custom storage that persists agent memory in AstraDB (3072d COSINE).
Cognitive Memory operations: encode/consolidate/recall/forget.

B4 Phase
"""

import os
import logging
from typing import Any, Optional, List
from datetime import datetime, timedelta

from astrapy import DataAPIClient

logger = logging.getLogger(__name__)

# EMBED_DIM = 3072 — НИКОГДА не менять
EMBED_DIM = 3072
MEMORY_COLLECTION = "crewai_memory_3072"
CHECKPOINT_COLLECTION = "crewai_checkpoints"


class AstraDBStorageBackend:
    """
    CrewAI Memory → AstraDB (3072d COSINE).
    Implements save/search/reset for CrewAI's Unified Memory API.
    """

    def __init__(self, collection_name: str = MEMORY_COLLECTION):
        self.token = os.getenv("ASTRA_DB_APPLICATION_TOKEN", "")
        self.endpoint = os.getenv("ASTRA_DB_API_ENDPOINT", "")
        self.collection_name = collection_name
        self._collection = None

        if not self.token or not self.endpoint:
            logger.warning("AstraDB credentials not configured for Memory backend")

    def _get_collection(self):
        """Get or create collection"""
        if self._collection is not None:
            return self._collection

        if not self.token or not self.endpoint:
            raise ValueError("AstraDB credentials required for Memory backend")

        client = DataAPIClient(self.token)
        db = client.get_database(self.endpoint)

        try:
            self._collection = db.get_collection(self.collection_name)
        except Exception:
            self._collection = db.create_collection(
                self.collection_name,
                dimension=EMBED_DIM,
                metric="cosine"
            )
            logger.info(f"Created AstraDB collection: {self.collection_name} ({EMBED_DIM}d)")

        return self._collection

    def save(self, records) -> None:
        """Save memory records to AstraDB"""
        collection = self._get_collection()

        for record in records:
            try:
                doc = {
                    "content": record.content if hasattr(record, 'content') else str(record),
                    "metadata": record.metadata if hasattr(record, 'metadata') else {},
                    "scope": (record.metadata if hasattr(record, 'metadata') else {}).get("scope", "/default"),
                    "timestamp": datetime.utcnow().isoformat(),
                }

                # Add vector if available
                if hasattr(record, 'embedding') and record.embedding:
                    doc["$vector"] = record.embedding

                collection.insert_one(doc)
            except Exception as e:
                logger.error(f"Failed to save memory record: {e}")

    def search(self, query: str, limit: int = 5, **kwargs) -> list:
        """Search memory by query text or embedding"""
        collection = self._get_collection()
        scope = kwargs.get("scope")

        filter_clause = {}
        if scope:
            filter_clause["scope"] = scope

        # If query_embedding is provided, use vector search
        query_embedding = kwargs.get("query_embedding")
        if query_embedding:
            try:
                cursor = collection.find(
                    filter=filter_clause if filter_clause else None,
                    sort={"$vector": query_embedding},
                    limit=limit,
                    include_similarity=True
                )
                return list(cursor)
            except Exception as e:
                logger.error(f"Vector search failed: {e}")
                return []

        # Fallback: text search (less precise)
        try:
            cursor = collection.find(
                filter={"content": {"$regex": query}},
                limit=limit,
            )
            return list(cursor)
        except Exception as e:
            logger.error(f"Text search failed: {e}")
            return []

    def reset(self) -> None:
        """Reset memory — does NOT delete collection, only clears scope"""
        logger.warning("AstraDB Memory reset called — not deleting collection")

    def delete_old(self, days: int = 30) -> int:
        """Forget memories older than N days (GDPR / TTL)"""
        collection = self._get_collection()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        try:
            result = collection.delete_many({
                "timestamp": {"$lt": cutoff}
            })
            deleted = result.deleted_count if hasattr(result, 'deleted_count') else 0
            logger.info(f"Forgot {deleted} memories older than {days} days")
            return deleted
        except Exception as e:
            logger.error(f"Forget operation failed: {e}")
            return 0


class CheckpointStore:
    """
    CrewAI Checkpoints → AstraDB (not SQLite — survives deploys).
    Stores flow state as JSON with timestamp.
    """

    def __init__(self):
        self.token = os.getenv("ASTRA_DB_APPLICATION_TOKEN", "")
        self.endpoint = os.getenv("ASTRA_DB_API_ENDPOINT", "")
        self._collection = None

    def _get_collection(self):
        if self._collection is not None:
            return self._collection

        if not self.token or not self.endpoint:
            raise ValueError("AstraDB credentials required for Checkpoint store")

        client = DataAPIClient(self.token)
        db = client.get_database(self.endpoint)

        try:
            self._collection = db.get_collection(CHECKPOINT_COLLECTION)
        except Exception:
            # Checkpoints don't need vectors — just JSON storage
            self._collection = db.create_collection(CHECKPOINT_COLLECTION)
            logger.info(f"Created AstraDB collection: {CHECKPOINT_COLLECTION}")

        return self._collection

    def save_checkpoint(self, state_id: str, state_data: dict) -> str:
        """Save flow state checkpoint"""
        collection = self._get_collection()

        doc = {
            "_id": state_id,
            "state": state_data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            # Upsert: replace if exists
            collection.replace_one({"_id": state_id}, doc, upsert=True)
            logger.info(f"Checkpoint saved: {state_id}")
            return state_id
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")
            raise

    def load_checkpoint(self, state_id: str) -> Optional[dict]:
        """Load flow state checkpoint"""
        collection = self._get_collection()

        try:
            doc = collection.find_one({"_id": state_id})
            if doc:
                return doc.get("state")
            return None
        except Exception as e:
            logger.error(f"Failed to load checkpoint: {e}")
            return None

    def list_checkpoints(self, limit: int = 20) -> list:
        """List recent checkpoints"""
        collection = self._get_collection()

        try:
            cursor = collection.find(
                sort={"timestamp": -1},
                limit=limit,
                projection={"_id": 1, "timestamp": 1}
            )
            return list(cursor)
        except Exception as e:
            logger.error(f"Failed to list checkpoints: {e}")
            return []
