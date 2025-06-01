from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

# Model for creating a new user (for incoming data, e.g., from auth_sync Cloud Function)
class UserCreate(BaseModel):
    user_id_firebase: str = Field(..., description="Firebase UID as provided by Firebase Auth")
    email: EmailStr = Field(..., description="User's email address")
    # Optionally add other fields that might be passed during creation, e.g.:
    # display_name: Optional[str] = None
    # photo_url: Optional[str] = None

    class Config:
        # For Pydantic V2, use model_config
        # model_config = {"json_schema_extra": {"examples": [...]}}
        # For Pydantic V1, use schema_extra
        schema_extra = {
            "examples": [
                {
                    "user_id_firebase": "firebase_uid_abcde12345",
                    "email": "new.user@example.com"
                }
            ]
        }

# Model representing a user as stored in the database (including generated fields like ID and timestamps)
class UserModel(BaseUUIDModel):
    user_id_firebase: str = Field(..., description="Firebase UID") # This is the UID from Firebase Authentication
    email: EmailStr
    # Add other user-specific fields as needed, e.g.:
    # full_name: Optional[str] = None
    # is_active: bool = True
    # is_superuser: bool = False

    class Config:
        orm_mode = True
        # For Pydantic V2, use model_config for schema_extra
        # model_config = {
        #     "json_schema_extra": {
        #         "examples": [
        #             {
        #                 "user_id_firebase": "firebase_uid_123",
        #                 "email": "user@example.com",
        #                 "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        #                 "created_at": "2024-05-29T10:00:00Z",
        #                 "updated_at": "2024-05-29T10:00:00Z"
        #             }
        #         ]
        #     }
        # }
        # For Pydantic V1, use schema_extra
        schema_extra = {
            "examples": [
                {
                    "user_id_firebase": "firebase_uid_123",
                    "email": "user@example.com",
                    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                    "created_at": "2024-05-29T10:00:00Z",
                    "updated_at": "2024-05-29T10:00:00Z"
                }
            ]
        }
