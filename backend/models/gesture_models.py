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
