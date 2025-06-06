import os
from typing import Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Model and DB imports
from backend.core.models.user_models import UserInDB  # Ensure UserInDB reflects new schema (e.g., has firebase_uid)
from backend.core import crud_operations
import asyncpg  # For type hinting
from backend.db.pg_connector import get_db_connection

# Initialize Firebase Admin SDK
# It's recommended to do this once at application startup.
# For example, in `backend/app.py` using the lifespan manager.
# If GOOGLE_APPLICATION_CREDENTIALS is set, ApplicationDefault will use it.
# Otherwise, you might need to specify the path to your service account key JSON file.
try:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        # Fallback or error if GOOGLE_APPLICATION_CREDENTIALS is not set
        # For local development, you might point to a specific file:
        # cred = credentials.Certificate("path/to/your/serviceAccountKey.json")
        # If no credentials found, Firebase Admin SDK will fail to initialize.
        # This will likely cause an error at startup, which is desirable
        # as it indicates a configuration problem.
        # For now, let's assume it might try to use Application Default Credentials
        # if available in the environment (e.g. running on GCP).
        print("Attempting to initialize Firebase Admin SDK with Application Default Credentials...")
        cred = credentials.ApplicationDefault()

    if not firebase_admin._apps: # Check if the default app is already initialized
        firebase_admin.initialize_app(cred)
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # Depending on policy, you might want to raise an error here or allow app to start
    # but auth endpoints will fail. For now, we print and continue.
    # raise RuntimeError(f"Could not initialize Firebase Admin SDK: {e}")


# HTTPBearer scheme for Firebase ID tokens
firebase_bearer_scheme = HTTPBearer()

async def get_current_firebase_user(
    bearer_token: HTTPAuthorizationCredentials = Depends(firebase_bearer_scheme)
) -> Dict[str, Any]:
    """
    Verifies Firebase ID token and returns decoded token payload.
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
        print(f"[AUTH DEBUG] Invalid Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {e}",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )
    except Exception as e: # Catch other Firebase Admin SDK errors
        print(f"[AUTH DEBUG] Error verifying Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not process token: {e}",
        )

async def get_current_user(
    decoded_token: Dict[str, Any] = Depends(get_current_firebase_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
) -> UserInDB:
    """
    Retrieves user from DB based on Firebase UID from decoded token.
    If user doesn't exist, it creates them.
    """
    if not db_conn:
        print("[AUTH ERROR] DB connection not provided by dependency for get_current_user.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable."
        )

    firebase_uid = decoded_token.get("uid")
    if not firebase_uid:
        print("[AUTH DEBUG] Firebase UID (uid) not found in decoded token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: UID missing.",
        )

    try:
        # This new function will try to get the user by firebase_uid.
        # If not found, it will create the user using details from decoded_token.
        # This assumes `get_or_create_user_by_firebase_payload` will be implemented in crud_operations.
        # For now, we'll call a placeholder that reflects this logic.
        # The actual UserInDB model should contain firebase_uid.
        
        user = await crud_operations.get_or_create_user_by_firebase_payload(
            conn=db_conn, 
            firebase_payload=decoded_token
        )
        
        if user is None:
            # This case should ideally be handled by get_or_create_user_by_firebase_payload
            # either by creating the user or raising a specific error if creation fails.
            print(f"[AUTH DEBUG] User with Firebase UID '{firebase_uid}' not found and could not be created.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, # Or 500 if creation failed unexpectedly
                detail="User not found and could not be provisioned."
            )
            
        # Update last login time for the user
        # This assumes update_user_last_login will be modified to accept firebase_uid
        await crud_operations.update_user_last_login(conn=db_conn, firebase_uid=firebase_uid)

    except asyncpg.PostgresError as pg_err:
        print(f"[AUTH DB ERROR] PostgreSQL error during user retrieval/creation for UID '{firebase_uid}': {pg_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A database error occurred."
        )
    except Exception as e_crud:
        print(f"[AUTH DB ERROR] Unexpected error during user retrieval/creation for UID '{firebase_uid}': {e_crud}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred processing user data."
        )
            
    return user # UserInDB object

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """
    Ensures the current user (fetched via Firebase token and DB lookup) is active.
    """
    # The UserInDB model should have an `is_active` field.
    # This check assumes `is_active` is part of UserInDB and managed appropriately.
    if not getattr(current_user, 'is_active', True): # Default to True if is_active is not on model yet
        print(f"[AUTH DEBUG] User with Firebase UID '{current_user.firebase_uid}' is inactive.") # Assumes firebase_uid field
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    print(f"[AUTH DEBUG] User with Firebase UID '{getattr(current_user, 'firebase_uid', 'N/A')}' is active.")
    return current_user
