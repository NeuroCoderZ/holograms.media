# backend/cloud_functions/auth_sync/main.py

from firebase_functions import https_fn
from firebase_admin import initialize_app, credentials
import json
import asyncpg # For type hints and potential error handling
import os # For environment variables, e.g., DATABASE_URL

# Import services and models (will be fully implemented in Task 3 or already exist in main)
from backend.core.auth_service import AuthService, InvalidTokenError
from backend.core.crud_operations import create_user, get_user_by_firebase_uid
from backend.core.db.pg_connector import get_db_connection
from backend.core.models.user_models import UserModel, UserCreate # Assuming UserCreate is available for new users

# Initialize Firebase Admin SDK (if not already initialized globally)
# This check prevents re-initialization in warm instances of the Cloud Function
if not initialize_app._apps:
    # Use default credentials for Cloud Functions environment
    initialize_app()
    print("Firebase Admin SDK initialized in auth_sync Cloud Function.")
else:
    print("Firebase Admin SDK already initialized.")

@https_fn.on_request()
def auth_sync_user(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP-triggered Cloud Function to synchronize Firebase Auth user with PostgreSQL DB.
    Expects a Firebase ID Token in the Authorization: Bearer header.
    - Verifies the JWT.
    - Extracts user UID and email.
    - Checks if user exists in PostgreSQL.
    - Creates new user or confirms existing user.
    """
    print("Received auth_sync_user request.")

    # 1. Check if the request method is POST
    if req.method != "POST":
        print(f"Method Not Allowed: {req.method}")
        return https_fn.Response(json.dumps({"status": "error", "message": "Method Not Allowed. Please use POST."}), status=405, mimetype="application/json")

    # 2. Extract Firebase ID Token from Authorization header
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print("Missing or malformed Authorization header.")
        return https_fn.Response(json.dumps({"status": "error", "message": "Authorization header missing or malformed. Expected 'Bearer <token>'."}), status=401, mimetype="application/json")

    id_token = auth_header.split(" ")[1]
    if not id_token:
        print("ID Token is empty after parsing.")
        return https_fn.Response(json.dumps({"status": "error", "message": "ID Token is empty."}), status=401, mimetype="application/json")

    # 3. Initialize AuthService and verify the token
    auth_service = AuthService() # Instantiate AuthService
    decoded_token = None
    try:
        decoded_token = auth_service.verify_firebase_token(id_token)
        print(f"Token verified for UID: {decoded_token.get("uid")}")
    except InvalidTokenError as e:
        print(f"Token verification failed: {e}")
        return https_fn.Response(json.dumps({"status": "error", "message": f"Invalid or expired token: {e}"}), status=401, mimetype="application/json")
    except Exception as e:
        print(f"Unexpected error during token verification: {e}")
        return https_fn.Response(json.dumps({"status": "error", "message": f"Server error during token verification: {e}"}), status=500, mimetype="application/json")

    # 4. Extract uid and email
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email") # Email might not always be present or verified, handle accordingly

    if not firebase_uid:
        print("Firebase UID not found in decoded token.")
        return https_fn.Response(json.dumps({"status": "error", "message": "Firebase UID not found in token."}), status=400, mimetype="application/json")

    # 5. Connect to PostgreSQL and synchronize user
    try:
        async with get_db_connection() as db_conn:
            existing_user = await get_user_by_firebase_uid(db_conn, firebase_uid=firebase_uid)

            if not existing_user:
                # User does not exist, create new
                print(f"User with Firebase UID {firebase_uid} not found. Creating new user.")
                user_to_create = UserCreate(
                    user_id_firebase=firebase_uid,
                    email=email,
                    # Add other fields as necessary from decoded_token or default values
                    # e.g., display_name=decoded_token.get("name"),
                    # avatar_url=decoded_token.get("picture"),
                )
                new_user = await create_user(db_conn, user_create=user_to_create)
                print(f"New user created with Firebase UID: {new_user.user_id_firebase}")
                return https_fn.Response(json.dumps({"status": "success", "message": "User created", "user_id": new_user.user_id_firebase}), status=201, mimetype="application/json")
            else:
                # User exists, confirm synchronization
                print(f"User with Firebase UID {firebase_uid} already exists and is synced.")
                # MVP: No update needed, just confirm existence
                return https_fn.Response(json.dumps({"status": "success", "message": "User already exists and is synced", "user_id": existing_user.user_id_firebase}), status=200, mimetype="application/json")

    except asyncpg.PostgresError as e:
        print(f"Database error during user synchronization: {e}")
        return https_fn.Response(json.dumps({"status": "error", "message": f"Database error: {e}"}), status=500, mimetype="application/json")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return https_fn.Response(json.dumps({"status": "error", "message": f"An unexpected server error occurred: {e}"}), status=500, mimetype="application/json")
