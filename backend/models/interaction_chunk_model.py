# File: backend/models/interaction_chunk_model.py
# Purpose: Pydantic model for Interaction Chunks.
# Key Future Dependencies: Pydantic.
# Main Future Exports/API: InteractionChunkBase, InteractionChunkCreate, InteractionChunkDB.
# Link to Legacy Logic (if applicable): Related to "комбинированный аудио(видео)-жестовый чанк".
# Intended Technology Stack: Python, Pydantic.
# TODO: Define fields for landmark_data, video_chunk_ref, audio_chunk_ref, timestamp, user_id.
# TODO: Add validation rules.
# TODO: Consider inheritance for create, read, update models.

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import datetime # ensure this is imported

class InteractionChunkBase(BaseModel):
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow, description="Timestamp of when the interaction chunk was created or occurred (UTC).")
    user_id: Optional[str] = Field(None, description="Identifier for the user who generated the interaction.")
    session_id: Optional[str] = Field(None, description="Identifier for the user's session, grouping multiple chunks.")

    # Data references or inline data (paths, URIs, or base64 encoded for small data if ever needed)
    audio_data_ref: Optional[str] = Field(None, description="Reference to the audio data (e.g., path, URI, or internal ID).")
    video_data_ref: Optional[str] = Field(None, description="Reference to the video data (e.g., path, URI, or internal ID).")
    # For inline data (use with caution, prefer references for large data):
    # audio_data_b64: Optional[str] = Field(None, description="Base64 encoded audio data, if small and directly embedded.")
    # video_data_b64: Optional[str] = Field(None, description="Base64 encoded video data, if small and directly embedded.")

    # Gesture and Multimodal Input Data
    hand_landmarks: Optional[List[Dict[str, Any]]] = Field(None, description="List of hand landmark objects from MediaPipe or similar. Each dict could contain 'x', 'y', 'z', 'visibility'.")
    # Example for a single landmark dict: {'x': 0.5, 'y': 0.5, 'z': 0.0, 'visibility': 0.9}
    gesture_classification_client: Optional[str] = Field(None, description="Preliminary gesture classification done on the client-side.")
    gesture_confidence_client: Optional[float] = Field(None, description="Confidence score for the client-side gesture classification.")
    
    speech_transcription_client: Optional[str] = Field(None, description="Client-side speech transcription, if available.")

    # Context and Feedback
    environment_context: Optional[Dict[str, Any]] = Field(None, description="Contextual information about the environment (e.g., lighting, noise level).")
    user_feedback_rating: Optional[int] = Field(None, description="User's rating of Tria's response/interpretation related to this chunk (e.g., 1-5 stars).")
    user_feedback_text: Optional[str] = Field(None, description="User's textual feedback or correction.")
    user_flagged_issue: Optional[bool] = Field(False, description="True if the user explicitly flagged an issue with this interaction.")

    # Processing and Metadata
    tria_processed_flag: bool = Field(False, description="Flag indicating if Tria has fully processed this chunk for learning/memory.")
    processing_tags: Optional[List[str]] = Field(default_factory=list, description="Tags added during processing (e.g., 'learning_candidate', 'error_in_gesture').")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other relevant metadata (e.g., client version, device type, sensor info).")
    
    # Raw data field can be kept for unprocessed or highly variable data structures
    raw_data_blob: Optional[Dict[str, Any]] = Field(None, description="Flexible field for any other raw or unstructured data associated with the chunk.")

    class Config:
        # For Pydantic v1, use schema_extra for examples. For Pydantic v2, use model_config with json_schema_extra.
        # This is for Pydantic v1 style:
        # schema_extra = {
        #     "example": {
        #         "timestamp": "2024-06-15T10:30:00Z",
        #         "user_id": "user123",
        #         "session_id": "sessionABC",
        #         "audio_data_ref": "/path/to/audio/chunk_xyz.wav",
        #         "video_data_ref": "/path/to/video/chunk_xyz.mp4",
        #         "hand_landmarks": [{"hand": "right", "landmarks": [{"x":0.1, "y":0.2, "z":0.03}, ...]}],
        #         "gesture_classification_client": "swipe_left",
        #         "gesture_confidence_client": 0.85,
        #         "speech_transcription_client": "Hello Tria",
        #         "environment_context": {"lighting_condition": "office_daylight"},
        #         "user_feedback_rating": 5,
        #         "metadata": {"client_version": "1.2.0", "device_os": "Android 12"}
        #     }
        # }
        # For Pydantic v2, it would be:
        # model_config = {
        #     "json_schema_extra": {
        #         "examples": [
        #             {
        #                 "timestamp": "2024-06-15T10:30:00Z", ... 
        #             }
        #         ]
        #     }
        # }
        pass # Keep orm_mode if it's there for InteractionChunkDB, or add if base model needs it.

# Ensure InteractionChunkCreate and InteractionChunkDB are still sensible.
# InteractionChunkCreate usually inherits all fields from Base for creation.
class InteractionChunkCreate(InteractionChunkBase):
    pass

# InteractionChunkDB includes an 'id' and potentially other DB-specific fields or relationships.
class InteractionChunkDB(InteractionChunkBase):
    id: int = Field(..., description="Unique identifier for the interaction chunk in the database.")
    # Add any other fields that are specific to the database representation,
    # e.g., vector embeddings if stored directly, server-side classification results.
    gesture_classification_server: Optional[str] = Field(None, description="Gesture classification performed by server-side Tria bots.")
    gesture_confidence_server: Optional[float] = Field(None, description="Confidence score for server-side gesture classification.")
    speech_transcription_server: Optional[str] = Field(None, description="Server-side speech transcription, if performed or refined.")
    audio_embedding_ref: Optional[str] = Field(None, description="Reference to stored audio embedding vector.")
    video_embedding_ref: Optional[str] = Field(None, description="Reference to stored video embedding vector.")
    gesture_embedding_ref: Optional[str] = Field(None, description="Reference to stored gesture embedding vector.")


    class Config:
        orm_mode = True # For SQLAlchemy or similar ORM integration
        # For Pydantic v2, it would be: from_attributes = True
        # Add example for DB model if needed
        # model_config = { ... }
