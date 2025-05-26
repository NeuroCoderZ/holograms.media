from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Base User properties shared by other models
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr 
    # Ensure role is consistent with schema.sql CHECK constraint
    role: str = Field(default='user', pattern="^(admin|core_developer|beta_tester|user)$") 

# Properties to receive via API on user creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

# Properties stored in DB, includes hashed_password
# This model should NOT be returned by API endpoints directly if it contains sensitive data.
class UserInDBBase(UserBase):
    id: int
    hashed_password: str
    is_active: bool = True
    email_verified: bool = False
    last_login_at: Optional[datetime] = None
    user_settings: Optional[dict] = None # For JSONB
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True # For Pydantic v1 style. For v2, from_attributes = True

# Additional properties to return to client (public representation of a user)
# Excludes sensitive data like hashed_password.
class UserPublic(UserBase):
    id: int
    is_active: bool
    # email_verified: bool # Decide if this should be public
    # last_login_at: Optional[datetime] # Decide if this should be public
    created_at: datetime
    # updated_at: datetime # Decide if this should be public
    
    class Config:
        orm_mode = True # For Pydantic v1 style. For v2, from_attributes = True

# Full User model as stored in DB, inheriting all fields.
# Useful for internal representation after fetching from DB.
class UserInDB(UserInDBBase):
    pass
