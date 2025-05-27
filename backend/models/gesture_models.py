from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Represents a single, atomic gestural event or state.
class GesturalPrimitive(BaseModel):
    primitive_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = Field(..., description="e.g., 'pinch_start', 'swipe_left', 'hold', 'point_at_object_X'")
    timestamp: float = Field(..., description="Timestamp of the primitive event relative to sequence start or absolute.")
    hand: Optional[str] = Field(None, description="'left', 'right', 'both'") # Make optional as some systems might not specify
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    spatial_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Detailed coordinates (e.g. x,y,z of fingertip), orientation, proximity, target object ID")
    # Example spatial_data: {"fingertip_position": {"x": 0.1, "y": 0.2, "z": 0.3}, "target_object_id": "element_abc"}

# Represents a sequence of gestural primitives that form a meaningful gesture.
# Aligns with the 'gesture_sequences' table.
class InterpretedGestureSequenceBase(BaseModel):
    duration_ms: Optional[float] = None # Total duration of the interpreted gesture sequence
    primitives: List[GesturalPrimitive] = Field(default_factory=list)
    semantic_hypotheses: List[Dict[str, Any]] = Field(default_factory=list, description="List of semantic hypotheses with confidence, e.g., [{'intent': 'create_cube', 'params': {'size': 0.5}, 'confidence': 0.8}]")
    context_snapshot: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Relevant state of the holographic environment at the time of gesture")
    # Additional fields from DRSB
    source_modality: Optional[str] = Field(default="hand_tracking", description="e.g., 'hand_tracking', 'full_body_tracking', 'eye_gaze'")
    raw_data_references: Optional[List[str]] = Field(default_factory=list, description="Links to original chunk IDs or time-series data if applicable")

class InterpretedGestureSequenceCreate(InterpretedGestureSequenceBase):
    chunk_id: int # Foreign key to audiovisual_gestural_chunks
    user_id: str  # Firebase UID, foreign key to users

class InterpretedGestureSequenceDB(InterpretedGestureSequenceBase):
    id: int # Primary key for gesture_sequences table
    chunk_id: int
    user_id: str # Firebase UID
    created_at: datetime

    class Config:
        orm_mode = True

# Represents a user's saved custom gesture definition.
# Aligns with the 'user_gestures' table.
class UserGestureDefinitionBase(BaseModel):
    gesture_name: str = Field(..., min_length=1, max_length=255)
    # gesture_definition could be a specific sequence of primitives, parameters for a dynamic gesture,
    # or a learned model reference.
    gesture_definition: Dict[str, Any] = Field(..., description="User-defined parameters or sequence for the gesture")
    gesture_data_ref: Optional[int] = Field(None, description="Optional link to an example audiovisual_gestural_chunks.id")

class UserGestureDefinitionCreate(UserGestureDefinitionBase):
    pass # user_id will be provided at the service layer

class UserGestureDefinitionDB(UserGestureDefinitionBase):
    id: int
    user_id: str # Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Model for API requests that might involve gesture data
class GestureRecognitionRequest(BaseModel):
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    hand_landmarks: Optional[Dict[str, Any]] = None # e.g., MediaPipe output
    video_frame_reference: Optional[str] = None # Link to a video frame if applicable
    environment_context: Optional[Dict[str, Any]] = None

class GestureRecognitionResponse(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interpreted_sequence: Optional[InterpretedGestureSequenceDB] = None
    raw_gestures_processed: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None
```
