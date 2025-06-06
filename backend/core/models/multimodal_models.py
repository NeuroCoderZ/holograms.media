from pydantic import Field, BaseModel
from typing import Optional, Dict, Any, List # Added List
from uuid import UUID
from datetime import datetime
import uuid # Imported for backend/models content

from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

class AudiovisualGesturalChunkModel(BaseUUIDModel): # Inherits id, created_at, updated_at
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

class UserGestureModel(BaseModel): # Kept as is from original core file
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

# --- Content appended from backend/models/multimodal_models.py ---

class InteractionChunkBase(BaseModel):
    session_id: Optional[str] = Field(None, max_length=255, description="Identifier for a user session")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of the interaction")

    audio_file_id: Optional[int] = None
    video_file_id: Optional[int] = None

    hand_landmarks: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Raw hand landmark data")
    gesture_classification_client: Optional[str] = Field(None, description="Client-side initial gesture classification")
    gesture_confidence_client: Optional[float] = Field(None, ge=0.0, le=1.0, description="Client-side confidence for the classification")
    speech_transcription_client: Optional[str] = Field(None, description="Client-side speech transcription")
    environment_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contextual information about the user's environment")

    user_feedback_rating: Optional[int] = Field(None, ge=1, le=5, description="User rating for Tria's response (e.g., 1-5 stars)")
    user_feedback_text: Optional[str] = Field(None, description="User textual feedback")
    user_flagged_issue: Optional[bool] = Field(default=False, description="Whether the user flagged an issue")

    tria_processed_flag: Optional[bool] = Field(default=False, description="Whether Tria has fully processed this chunk")
    processing_tags: Optional[List[str]] = Field(default_factory=list, description="Tags added during processing by Tria")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other miscellaneous metadata")
    raw_data_blob: Optional[Dict[str, Any]] = Field(default_factory=dict, description="For any other raw data associated with the chunk")

class InteractionChunkCreate(InteractionChunkBase):
    user_id: str

class InteractionChunkDB(InteractionChunkBase):
    id: int
    user_id: str
    chunk_embedding: Optional[List[float]] = None

    class Config:
        orm_mode = True

class InteractionChunkPublic(InteractionChunkDB):
    pass

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
