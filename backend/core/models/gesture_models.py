from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid # For uuid.uuid4()

# Content from backend/models/gesture_models.py (priority content)

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

class GestureUpdate(UserGestureDefinitionBase):
    """
    Model for updating an existing user gesture. All fields are optional.
    Used for PUT/PATCH operations where only provided fields should be updated.
    """
    gesture_name: Optional[str] = Field(None, min_length=1, max_length=100) # Re-declare to make Optional
    gesture_definition: Optional[Dict[str, Any]] = Field(None) # Re-declare to make Optional
    gesture_data_ref: Optional[int] = Field(None) # Re-declare to make Optional

    # The __init__ from the router that filtered None values is not strictly necessary
    # if Pydantic's exclude_unset=True or exclude_none=True is used correctly when calling .dict().
    # UserGestureDefinitionBase already has these fields, but here we explicitly make them Optional
    # for the purpose of an update model.

# --- Appended content from original backend/core/models/gesture_models.py ---

# Need to import BaseUUIDModel and UUID from uuid for this section.
from uuid import UUID # Specific import for type hint
from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

# Note: The original GesturePrimitiveModel might conflict in name with GesturalPrimitive above.
# Renaming the appended one to CoreGesturePrimitiveModel to avoid direct name clash for now.
class CoreGesturePrimitiveModel(BaseModel): # Corresponds to GesturalPrimitive in DRSB
    primitive_id: str # e.g., "hand_open", "finger_point_right"
    confidence: Optional[float] = Field(default=None)
    # Add other relevant fields like start/end time if part of a sequence

# Renaming InterpretedGestureModel to CoreInterpretedGestureModel
class CoreInterpretedGestureModel(BaseModel): # Corresponds to InterpretedGestureSequence in DRSB
    semantic_meaning: str # e.g., "select_object", "navigate_forward"
    confidence: float
    target_object_id: Optional[UUID] = Field(default=None, description="ID of the object this gesture targets, if any.")
    parameters_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parameters associated with the gesture command, e.g., {'speed': 'fast'}.")

# Renaming GestureModel to CoreGestureModel
class CoreGestureModel(BaseUUIDModel): # Inherits id, created_at, updated_at
    user_id: UUID = Field(..., description="ID of the user who performed or owns this gesture.")
    gesture_name: Optional[str] = Field(default=None, description="User-defined name for this gesture, if saved.")
    
    recognized_gesture_type: Optional[str] = Field(default=None, description="High-level recognized gesture type (e.g., 'swipe_left', 'pinch_zoom').")
    gesture_primitives_json: Optional[List[CoreGesturePrimitiveModel]] = Field(default=None, description="Sequence of recognized gesture primitives.") # Updated type hint
    
    landmark_data_3d_json: Optional[List[Dict[str, float]]] = Field(default=None, description="List of 3D landmark data points (e.g., [{'x':0.1, 'y':0.2, 'z':0.3}, ...]). Each dict could represent a landmark.")

    source_modality: Optional[str] = Field(default=None, description="Source of the gesture data (e.g., 'MediaPipe_Web', 'WebXR_HandTracking', 'LeapMotion').")
    
    tria_interpretation: Optional[CoreInterpretedGestureModel] = Field(default=None, description="Tria's interpretation of the gesture's meaning and intent.") # Updated type hint
    
    context_hologram_id: Optional[UUID] = Field(default=None, description="ID of the hologram active or targeted when this gesture was made.")
    custom_metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other custom metadata.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a77",
                    "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                    "gesture_name": "My Favorite Swipe",
                    "recognized_gesture_type": "swipe_left",
                    "source_modality": "MediaPipe_Web",
                    "tria_interpretation": {
                        "semantic_meaning": "navigate_previous_item",
                        "confidence": 0.85
                    },
                    "created_at": "2024-05-29T15:00:00Z",
                    "updated_at": "2024-05-29T15:00:00Z"
                }
            ]
        }
