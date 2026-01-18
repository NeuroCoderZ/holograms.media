from astrapy import Database
from typing import Optional
import logging
from datetime import datetime

from backend.core.models.interaction_chunk_model import InteractionChunkCreate, InteractionChunkDB

logger = logging.getLogger(__name__)

class InteractionChunkRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection_name = "interaction_chunks"
        self.collection = self.db.get_collection(self.collection_name)

    async def create_chunk(self, user_id: str, chunk_create: InteractionChunkCreate) -> Optional[InteractionChunkDB]:
        # The user_id from the authenticated user overrides any user_id in the payload.
        chunk_create.user_id = user_id
        
        # Convert pydantic model to dict for Astra
        chunk_data = chunk_create.dict()
        
        # Astra DB JSON API expects datetime as strings usually or handled by the driver
        # We ensure timestamp is ISO formatted if needed, but astrapy handles many types.
        if isinstance(chunk_data.get('timestamp'), datetime):
            chunk_data['timestamp'] = chunk_data['timestamp'].isoformat()
            
        try:
            result = self.collection.insert_one(chunk_data)
            if result and result.inserted_id:
                # Add the generated ID to the data
                chunk_data['id'] = str(result.inserted_id)
                # Convert back to internal model if possible, though InteractionChunkDB
                # might expect specific types. 
                return InteractionChunkDB(**chunk_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in InteractionChunkRepository.create_chunk for user {user_id}: {e}")
            raise
