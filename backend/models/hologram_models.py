from pydantic import BaseModel, Field
from typing import Dict, Any # Ensure Dict, Any are imported
from datetime import datetime

class HologramBase(BaseModel):
    hologram_name: str = Field(..., min_length=1, max_length=100)
    hologram_state_data: Dict[str, Any] # Full state for reconstruction

class HologramCreate(HologramBase):
    pass

class UserHologram(HologramBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
