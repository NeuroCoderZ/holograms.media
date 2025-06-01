# backend/cloud_functions/auth_sync/main.py

from firebase_functions import https_fn
from firebase_admin import initialize_app, credentials
import json
import asyncpg # For type hints and potential error handling
import os # For environment variables, e.g., DATABASE_URL
import logging # Import the logging module

# Configure basic logging for Cloud Functions
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    logger.info("Firebase Admin SDK initialized in auth_sync Cloud Function.")
else:
    logger.info("Firebase Admin SDK already initialized.")

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
    logger.info("auth_sync_user function started.")

    try:
        # 1. Check if the request method is POST
        if req.method != "POST":
            logger.warning(f"Method Not Allowed: {req.method}")
            return https_fn.Response(json.dumps({"status": "error", "message": "Method Not Allowed. Please use POST."}), status=405, mimetype="application/json")

        # 2. Extract Firebase ID Token from Authorization header
        auth_header = req.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Missing or malformed Authorization header.")
            return https_fn.Response(json.dumps({"status": "error", "message": "Authorization header missing or malformed. Expected 'Bearer <token>'."}), status=401, mimetype="application/json")

        id_token = auth_header.split(" ")[1]
        if not id_token:
            logger.warning("ID Token is empty after parsing.")
            return https_fn.Response(json.dumps({"status": "error", "message": "ID Token is empty."}), status=401, mimetype="application/json")

        logger.info("ID Token extracted. Attempting verification.")

        # 3. Initialize AuthService and verify the token
        auth_service = AuthService()
        decoded_token = None
        try:
            decoded_token = auth_service.verify_firebase_token(id_token)
            logger.info(f"Token successfully verified for UID: {decoded_token.get("uid")}")
        except InvalidTokenError as e:
            logger.error(f"Token verification failed (InvalidTokenError): {e}")
            return https_fn.Response(json.dumps({"status": "error", "message": f"Invalid or expired token: {e}"}), status=401, mimetype="application/json")
        except Exception as e:
            logger.exception("Unexpected error during token verification.") # Logs traceback
            return https_fn.Response(json.dumps({"status": "error", "message": f"Server error during token verification: {e}"}), status=500, mimetype="application/json")

        # 4. Extract uid and email
        firebase_uid = decoded_token.get("uid")
        email = decoded_token.get("email")

        if not firebase_uid:
            logger.warning("Firebase UID not found in decoded token.")
            return https_fn.Response(json.dumps({"status": "error", "message": "Firebase UID not found in token."}), status=400, mimetype="application/json")
        
        logger.info(f"Attempting to synchronize user {firebase_uid} with database.")

        # 5. Connect to PostgreSQL and synchronize user
        try:
            async with get_db_connection() as db_conn:
                existing_user = await get_user_by_firebase_uid(db_conn, firebase_uid=firebase_uid)

                if not existing_user:
                    # User does not exist, create new
                    logger.info(f"User with Firebase UID {firebase_uid} not found. Creating new user.")
                    user_to_create = UserCreate(
                        user_id_firebase=firebase_uid,
                        email=email,
                    )
                    new_user = await create_user(db_conn, user_create=user_to_create)
                    logger.info(f"New user created successfully with Firebase UID: {new_user.user_id_firebase}")
                    return https_fn.Response(json.dumps({"status": "success", "message": "User created", "user_id": new_user.user_id_firebase}), status=201, mimetype="application/json")
                else:
                    # User exists, confirm synchronization
                    logger.info(f"User with Firebase UID {firebase_uid} already exists and is synced.")
                    return https_fn.Response(json.dumps({"status": "success", "message": "User already exists and is synced", "user_id": existing_user.user_id_firebase}), status=200, mimetype="application/json")

        except asyncpg.PostgresError as e:
            logger.exception(f"Database error during user synchronization for UID {firebase_uid}.")
            return https_fn.Response(json.dumps({"status": "error", "message": f"Database error: {e}"}), status=500, mimetype="application/json")
        except Exception as e:
            logger.exception(f"An unexpected error occurred during DB operation for UID {firebase_uid}.")
            return https_fn.Response(json.dumps({"status": "error", "message": f"An unexpected server error occurred: {e}"}), status=500, mimetype="application/json")

    except Exception as e:
        logger.exception("An unhandled error occurred in auth_sync_user function.")
        return https_fn.Response(json.dumps({"status": "error", "message": f"An unhandled server error occurred: {e}"}), status=500, mimetype="application/json")
