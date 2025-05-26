from pydantic import BaseModel, Field
from typing import Optional, Dict, Any # Ensure Dict, Any are imported
from datetime import datetime

class PromptVersionBase(BaseModel):
    prompt_title: str = Field(..., min_length=1, max_length=255)
    prompt_text: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None

class PromptVersionCreate(PromptVersionBase):
    # version_number is typically handled by DB logic (sequence or trigger) or app logic,
    # but if client can suggest one or it's part of a manual versioning, include it.
    # For now, let's assume it will be determined by the backend during creation based on existing versions.
    # If version_number needs to be explicit from client:
    # version_number: int = Field(..., gt=0) 
    associated_hologram_id: Optional[int] = None


class UserPromptVersion(PromptVersionBase):
    id: int
    user_id: int
    version_number: int
    created_at: datetime
    associated_hologram_id: Optional[int] = None
    
    class Config:
        orm_mode = True
