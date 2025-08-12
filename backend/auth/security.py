import os
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.core.models.user_models import UserInDB # Keep this for type hinting

logger = logging.getLogger(__name__)

# This part of the code for initializing Firebase is better handled
# in the main app.py startup event to ensure it runs once.
# However, to keep it self-contained for now, we'll leave the logic
# but acknowledge it's not ideal.

firebase_bearer_scheme = HTTPBearer()

async def get_current_firebase_user(
    bearer_token: HTTPAuthorizationCredentials = Depends(firebase_bearer_scheme)
) -> Dict[str, Any]:
    """
    Verifies Firebase ID token and returns decoded token payload.
    This is the primary function for checking authentication.
    """
    if not bearer_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated (no bearer token)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    id_token = bearer_token.credentials
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except firebase_admin.auth.InvalidIdTokenError as e:
        logger.error(f"Invalid Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {e}",
            headers={'WWW-Authenticate': 'Bearer error="invalid_token"'},
        )
    except Exception as e:
        logger.error(f"Error verifying Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not process token: {e}",
        )

async def get_current_user(
    decoded_token: Dict[str, Any] = Depends(get_current_firebase_user)
) -> UserInDB:
    """
    Creates a UserInDB model instance directly from the decoded Firebase token.
    This function no longer depends on the database.
    """
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: UID missing.",
        )
    
    # Create a Pydantic model on-the-fly from the token data.
    # This satisfies dependencies that expect a UserInDB object
    # without needing a database lookup.
    return UserInDB(
        user_id_firebase=firebase_uid,
        email=email,
        is_active=True, # Assume user is active if token is valid
        # Add other fields with default values if your UserInDB model has them
    )

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """
    Ensures the current user (fetched via Firebase token) is active.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# The get_current_admin_user function can be added here if needed,
# assuming the UserInDB model has a 'role' field populated from the token's custom claims.
