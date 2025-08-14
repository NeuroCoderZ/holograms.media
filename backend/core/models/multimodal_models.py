from pydantic import Field, BaseModel
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
import uuid

from .base_models import BaseUUIDModel

class AudiovisualGesturalChunkModel(BaseUUIDModel):
    user_id: str = Field(..., description="Firebase UID of the user who uploaded/owns this chunk.")
    chunk_type: str = Field(..., description="Type of the chunk (e.g., 'audio', 'video', 'audiovisual', 'gesture_only').")
    storage_ref: str = Field(..., description="Reference to the chunk's location in Firebase Storage (e.g., gs://bucket_name/path/to/file).")
    
    original_filename: Optional[str] = Field(default=None, description="Original filename of the uploaded chunk.")
    mime_type: Optional[str] = Field(default=None, description="MIME type of the chunk.")
    duration_seconds: Optional[float] = Field(default=None, description="Duration of the audio/video content in seconds.")
    resolution_width: Optional[int] = Field(default=None, description="Width of video content in pixels.")
    resolution_height: Optional[int] = Field(default=None, description="Height of video content in pixels.")
    
    tria_processing_status: str = Field(default="pending", description="Status of Tria's processing for this chunk (e.g., pending, processing, processed, failed).")
    tria_extracted_features_json: Optional[Dict[str, Any]] = Field(default=None, description="Features extracted by Tria (e.g., transcript_id, detected_objects_summary).")
    
    related_gesture_id: Optional[int] = Field(default=None, description="If this chunk is associated with a specific gesture. Links to user_gestures.gesture_id (INT).")
    related_hologram_id: Optional[UUID] = Field(default=None, description="If this chunk is used in or generated a hologram.")

    custom_metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any other custom metadata for this chunk.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
                    "user_id": "aBcDeFgHiJkLmNoPqRsTuVwXyZ12345",
                    "chunk_type": "audio",
                    "storage_ref": "gs://holograms-media-mvp.appspot.com/user_uploads/user_abc/audio_chunk_1.wav",
                    "original_filename": "my_voice_memo.wav",
                    "mime_type": "audio/wav",
                    "duration_seconds": 15.7,
                    "tria_processing_status": "processed",
                    "related_gesture_id": 123,
                    "created_at": "2024-05-29T14:00:00Z",
                    "updated_at": "2024-05-29T14:05:00Z"
                }
            ]
        }

class UserGestureModel(BaseModel):
    gesture_id: int = Field(..., description="Primary key for the gesture.")
    user_id: str = Field(..., description="Firebase UID of the user who owns this gesture.")
    gesture_name: str = Field(..., description="Name of the gesture.")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of when the gesture was created.")
    thumbnail_url: Optional[str] = Field(default=None, description="Placeholder for gesture thumbnail URL.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "gesture_id": 1,
                    "user_id": "aBcDeFgHiJkLmNoPqRsTuVwXyZ12345",
                    "gesture_name": "Wave_Hello",
                    "created_at": "2024-06-15T10:00:00Z",
                    "thumbnail_url": "https://example.com/thumbnails/wave_hello.png"
                }
            ]
        }

class MediaFileBase(BaseModel):
    file_name: str = Field(..., max_length=255)
    storage_path: str = Field(..., max_length=1024, description="Full path in Cloud Storage")
    file_type: Optional[str] = Field(None, max_length=100, description="MIME type or general type")
    file_size_bytes: Optional[int] = Field(None, ge=0)
    duration_seconds: Optional[float] = Field(None, ge=0.0, description="For audio/video files")
    resolution_width: Optional[int] = Field(None, ge=0, description="For video/image files")
    resolution_height: Optional[int] = Field(None, ge=0, description="For video/image files")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other specific metadata")

class MediaFileCreate(MediaFileBase):
    user_id: Optional[str] = None

class MediaFileDB(MediaFileBase):
    id: int
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
