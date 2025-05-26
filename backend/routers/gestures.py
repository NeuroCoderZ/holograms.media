from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional # Ensure List, Dict, Any, Optional are imported
import asyncpg

from backend.db import crud_operations
from backend.models import gesture_models, user_models # For UserInDB type hint
from backend.auth import security
from backend.db.pg_connector import get_db_connection
from pydantic import Field # Ensure Field is imported for GestureUpdate

router = APIRouter(
    prefix="/users/me/gestures",
    tags=["User Gestures"],
    # dependencies=[Depends(security.get_current_active_user)] # Option 1: Router-level dependency
)

# Pydantic model for Gesture Update (partial updates)
# This class should be within the scope where gesture_models is available
class GestureUpdate(gesture_models.GestureBase):
    gesture_name: Optional[str] = Field(None, min_length=1, max_length=100)
    gesture_definition: Optional[Dict[str, Any]] = None
    gesture_data_ref: Optional[int] = None

    # Make all fields optional for PATCH-like behavior by Pydantic v1 logic
    # For Pydantic V1, if a field is not provided, it won't be in `gesture_update.dict(exclude_unset=True)`
    # No custom __init__ is strictly needed for Pydantic V1 if using exclude_unset=True,
    # but the provided one aims to ensure only non-None values are processed if that's the intent.
    # However, Pydantic's default behavior with Optional fields and exclude_unset=True is usually sufficient.
    # Let's stick to a more standard Pydantic way if the custom __init__ isn't strictly necessary
    # for the `dict(exclude_unset=True)` to work as intended.
    # The default Pydantic behavior for Optional fields is that they are None if not provided.
    # `dict(exclude_unset=True)` will exclude them if they were not explicitly set.
    # The custom __init__ as provided seems to be a more complex way to achieve what exclude_unset=True does.
    # Let's re-evaluate if the custom __init__ is truly needed or if standard Pydantic optional fields + exclude_unset=True suffice.
    # For PUT, all fields should be optional in the model, and then `exclude_unset=True` is used.
    # The provided __init__ ensures that if a field is passed as None, it's not set on the model,
    # which is slightly different from Pydantic's default where it would be set to None.
    # Given the instruction, I'll keep the provided __init__.
    def __init__(self, **data: Any):
        # Filter out keys where the value is None before passing to Pydantic's __init__
        # This ensures that fields explicitly set to None by the client are not included
        # if the intention is to only process fields that are truly present.
        # However, for PATCH behavior, usually `exclude_unset=True` on `dict()` is the primary mechanism.
        # This custom init might be for a specific interpretation of "partial".
        # Let's assume it's for making sure that if a client sends `{"gesture_name": null}`,
        # it's treated as "don't update this field" rather than "set this field to null".
        # Standard Pydantic with `Optional` fields and `exclude_unset=True` should handle this.
        # For now, following the provided code:
        super().__init__(**{k: v for k, v in data.items() if v is not None})


@router.post("/", response_model=gesture_models.UserGesture, status_code=status.HTTP_201_CREATED)
async def create_new_user_gesture(
    gesture_in: gesture_models.GestureCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user), # Option 2: Endpoint-level dependency
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Create a new user-defined gesture.
    The gesture name must be unique for the user.
    """
    try:
        # The check for existing gesture name is handled by a unique constraint in the DB.
        # crud_operations.create_user_gesture returns None if that constraint is violated.
        print(f"[GUESTURE ROUTER INFO] User {current_user.username} creating gesture: {gesture_in.gesture_name}")
        created_gesture = await crud_operations.create_user_gesture(
            conn=db_conn, user_id=current_user.id, gesture_in=gesture_in
        )
        if not created_gesture:
            # This could happen if the unique constraint (user_id, gesture_name) is violated
            # crud_operations.create_user_gesture currently returns None on UniqueViolationError
            print(f"[GUESTURE ROUTER WARN] Gesture creation failed for user {current_user.username}, name: {gesture_in.gesture_name}. May be a duplicate.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Gesture name may already exist for this user or another database error occurred.")
        print(f"[GUESTURE ROUTER INFO] Gesture '{created_gesture.gesture_name}' (ID: {created_gesture.id}) created successfully for user {current_user.username}.")
        return created_gesture
    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        print(f"[GUESTURE ROUTER ERROR] Error creating user gesture for {current_user.username}, name {gesture_in.gesture_name}: {e}") # Log error
        # import traceback; traceback.print_exc() # For more detailed server-side logging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating gesture.")

@router.get("/", response_model=List[gesture_models.UserGesture])
async def list_user_gestures(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200) # Max limit 200
):
    """
    List all gestures for the current authenticated user.
    """
    print(f"[GUESTURE ROUTER INFO] User {current_user.username} listing gestures. Skip: {skip}, Limit: {limit}")
    gestures = await crud_operations.get_user_gestures(
        conn=db_conn, user_id=current_user.id, skip=skip, limit=limit
    )
    print(f"[GUESTURE ROUTER INFO] Found {len(gestures)} gestures for user {current_user.username}.")
    return gestures

@router.get("/{gesture_id}", response_model=gesture_models.UserGesture)
async def get_specific_user_gesture(
    gesture_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Get a specific gesture by its ID for the current authenticated user.
    """
    print(f"[GUESTURE ROUTER INFO] User {current_user.username} fetching gesture ID: {gesture_id}")
    gesture = await crud_operations.get_user_gesture_by_id(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.id
    )
    if not gesture:
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found for user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found.")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} found for user {current_user.username}.")
    return gesture

@router.put("/{gesture_id}", response_model=gesture_models.UserGesture)
async def update_existing_user_gesture(
    gesture_id: int,
    gesture_update: GestureUpdate, # Use the new GestureUpdate model
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Update a specific gesture by its ID for the current authenticated user.
    Allows partial updates of name, definition, or data_ref.
    """
    print(f"[GUESTURE ROUTER INFO] User {current_user.username} updating gesture ID: {gesture_id} with data: {gesture_update.dict(exclude_unset=True)}")
    # Using exclude_unset=True is crucial for PATCH-like behavior with Pydantic models
    # where only provided fields are considered for update.
    update_data = gesture_update.dict(exclude_unset=True) 
    
    if not update_data: # Check if any actual data was sent for update
        print(f"[GUESTURE ROUTER WARN] No update data provided for gesture ID: {gesture_id} by user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    updated_gesture = await crud_operations.update_user_gesture(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.id, gesture_update_data=update_data
    )
    if not updated_gesture:
        # This could be due to not found, or unique constraint violation on name change if crud_operations.update_user_gesture returns None in that case
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found or update failed for user {current_user.username} (e.g., name conflict).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found or update failed (e.g., name conflict).")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} updated successfully for user {current_user.username}.")
    return updated_gesture

@router.delete("/{gesture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_defined_gesture(
    gesture_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Delete a specific gesture by its ID for the current authenticated user.
    """
    print(f"[GUESTURE ROUTER INFO] User {current_user.username} deleting gesture ID: {gesture_id}")
    deleted = await crud_operations.delete_user_gesture(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.id
    )
    if not deleted:
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found for deletion by user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found.")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} deleted successfully for user {current_user.username}.")
    return None # For 204 No Content
```
