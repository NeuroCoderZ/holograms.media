from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm # For the /token endpoint
from typing import Annotated # For FastAPI < 0.95, else just use type directly
import asyncpg # For type hinting the connection
from datetime import timedelta

from backend.db import crud_operations
from backend.models import user_models, auth_models # Assuming __init__.py in models makes them accessible like this
from backend.auth import security # Assuming __init__.py in auth makes it accessible
from backend.db.pg_connector import get_db_connection # The DB dependency

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.post("/register", response_model=user_models.UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(
    user: user_models.UserCreate, 
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Registers a new user.
    - Username and email must be unique.
    """
    # Check if user already exists by username
    print(f"[AUTH REGISTER DEBUG] Checking for existing username: {user.username}")
    existing_user_by_username = await crud_operations.get_user_by_username(conn=db_conn, username=user.username)
    if existing_user_by_username:
        print(f"[AUTH REGISTER WARN] Username '{user.username}' already registered.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Check if user already exists by email
    print(f"[AUTH REGISTER DEBUG] Checking for existing email: {user.email}")
    existing_user_by_email = await crud_operations.get_user_by_email(conn=db_conn, email=user.email)
    if existing_user_by_email:
        print(f"[AUTH REGISTER WARN] Email '{user.email}' already registered.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
        
    try:
        print(f"[AUTH REGISTER DEBUG] Attempting to create user: {user.username}")
        created_user = await crud_operations.create_user(conn=db_conn, user=user)
        if not created_user: 
            # This path should ideally be covered by specific exceptions in create_user,
            # e.g., if it returns None on an unexpected failure not caught as UniqueViolationError.
            print(f"[AUTH REGISTER ERROR] crud_operations.create_user returned None for user: {user.username}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user due to an unexpected issue.")
        
        print(f"[AUTH REGISTER INFO] User '{created_user.username}' (ID: {created_user.id}) created successfully.")
        # Convert UserInDB (which create_user returns) to UserPublic for the response.
        return user_models.UserPublic.from_orm(created_user) # Pydantic V1 way
        # For Pydantic V2: return user_models.UserPublic.model_validate(created_user)

    except asyncpg.UniqueViolationError: # This might be redundant if create_user already handles and logs it
        # This specific catch is good for clarity at the router level.
        print(f"[AUTH REGISTER WARN] UniqueViolationError for username '{user.username}' or email '{user.email}'.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists.", # Simplified detail for client
        )
    except Exception as e:
        print(f"[AUTH REGISTER ERROR] Unexpected error during user registration for '{user.username}': {e}")
        # Consider logging the full traceback here: import traceback; traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration.",
        )

@router.post("/token", response_model=auth_models.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], 
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Authenticates a user and returns an access token.
    Uses OAuth2PasswordRequestForm, so client should send 'username' and 'password'
    in x-www-form-urlencoded format.
    """
    print(f"[AUTH TOKEN DEBUG] Attempting login for user: {form_data.username}")
    user = await crud_operations.get_user_by_username(conn=db_conn, username=form_data.username)
    
    if not user:
        print(f"[AUTH TOKEN WARN] User '{form_data.username}' not found.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not security.verify_password(form_data.password, user.hashed_password):
        print(f"[AUTH TOKEN WARN] Incorrect password for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password", # Keep detail generic
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        print(f"[AUTH TOKEN WARN] User '{form_data.username}' is inactive.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    
    print(f"[AUTH TOKEN INFO] User '{user.username}' authenticated successfully. Updating last login.")
    # Update last_login_at
    update_success = await crud_operations.update_user_last_login(conn=db_conn, user_id=user.id)
    if not update_success:
        # Log this issue, but it's not critical enough to fail the login.
        print(f"[AUTH TOKEN WARN] Failed to update last_login_at for user ID: {user.id}")
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Include user_id and role in the token payload
    token_data = {"sub": user.username, "user_id": user.id, "role": user.role}
    
    print(f"[AUTH TOKEN DEBUG] Creating access token for user: {user.username} with data: {token_data}")
    access_token = await security.create_access_token(
        data=token_data, 
        expires_delta=access_token_expires
    )
    print(f"[AUTH TOKEN INFO] Access token created for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=user_models.UserPublic)
async def read_users_me(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user) 
):
    """
    Fetches the current logged-in user's public information.
    """
    print(f"[AUTH USERS/ME INFO] Fetching 'me' for user: {current_user.username} (ID: {current_user.id})")
    # security.get_current_active_user already returns a UserInDB model instance.
    # We need to convert it to UserPublic for the response.
    return user_models.UserPublic.from_orm(current_user) # Pydantic V1
    # For Pydantic V2: return user_models.UserPublic.model_validate(current_user)
```
