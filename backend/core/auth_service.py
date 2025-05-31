# backend/core/auth_service.py

import firebase_admin
from firebase_admin import credentials, auth
import asyncio # To wrap blocking calls if necessary

# Custom exception for invalid tokens
class InvalidTokenError(Exception):
    """Custom exception for Firebase ID Token verification failures."""
    pass

class AuthService:
    """
    Service class for Firebase Authentication related operations, specifically JWT verification.
    """
    def __init__(self):
        # Firebase Admin SDK initialization should ideally happen once globally
        # in a Cloud Function environment. This check ensures it.
        if not firebase_admin._apps:
            # Default credentials will be used automatically in Google Cloud environments
            # For local testing, you might need to set GOOGLE_APPLICATION_CREDENTIALS
            firebase_admin.initialize_app()
            print("Firebase Admin SDK initialized in AuthService.")
        else:
            print("Firebase Admin SDK already initialized in AuthService.")

    def verify_firebase_token(self, id_token_string: str) -> dict:
        """
        Verifies a Firebase ID Token string.
        
        Args:
            id_token_string: The Firebase ID Token as a string.
            
        Returns:
            A dictionary containing the decoded token payload (e.g., uid, email).
            
        Raises:
            InvalidTokenError: If the token is invalid, expired, or revoked.
            Exception: For any other unexpected errors during verification.
        """
        try:
            # verify_id_token is a blocking call. In an async context, consider
            # running this in a thread pool (e.g., asyncio.to_thread) to avoid blocking
            # the event loop. For Cloud Functions, where each invocation is a new process/thread,
            # this is often less critical unless nested async operations are present.
            decoded_token = auth.verify_id_token(id_token_string)
            return decoded_token
        except auth.InvalidIdTokenError as e:
            print(f"Firebase Invalid ID Token Error: {e}")
            raise InvalidTokenError(f"Invalid Firebase ID Token: {e}")
        except auth.ExpiredIdTokenError as e:
            print(f"Firebase Expired ID Token Error: {e}")
            raise InvalidTokenError(f"Expired Firebase ID Token: {e}")
        except auth.RevokedIdTokenError as e:
            print(f"Firebase Revoked ID Token Error: {e}")
            raise InvalidTokenError(f"Revoked Firebase ID Token: {e}")
        except Exception as e:
            print(f"An unexpected error occurred during Firebase ID Token verification: {e}")
            raise Exception(f"Token verification failed due to an unexpected error: {e}")
