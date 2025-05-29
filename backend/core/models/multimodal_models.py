from pydantic import Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

class AudiovisualGesturalChunkModel(BaseUUIDModel): # Inherits id, created_at, updated_at
    user_id: UUID = Field(..., description="ID of the user who uploaded/owns this chunk.")
    chunk_type: str = Field(..., description="Type of the chunk (e.g., 'audio', 'video', 'audiovisual', 'gesture_only').")
    storage_ref: str = Field(..., description="Reference to the chunk's location in Firebase Storage (e.g., gs://bucket_name/path/to/file).")
    
    # Metadata specific to the chunk content
    original_filename: Optional[str] = Field(default=None, description="Original filename of the uploaded chunk.")
    mime_type: Optional[str] = Field(default=None, description="MIME type of the chunk.")
    duration_seconds: Optional[float] = Field(default=None, description="Duration of the audio/video content in seconds.")
    resolution_width: Optional[int] = Field(default=None, description="Width of video content in pixels.")
    resolution_height: Optional[int] = Field(default=None, description="Height of video content in pixels.")
    
    # Metadata related to processing or analysis by Tria
    tria_processing_status: str = Field(default="pending", description="Status of Tria's processing for this chunk (e.g., pending, processing, processed, failed).")
    tria_extracted_features_json: Optional[Dict[str, Any]] = Field(default=None, description="Features extracted by Tria (e.g., transcript_id, detected_objects_summary).")
    
    # Linking to other entities
    related_gesture_id: Optional[UUID] = Field(default=None, description="If this chunk is associated with a specific gesture.")
    related_hologram_id: Optional[UUID] = Field(default=None, description="If this chunk is used in or generated a hologram.")

    # Additional contextual metadata
    custom_metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any other custom metadata for this chunk.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
                    "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", # Example user_id
                    "chunk_type": "audio",
                    "storage_ref": "gs://holograms-media-mvp.appspot.com/user_uploads/user_abc/audio_chunk_1.wav",
                    "original_filename": "my_voice_memo.wav",
                    "mime_type": "audio/wav",
                    "duration_seconds": 15.7,
                    "tria_processing_status": "processed",
                    "created_at": "2024-05-29T14:00:00Z",
                    "updated_at": "2024-05-29T14:05:00Z"
                }
            ]
        }
