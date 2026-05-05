"""
NeuroEscrow / Hermes — AstraDB Connector

Production-ready connector with collection isolation.
Uses separate collections: neuroescrow_memory, neuroescrow_codebase
"""

import os
import logging
from astrapy import DataAPIClient

logger = logging.getLogger(__name__)

# NeuroEscrow-specific collections (isolated from holograms.media)
NEUROESCROW_COLLECTIONS = {
    "memory": "neuroescrow_memory",      # Chat history + deal context
    "codebase": "neuroescrow_codebase",  # Code chunks for RAG
}


class NeuroEscrowAstraConnector:
    """
    AstraDB connector for NeuroEscrow with collection isolation.
    Ensures no conflicts with main holograms.media collections.
    """
    
    def __init__(self, token: str = None, endpoint: str = None):
        """
        Initialize connector with credentials.
        
        Args:
            token: AstraDB application token (from env if not provided)
            endpoint: AstraDB API endpoint (from env if not provided)
        """
        self.token = token or os.getenv("ASTRA_DB_APPLICATION_TOKEN")
        self.endpoint = endpoint or os.getenv("ASTRA_DB_API_ENDPOINT")
        
        if not self.token:
            logger.critical("❌ ASTRA_DB_APPLICATION_TOKEN is missing!")
            raise ValueError("AstraDB token required")
        
        if not self.endpoint:
            logger.critical("❌ ASTRA_DB_API_ENDPOINT is missing!")
            raise ValueError("AstraDB endpoint required")
        
        self.client = DataAPIClient(self.token)
        self.db = None
        self._collections = {}
    
    async def connect(self):
        """Establish connection to AstraDB."""
        try:
            # Get async database instance
            self.db = self.client.get_async_database(
                self.endpoint,
                keyspace=os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
            )
            logger.info(f"✅ Connected to AstraDB: {self.endpoint[:30]}...")
            return self.db
        except Exception as e:
            logger.error(f"❌ Failed to connect to AstraDB: {e}")
            raise
    
    async def get_collection(self, collection_type: str):
        """
        Get or create collection by type.
        
        Args:
            collection_type: 'memory' or 'codebase'
        
        Returns:
            AstraDB collection instance
        """
        if not self.db:
            await self.connect()
        
        if collection_type not in NEUROESCROW_COLLECTIONS:
            raise ValueError(f"Invalid collection type: {collection_type}")
        
        collection_name = NEUROESCROW_COLLECTIONS[collection_type]
        
        # Return cached collection if exists
        if collection_name in self._collections:
            return self._collections[collection_name]
        
        try:
            # Try to get existing collection
            collection = await self.db.get_collection(collection_name)
            self._collections[collection_name] = collection
            logger.info(f"✅ Using existing collection: {collection_name}")
            return collection
        except Exception:
            # Collection doesn't exist, create it
            logger.info(f"Creating new collection: {collection_name}")
            
            # Vector dimension: 1536 for Mistral codestral-embed-2505
            collection = await self.db.create_collection(
                collection_name,
                dimension=1536,
                metric="cosine"
            )
            self._collections[collection_name] = collection
            logger.info(f"✅ Created collection: {collection_name}")
            return collection
    
    async def get_memory_collection(self):
        """Get memory collection for chat history."""
        return await self.get_collection("memory")
    
    async def get_codebase_collection(self):
        """Get codebase collection for RAG."""
        return await self.get_collection("codebase")
    
    async def health_check(self) -> bool:
        """Check if connection is healthy."""
        try:
            if not self.db:
                await self.connect()
            
            # Try to list collections
            collections = await self.db.list_collection_names()
            logger.info(f"✅ Health check passed. Collections: {len(collections)}")
            return True
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    async def close(self):
        """Close connection and cleanup."""
        self._collections.clear()
        self.db = None
        logger.info("✅ AstraDB connection closed")


# Singleton instance
_connector = None


def get_neuroescrow_connector(token: str = None, endpoint: str = None):
    """
    Get or create NeuroEscrow AstraDB connector singleton.
    
    Args:
        token: AstraDB token (optional, uses env if not provided)
        endpoint: AstraDB endpoint (optional, uses env if not provided)
    
    Returns:
        NeuroEscrowAstraConnector instance
    """
    global _connector
    if _connector is None:
        _connector = NeuroEscrowAstraConnector(token, endpoint)
    return _connector
