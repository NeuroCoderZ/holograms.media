# backend/core/auth_service.py

import firebase_admin
from firebase_admin import credentials, auth
import asyncio # Imported but not used in the current synchronous implementation of verify_id_token.

# Custom exception for invalid tokens. This provides a specific error type
# for token verification failures, allowing callers to handle them distinctly.
class InvalidTokenError(Exception):
    """Custom exception for Firebase ID Token verification failures."""
    pass

class AuthService:
    """
    Service class for Firebase Authentication related operations, primarily focused on verifying
    Firebase ID Tokens issued to authenticated users. This service acts as a bridge
    between the client's Firebase authentication and the backend's secure operations.
    """
    def __init__(self):
        # Initialize Firebase Admin SDK. This is a critical step for any backend service
        # that interacts with Firebase (e.g., verifying tokens, accessing Firestore/Realtime Database).
        # The check `if not firebase_admin._apps:` prevents re-initialization if the function
        # instance is 'warm' (reused) in a Cloud Function environment, which is good practice.
        # In Google Cloud environments (like Cloud Functions), the SDK will automatically
        # pick up default credentials, avoiding the need for explicit service account keys.
        if not firebase_admin._apps:
            firebase_admin.initialize_app() # Initializes with default credentials from the environment.
            print("Firebase Admin SDK initialized in AuthService.")
        else:
            print("Firebase Admin SDK already initialized in AuthService.")

    def verify_firebase_token(self, id_token_string: str) -> dict:
        """
        Verifies a Firebase ID Token string against Firebase Authentication services.
        This function ensures that the provided token is valid, unexpired, and unrevoked.
        It's a crucial security step to protect backend resources.
        
        Args:
            id_token_string: The Firebase ID Token received from the client-side.
            
        Returns:
            A dictionary containing the decoded token payload. This payload includes
            user information like `uid` (Firebase User ID), `email`, `name`, etc.,
            which can then be used to identify or synchronize the user in the backend database.
            
        Raises:
            InvalidTokenError: Raised if the token is invalid (e.g., malformed, expired,
                               revoked, or has an incorrect signature). This custom exception
                               wraps specific Firebase Admin SDK errors for clarity.
            Exception: For any other unexpected errors that might occur during the verification
                       process, indicating a potential server-side issue or misconfiguration.
        """
        try:
            # `auth.verify_id_token` performs cryptographic validation and checks against
            # Firebase's token revocation lists. It contacts Firebase servers to do this.
            # Although it's a blocking call, for single-request Cloud Functions, it's typically
            # acceptable. For long-running asynchronous applications, it might be offloaded
            # to a thread pool (e.g., using `asyncio.to_thread`).
            decoded_token = auth.verify_id_token(id_token_string)
            return decoded_token
        except auth.InvalidIdTokenError as e:
            # Catches general invalid token errors (e.g., malformed, bad signature).
            print(f"Firebase Invalid ID Token Error: {e}")
            raise InvalidTokenError(f"Invalid Firebase ID Token: {e}")
        except auth.ExpiredIdTokenError as e:
            # Catches tokens that have passed their expiration time.
            print(f"Firebase Expired ID Token Error: {e}")
            raise InvalidTokenError(f"Expired Firebase ID Token: {e}")
        except auth.RevokedIdTokenError as e:
            # Catches tokens that have been explicitly revoked by Firebase (e.g., user changed password).
            print(f"Firebase Revoked ID Token Error: {e}")
            raise InvalidTokenError(f"Revoked Firebase ID Token: {e}")
        except Exception as e:
            # Catch-all for any other unexpected errors during the process.
            print(f"An unexpected error occurred during Firebase ID Token verification: {e}")
            raise Exception(f"Token verification failed due to an unexpected error: {e}")
