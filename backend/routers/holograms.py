from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional # Ensure List, Dict, Any, Optional are imported
import asyncpg

from backend.db import crud_operations
from backend.models import hologram_models, user_models # For UserInDB type hint
from backend.auth import security
from backend.db.pg_connector import get_db_connection
from pydantic import Field # Ensure Field is imported for HologramUpdate

router = APIRouter(
    prefix="/users/me/holograms",
    tags=["User Holograms"],
)

# Pydantic model for Hologram Update (partial updates)
class HologramUpdate(hologram_models.HologramBase):
    hologram_name: Optional[str] = Field(None, min_length=1, max_length=100)
    hologram_state_data: Optional[Dict[str, Any]] = None

    # Similar to GestureUpdate, make fields optional for PATCH-like behavior
    # Standard Pydantic Optional fields + dict(exclude_unset=True) is generally preferred.
    # The custom __init__ from gestures.py might be here if consistency is desired,
    # but let's try without it to see standard Pydantic behavior.
    # If specific None handling (treat None as "don't update") is desired,
    # the logic in the PUT endpoint needs to carefully handle it or the model needs a root_validator.
    # For simplicity, we'll rely on exclude_unset=True in the endpoint.


@router.post("/", response_model=hologram_models.UserHologram, status_code=status.HTTP_201_CREATED)
async def create_new_user_hologram(
    hologram_in: hologram_models.HologramCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Save a new user hologram state.
    The hologram name must be unique for the user.
    """
    try:
        print(f"[HOLOGRAM ROUTER INFO] User {current_user.username} creating hologram: {hologram_in.hologram_name}")
        created_hologram = await crud_operations.create_user_hologram(
            conn=db_conn, user_id=current_user.id, hologram_in=hologram_in
        )
        if not created_hologram:
            # crud_operations.create_user_hologram returns None on UniqueViolationError
            print(f"[HOLOGRAM ROUTER WARN] Hologram creation failed for user {current_user.username}, name: {hologram_in.hologram_name}. May be a duplicate.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hologram name may already exist for this user or another DB error occurred.")
        print(f"[HOLOGRAM ROUTER INFO] Hologram '{created_hologram.hologram_name}' (ID: {created_hologram.id}) created successfully for user {current_user.username}.")
        return created_hologram
    except HTTPException:
        raise
    except Exception as e:
        print(f"[HOLOGRAM ROUTER ERROR] Error creating user hologram for {current_user.username}, name {hologram_in.hologram_name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating hologram.")

@router.get("/", response_model=List[hologram_models.UserHologram])
async def list_user_holograms(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """
    List all saved holograms for the current authenticated user.
    """
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.username} listing holograms. Skip: {skip}, Limit: {limit}")
    holograms = await crud_operations.get_user_holograms(
        conn=db_conn, user_id=current_user.id, skip=skip, limit=limit
    )
    print(f"[HOLOGRAM ROUTER INFO] Found {len(holograms)} holograms for user {current_user.username}.")
    return holograms

@router.get("/{hologram_id}", response_model=hologram_models.UserHologram)
async def get_specific_user_hologram(
    hologram_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Get a specific saved hologram by its ID for the current authenticated user.
    Frontend will use hologram_state_data from the response to restore the state.
    """
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.username} fetching hologram ID: {hologram_id}")
    hologram = await crud_operations.get_user_hologram_by_id(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.id
    )
    if not hologram:
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found.")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} found for user {current_user.username}.")
    return hologram

@router.put("/{hologram_id}", response_model=hologram_models.UserHologram)
async def update_existing_user_hologram(
    hologram_id: int,
    hologram_update: HologramUpdate, # Using the new HologramUpdate model
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Update a specific saved hologram by its ID for the current authenticated user.
    Allows partial updates of name or state_data.
    """
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.username} updating hologram ID: {hologram_id} with data: {hologram_update.dict(exclude_unset=True)}")
    update_data = hologram_update.dict(exclude_unset=True)
    if not update_data:
        print(f"[HOLOGRAM ROUTER WARN] No update data provided for hologram ID: {hologram_id} by user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    updated_hologram = await crud_operations.update_user_hologram(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.id, hologram_update_data=update_data
    )
    if not updated_hologram:
        # This could be due to not found, or unique constraint violation on name change
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found or update failed for user {current_user.username} (e.g., name conflict).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found or update failed (e.g., name conflict).")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} updated successfully for user {current_user.username}.")
    return updated_hologram

@router.delete("/{hologram_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_saved_hologram(
    hologram_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Delete a specific saved hologram by its ID for the current authenticated user.
    """
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.username} deleting hologram ID: {hologram_id}")
    deleted = await crud_operations.delete_user_hologram(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.id
    )
    if not deleted:
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for deletion by user {current_user.username}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found.")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} deleted successfully for user {current_user.username}.")
    return None # For 204 No Content
```
