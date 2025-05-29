from pydantic import Field, BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

class GesturePrimitiveModel(BaseModel): # Corresponds to GesturalPrimitive in DRSB
    primitive_id: str # e.g., "hand_open", "finger_point_right"
    confidence: Optional[float] = Field(default=None)
    # Add other relevant fields like start/end time if part of a sequence

class InterpretedGestureModel(BaseModel): # Corresponds to InterpretedGestureSequence in DRSB
    semantic_meaning: str # e.g., "select_object", "navigate_forward"
    confidence: float
    target_object_id: Optional[UUID] = Field(default=None, description="ID of the object this gesture targets, if any.")
    parameters_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parameters associated with the gesture command, e.g., {'speed': 'fast'}.")

class GestureModel(BaseUUIDModel): # Inherits id, created_at, updated_at
    user_id: UUID = Field(..., description="ID of the user who performed or owns this gesture.")
    gesture_name: Optional[str] = Field(default=None, description="User-defined name for this gesture, if saved.")
    
    # Raw or recognized gesture data
    # Based on GestureChunk from Protobuf in DRSB and common needs
    recognized_gesture_type: Optional[str] = Field(default=None, description="High-level recognized gesture type (e.g., 'swipe_left', 'pinch_zoom').")
    # Could be a list of recognized primitives if a gesture is composed of multiple parts
    gesture_primitives_json: Optional[List[GesturePrimitiveModel]] = Field(default=None, description="Sequence of recognized gesture primitives.")
    
    # For more detailed raw data if stored directly, or a reference to it
    landmark_data_3d_json: Optional[List[Dict[str, float]]] = Field(default=None, description="List of 3D landmark data points (e.g., [{'x':0.1, 'y':0.2, 'z':0.3}, ...]). Each dict could represent a landmark.")
    # Alternatively, landmark_data_ref: Optional[str] = Field(default=None, description="Reference to detailed landmark data if stored elsewhere, e.g., in a time-series DB or a file.")

    source_modality: Optional[str] = Field(default=None, description="Source of the gesture data (e.g., 'MediaPipe_Web', 'WebXR_HandTracking', 'LeapMotion').")
    
    # Interpretation by Tria
    tria_interpretation: Optional[InterpretedGestureModel] = Field(default=None, description="Tria's interpretation of the gesture's meaning and intent.")
    
    # Context
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
