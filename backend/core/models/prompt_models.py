from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any # Added List just in case, though not used by these specific models from user_data
from datetime import datetime
# import uuid # Not used by these specific models from user_data_models.py

# Content from backend/core/models/user_data_models.py (UserPromptVersion... models)

class UserPromptVersionBase(BaseModel):
    prompt_title: str = Field(..., max_length=255, description="Title given by the user to a set of prompt versions")
    prompt_text: str = Field(..., description="The actual text of this version of the prompt")
    associated_hologram_id: Optional[int] = Field(None, description="Optional link to a user_holograms.id")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any other metadata")

class UserPromptVersionCreate(UserPromptVersionBase):
    # user_id (Firebase UID) and version_number will be handled at the service layer
    pass

class UserPromptVersionDB(UserPromptVersionBase):
    id: int
    user_id: str # Firebase UID
    version_number: int
    created_at: datetime

    class Config:
        from_attributes = True

# Original content of backend/core/models/prompt_models.py is now replaced.
# The models PromptVersionBase, PromptVersionCreate, UserPromptVersion (with user_id: int)
# are superseded by the more accurate UserPromptVersion... models above.
