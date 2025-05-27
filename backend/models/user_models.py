from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Base User properties shared by other models
class UserBase(BaseModel):
    # username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$") # Removed
    email: EmailStr 
    role: str = Field(default='user', pattern="^(admin|core_developer|beta_tester|user)$") 

# UserCreate is removed. User creation is handled by get_or_create_user_by_firebase_payload
# using data from Firebase token.

# Properties stored in DB.
# firebase_uid is now the primary identifier.
# hashed_password is removed.
class UserInDBBase(UserBase):
    firebase_uid: str # Changed from id: int
    # username field is removed via UserBase
    # hashed_password field is removed entirely
    is_active: bool = True
    email_verified: bool = False # This will be set from Firebase token
    last_login_at: Optional[datetime] = None
    user_settings: Optional[dict] = None # For JSONB
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Pydantic v2 style (alias for orm_mode = True)

# Additional properties to return to client (public representation of a user)
# Excludes sensitive data.
class UserPublic(UserBase):
    firebase_uid: str # Changed from id: int
    # username field is removed via UserBase
    email: EmailStr # Explicitly including email from UserBase for clarity
    email_verified: bool = False # Adding email_verified to public model
    is_active: bool
    role: str # Explicitly including role from UserBase
    last_login_at: Optional[datetime] = None # Making last_login_at public
    created_at: datetime
    # updated_at: Optional[datetime] = None # Decide if this should be public, often it is.
    
    class Config:
        from_attributes = True # Pydantic v2 style

# Full User model as stored in DB, inheriting all fields.
# Useful for internal representation after fetching from DB.
class UserInDB(UserInDBBase):
    pass

# Optional: If you need a model for updating user settings or other mutable fields by user
class UserUpdate(BaseModel):
    user_settings: Optional[dict] = None
    # Add other fields that a user can update themselves, e.g., display_name if you add it.
    # Email updates should be handled carefully, potentially requiring re-verification via Firebase.
    # Role updates would typically be an admin-only operation.
    is_active: Optional[bool] = None # Typically admin controlled
