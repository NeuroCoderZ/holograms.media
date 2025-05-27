from fastapi import APIRouter, Depends, HTTPException, status
# OAuth2PasswordRequestForm and timedelta are no longer needed for token generation
# from fastapi.security import OAuth2PasswordRequestForm
# from datetime import timedelta
# asyncpg is still needed if crud_operations uses it, but not directly here for auth logic
# import asyncpg

# crud_operations is used by get_current_user, which is used by get_current_active_user
# from backend.db import crud_operations

# user_models is needed for response_model and type hinting
# auth_models (like Token) is no longer needed here
from backend.models import user_models
from backend.auth import security # This now contains Firebase logic
# get_db_connection is used by get_current_user, which is a dependency of get_current_active_user
# from backend.db.pg_connector import get_db_connection


router = APIRouter(
    prefix="/auth", # Standard prefix for auth routes
    tags=["Authentication"], # Tag for API docs
)

# The /auth/register endpoint is removed.
# User registration is handled via Firebase client SDK.
# User creation in local DB happens on first verified login via get_current_user.

# The /auth/token endpoint is removed.
# Firebase client SDK handles token acquisition and refresh.

@router.get("/users/me", response_model=user_models.UserPublic)
async def read_users_me(
    # security.get_current_active_user now uses Firebase authentication
    current_user: user_models.UserInDB = Depends(security.get_current_active_user) 
):
    """
    Fetches the current logged-in user's public information.
    Authentication is handled via Firebase ID token in the Authorization header.
    """
    # Assuming UserInDB now has firebase_uid and email, and UserPublic is adapted.
    # The debug log should reflect the new primary identifier, e.g., firebase_uid.
    print(f"[AUTH USERS/ME INFO] Fetching 'me' for user with Firebase UID: {getattr(current_user, 'firebase_uid', 'N/A')}")
    
    # Convert UserInDB to UserPublic for the response.
    # UserPublic should be adapted to not expect 'username' if it's removed,
    # and potentially include 'firebase_uid' or other relevant fields.
    try:
        # Pydantic v2:
        # return user_models.UserPublic.model_validate(current_user)
        # Pydantic v1:
        return user_models.UserPublic.from_orm(current_user)
    except Exception as e:
        # This might happen if UserPublic is not compatible with the fields in UserInDB
        # (e.g., missing 'username' in UserInDB but UserPublic still expects it).
        print(f"[AUTH USERS/ME ERROR] Error converting UserInDB to UserPublic: {e}")
        # Ensure UserPublic model is updated according to UserInDB changes.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing user data."
        )
