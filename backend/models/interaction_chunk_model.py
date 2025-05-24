# File: backend/models/interaction_chunk_model.py
# Purpose: Pydantic model for Interaction Chunks.
# Key Future Dependencies: Pydantic.
# Main Future Exports/API: InteractionChunkBase, InteractionChunkCreate, InteractionChunkDB.
# Link to Legacy Logic (if applicable): Related to "комбинированный аудио(видео)-жестовый чанк".
# Intended Technology Stack: Python, Pydantic.
# TODO: Define fields for landmark_data, video_chunk_ref, audio_chunk_ref, timestamp, user_id.
# TODO: Add validation rules.
# TODO: Consider inheritance for create, read, update models.

from pydantic import BaseModel
from typing import Optional, Dict, Any
import datetime

class InteractionChunkBase(BaseModel):
    timestamp: datetime.datetime
    user_id: Optional[str] = None
    # TODO: Define specific fields for gesture, audio, video data/references
    raw_data: Dict[str, Any] 

class InteractionChunkCreate(InteractionChunkBase):
    pass

class InteractionChunkDB(InteractionChunkBase):
    id: int # Assuming an auto-incrementing ID from DB
    # Add other DB specific fields if any

    class Config:
        orm_mode = True
