"""
AstraDB Connector for Hermes NeuroEscrow
Uses DataAPIClient (2026 standard) with isolated collections
"""
import os
from typing import Optional, List, Dict, Any
from astrapy import DataAPIClient
from astrapy.constants import VectorMetric


class AstraDBConnector:
    """Modern AstraDB connector using DataAPIClient (2026)"""
    
    _instance: Optional['AstraDBConnector'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        
        self.token = os.getenv('ASTRA_DB_TOKEN')
        self.endpoint = os.getenv('ASTRA_DB_ENDPOINT')
        
        if not self.token or not self.endpoint:
            raise ValueError("ASTRA_DB_TOKEN and ASTRA_DB_ENDPOINT must be set")
        
        # Initialize DataAPIClient
        self.client = DataAPIClient(self.token)
        self.db = self.client.get_database(self.endpoint)
        
        # Collection names (isolated from main holograms.media)
        self.CODEBASE_COLLECTION = "neuroescrow_codebase_3072"
        self.MEMORY_COLLECTION = "neuroescrow_memory_3072"
        
        self._initialized = True
    
    def _ensure_collection(self, collection_name: str, dimension: int = 3072):
        """Ensure collection exists with proper vector configuration"""
        try:
            return self.db.get_collection(collection_name)
        except Exception:
            return self.db.create_collection(
                collection_name,
                dimension=dimension,
                metric=VectorMetric.COSINE
            )
    
    def get_codebase_collection(self):
        """Get or create codebase collection"""
        return self._ensure_collection(self.CODEBASE_COLLECTION)
    
    def get_memory_collection(self):
        """Get or create memory collection"""
        return self._ensure_collection(self.MEMORY_COLLECTION)
    
    def insert_document(self, collection_name: str, document: Dict[str, Any], vector: Optional[List[float]] = None) -> str:
        """Insert document with optional vector"""
        collection = self._ensure_collection(collection_name)
        
        if vector:
            document['$vector'] = vector
        
        result = collection.insert_one(document)
        return result.inserted_id
    
    def vector_search(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None,
        include_similarity: bool = True
    ) -> List[Dict[str, Any]]:
        """Perform vector similarity search"""
        collection = self._ensure_collection(collection_name)
        
        cursor = collection.find(
            filter=filter_dict or {},
            sort={"$vector": query_vector},
            limit=limit,
            include_similarity=include_similarity
        )
        
        return list(cursor)
    
    def delete_by_filter(self, collection_name: str, filter_dict: Dict[str, Any]) -> int:
        """Delete documents matching filter"""
        collection = self._ensure_collection(collection_name)
        result = collection.delete_many(filter_dict)
        return result.deleted_count
    
    def get_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get collection statistics"""
        collection = self._ensure_collection(collection_name)
        count = collection.count_documents({})
        
        return {
            "collection": collection_name,
            "document_count": count,
            "status": "healthy"
        }


def get_astra_connector() -> AstraDBConnector:
    """Get singleton AstraDB connector instance"""
    return AstraDBConnector()
