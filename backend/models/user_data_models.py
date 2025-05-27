from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# --- User Model (aligns with 'users' table) ---
# This is the core user identity.
# For auth-specific parts like password hashing or token data, see auth_models.py
class UserBase(BaseModel):
    email: Optional[str] = Field(None, max_length=255)
    role: str = Field(default='user', max_length=50)
    is_active: bool = True
    email_verified: bool = Field(default=False)
    user_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UserCreate(UserBase): # Used when system might create a user (e.g. admin panel)
    firebase_uid: str # Must be provided if creating outside Firebase Auth flow
    email: str # Email is required for creation via this route

class UserUpdate(BaseModel): # Fields that can be updated by user or admin
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    user_settings: Optional[Dict[str, Any]] = None

class UserDB(UserBase):
    firebase_uid: str # Primary Key
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UserPublic(BaseModel): # Data safe to return in public API responses
    firebase_uid: str
    email: Optional[str] = None # Email might be sensitive depending on context
    role: str
    is_active: bool # Useful for UI to know if user can interact
    # Do not include user_settings unless specifically needed and filtered
    created_at: datetime # Useful for context
    last_login_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# --- User Profile (Extended User Information) ---
# If user_settings in users table is not enough, a separate UserProfile can be defined.
# For now, user_settings JSONB in users table is assumed to hold profile-like data.
# Example:
# class UserProfile(BaseModel):
#     user_id: str # Firebase UID (Foreign Key)
#     display_name: Optional[str] = None
#     bio: Optional[str] = None
#     avatar_url: Optional[str] = None # Link to media_files or external URL
#     # Add other profile fields

# --- User Saved Gesture Definition (aligns with 'user_gestures' table) ---
# This was previously in gesture_models.py as UserGestureDefinitionDB. Consolidating here.
class UserGestureDefinitionBase(BaseModel):
    gesture_name: str = Field(..., min_length=1, max_length=255)
    gesture_definition: Dict[str, Any] = Field(..., description="User-defined parameters or sequence for the gesture")
    gesture_data_ref: Optional[int] = Field(None, description="Optional link to an example audiovisual_gestural_chunks.id")

class UserGestureDefinitionCreate(UserGestureDefinitionBase):
    # user_id (Firebase UID) will be added at the service layer
    pass

class UserGestureDefinitionDB(UserGestureDefinitionBase):
    id: int
    user_id: str # Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# --- User Saved Hologram State (aligns with 'user_holograms' table) ---
# This was previously in hologram_models.py as UserHologramDB. Consolidating here.
class UserHologramStateBase(BaseModel):
    hologram_name: str = Field(..., min_length=1, max_length=255)
    hologram_state_data: Dict[str, Any] = Field(..., description="JSON representing the state or definition of the hologram")

class UserHologramStateCreate(UserHologramStateBase):
    # user_id (Firebase UID) will be added at the service layer
    pass

class UserHologramStateDB(UserHologramStateBase):
    id: int
    user_id: str # Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# --- User Prompt Versions (aligns with 'user_prompt_versions' table) ---
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
        orm_mode = True
```
