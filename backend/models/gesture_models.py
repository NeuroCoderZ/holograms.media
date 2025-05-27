from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List # Ensure List is imported
from datetime import datetime

class GestureBase(BaseModel):
    gesture_name: str = Field(..., min_length=1, max_length=100)
    gesture_definition: Dict[str, Any] # Raw landmarks, sequence, or parameters

class GestureCreate(GestureBase):
    gesture_data_ref: Optional[int] = None # Optional link to an audiovisual_gestural_chunks id

class UserGesture(GestureBase):
    id: int
    user_id: int
    gesture_data_ref: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# New models for Gestural Interpretation as per Visionary Architecture Doc Section 2.3

class GesturalPrimitive(BaseModel):
    type: str = Field(..., description="e.g., 'pinch_start', 'swipe_left', 'hold', 'point_at_object_X'")
    timestamp: float # Timestamp of the primitive event
    hand: str = Field(..., description="'left', 'right', 'both'")
    confidence: float
    spatial_data: Dict[str, Any] = Field(..., description="Detailed coordinates, orientation, proximity to virtual objects, target object ID")

class InterpretedGestureSequence(BaseModel):
    sequence_id: str = Field(..., description="Unique ID for this interpreted sequence")
    primitives: List[GesturalPrimitive]
    duration_ms: float
    raw_data_references: List[str] = Field(..., description="Links to original chunk IDs or time-series data")
    semantic_hypotheses: List[Dict[str, Any]] = Field(..., description="List of semantic hypotheses with confidence")
    # e.g., [{"intent": "create_cube", "parameters": {"size": 0.5, "color": "blue"}, "confidence": 0.8},
    #         {"intent": "select_object", "parameters": {"object_id": "some_id"}, "confidence": 0.7}]
    context_snapshot: Optional[Dict[str, Any]] = Field(None, description="Relevant state of the holographic environment at the time of gesture")
    
    class Config:
        orm_mode = True
