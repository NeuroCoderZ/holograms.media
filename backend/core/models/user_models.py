from pydantic import EmailStr
from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

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
