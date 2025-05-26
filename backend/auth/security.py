import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status # Added
from fastapi.security import OAuth2PasswordBearer

# Model and DB imports
from backend.models.auth_models import TokenData
from backend.models.user_models import UserInDB
from backend.db import crud_operations
import asyncpg # For type hinting
from backend.db.pg_connector import get_db_connection # New dependency injector
# from contextlib import asynccontextmanager # Removed


# Environment variables for JWT
# It's crucial that SECRET_KEY is strong and kept secret in a real deployment.
# The default fallback here is only for preventing crashes if .env is missing, not for security.
SECRET_KEY = os.getenv("SECRET_KEY", "please_replace_me_with_a_strong_random_key_in_env")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Scheme
# tokenUrl points to the API endpoint that clients will use to get a token.
# This should match the path of your token-issuing endpoint (e.g., /auth/token).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Log the exception details here in a real application
        # For example: logger.error(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    return pwd_context.hash(password)

async def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.
    The 'sub' (subject) of the token is typically the username or user ID.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Ensure all data in 'to_encode' is suitable for JWT (e.g., strings, numbers).
    # If complex objects are used (like Pydantic models for 'sub'), they need to be serialized first.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Note: The 'get_current_user' function now uses a proper FastAPI dependency for DB connection.

# The temporary DB connection context manager 'get_db_conn_for_auth' has been removed.

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db_conn: asyncpg.Connection = Depends(get_db_connection) # New DB dependency
) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            print("[AUTH DEBUG] Username (sub) not found in token payload.")
            raise credentials_exception
        # TODO: Add more claims to TokenData if needed (e.g. user_id) and extract here
        token_data = TokenData(username=username)
    except JWTError as e:
        print(f"[AUTH DEBUG] JWTError decoding token: {e}")
        raise credentials_exception
    
    # db_conn is now injected by FastAPI.
    # The dependency get_db_connection handles acquisition/release and initial errors.
    if db_conn is None: 
        # This case should ideally be prevented by robust error handling in get_db_connection
        # or by FastAPI if the dependency itself fails.
        print("[AUTH ERROR] DB connection not provided by dependency for get_current_user. This indicates a problem with the get_db_connection dependency or pool initialization.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database service is currently unavailable."
        )

    try:
        print(f"[AUTH DEBUG] Attempting to fetch user '{token_data.username}' from DB via injected connection.")
        user = await crud_operations.get_user_by_username(conn=db_conn, username=token_data.username)
        print(f"[AUTH DEBUG] DB lookup for user '{token_data.username}' completed. Found: {'Yes' if user else 'No'}")
    except asyncpg.PostgresError as pg_err:
        print(f"[AUTH DB ERROR] PostgreSQL error during get_user_by_username: {pg_err}")
        # This error is specific to the DB operation itself.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A database error occurred while fetching user information."
        )
    except Exception as e_crud: # Catch any other unexpected error from CRUD operation
        print(f"[AUTH DB ERROR] Unexpected error during get_user_by_username: {e_crud}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing user data."
        )
            
    if user is None:
        print(f"[AUTH DEBUG] User '{token_data.username}' not found in DB from token (after DB call).")
        raise credentials_exception
    
    # Type check already present, kept for safety, though crud_operations.get_user_by_username
    # is now expected to return UserInDB.
    if not isinstance(user, UserInDB):
        print(f"[AUTH WARNING] User object for '{token_data.username}' is not of type UserInDB. Type: {type(user)}")
        # This indicates a mismatch between expected and actual return type from CRUD.
        # For robustness, could attempt conversion or raise a specific internal server error.
        # However, if CRUD functions are correctly typed and implemented, this path should not be hit.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User data format error.")

    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    if not current_user.is_active:
        print(f"[AUTH DEBUG] User '{current_user.username}' is inactive.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    print(f"[AUTH DEBUG] User '{current_user.username}' is active.")
    return current_user
