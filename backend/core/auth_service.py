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
        Uses google-auth library.
        """
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        if not token:
             raise InvalidTokenError("Google token is missing.")

        try:
            # Verify the ID token using Google's public keys.
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )

            # ID token is valid. Check the issuer.
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise InvalidTokenError('Wrong issuer.')

            return idinfo
        except ValueError as e:
            logger.error(f"Invalid Google token: {e}")
            raise InvalidTokenError(f"Invalid Google token: {e}")
        except Exception as e:
            logger.error(f"Error during Google token verification: {e}")
            raise InvalidTokenError(f"Verification failed: {e}")

# Instantiate the service for use in dependencies
auth_service = AuthService()