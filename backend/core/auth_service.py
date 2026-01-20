# backend/core/auth_service.py
import logging
from jose import jwt, JWTError
from datetime import datetime, timedelta
from backend.core.config import settings

logger = logging.getLogger(__name__)

class InvalidTokenError(Exception):
    """Custom exception for JWT verification failures."""
    pass

class AuthService:
    """
    Service class for handling JWT-based authentication.
    This service is responsible for creating, encoding, decoding, and verifying JWTs
    for user sessions after they have been authenticated by an external provider (e.g., Google).
    """
    
    SECRET_KEY = settings.SECRET_KEY
    ALGORITHM = settings.JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

    def create_access_token(self, data: dict) -> str:
        """
        Generates a new JWT access token.
        
        Args:
            data: A dictionary of claims to include in the token payload. 
                  Must contain 'user_id'.
        
        Returns:
            A string containing the encoded JWT.
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt

    def verify_and_decode_token(self, token: str) -> dict:
        """
        Decodes and verifies a JWT access token.
        
        Args:
            token: The JWT string to decode.
            
        Returns:
            A dictionary containing the decoded token payload (claims).
            
        Raises:
            InvalidTokenError: If the token is invalid, expired, or has a bad signature.
        """
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            return payload
        except JWTError as e:
            logger.error(f"JWT Error during token decoding: {e}")
            raise InvalidTokenError(f"Could not validate credentials: {e}")

    async def verify_google_id_token(self, token: str) -> dict:
        """
        Verifies an ID token issued by Google OAuth 2.0.
        
        This is a placeholder for the actual implementation that would use a library
        like `google-auth` to verify the token against Google's public keys.
        
        Args:
            token: The Google ID token string.
            
        Returns:
            A dictionary with the user's information from the token payload.
            
        Raises:
            InvalidTokenError: If the token is invalid.
        """
        # TODO: Implement actual Google ID token verification.
        # This would involve:
        # 1. Importing the necessary library (e.g., from google.oauth2 import id_token).
        # 2. Calling id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID).
        # 3. Handling exceptions and extracting user info (sub, email, name, etc.).
        
        logger.warning("Google ID Token verification is currently a placeholder and not secure.")
        
        # --- Placeholder Logic ---
        # This is insecure and for development purposes only.
        # It simulates a successful verification.
        if not token or "test-token" not in token:
             raise InvalidTokenError("Invalid or missing test token.")
        
        # Simulate a decoded payload from a real Google token
        user_info = {
            "sub": "google-user-id-12345", # Google's unique user ID
            "email": "test.user@example.com",
            "name": "Test User",
            "given_name": "Test",
            "family_name": "User",
            "picture": "https://example.com/avatar.jpg",
            "email_verified": True,
            "locale": "en"
        }
        # --- End Placeholder Logic ---
        
        return user_info

# Instantiate the service for use in dependencies
auth_service = AuthService()