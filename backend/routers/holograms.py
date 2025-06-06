from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import asyncpg

from backend.core import crud_operations
from backend.core.models import hologram_models, user_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection
from pydantic import Field

router = APIRouter(
    prefix="/users/me/holograms",
    tags=["User Holograms"],
)

class HologramUpdate(hologram_models.UserHologramBase):
    hologram_name: Optional[str] = Field(None, min_length=1, max_length=100)
    hologram_state_data: Optional[Dict[str, Any]] = None

@router.post("/", response_model=hologram_models.UserHologramDB, status_code=status.HTTP_201_CREATED)
async def create_new_user_hologram(
    hologram_in: hologram_models.UserHologramCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    try:
        print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} creating hologram: {hologram_in.hologram_name}")
        created_hologram = await crud_operations.create_user_hologram(
            conn=db_conn, user_id=current_user.firebase_uid, hologram_in=hologram_in
        )
        if not created_hologram:
            print(f"[HOLOGRAM ROUTER WARN] Hologram creation failed for user {current_user.firebase_uid}, name: {hologram_in.hologram_name}. May be a duplicate.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hologram name may already exist for this user or another DB error occurred.")
        print(f"[HOLOGRAM ROUTER INFO] Hologram '{created_hologram.hologram_name}' (ID: {created_hologram.id}) created successfully for user {current_user.firebase_uid}.")
        return created_hologram
    except HTTPException:
        raise
    except Exception as e:
        print(f"[HOLOGRAM ROUTER ERROR] Error creating user hologram for {current_user.firebase_uid}, name {hologram_in.hologram_name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating hologram.")

@router.get("/", response_model=List[hologram_models.UserHologramDB])
async def list_user_holograms(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} listing holograms. Skip: {skip}, Limit: {limit}")
    holograms = await crud_operations.get_user_holograms(
        conn=db_conn, user_id=current_user.firebase_uid, skip=skip, limit=limit
    )
    print(f"[HOLOGRAM ROUTER INFO] Found {len(holograms)} holograms for user {current_user.firebase_uid}.")
    return holograms

@router.get("/{hologram_id}", response_model=hologram_models.UserHologramDB)
async def get_specific_user_hologram(
    hologram_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} fetching hologram ID: {hologram_id}")
    hologram = await crud_operations.get_user_hologram_by_id(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.firebase_uid
    )
    if not hologram:
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found.")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} found for user {current_user.firebase_uid}.")
    return hologram

@router.put("/{hologram_id}", response_model=hologram_models.UserHologramDB)
async def update_existing_user_hologram(
    hologram_id: int,
    hologram_update: HologramUpdate, 
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} updating hologram ID: {hologram_id} with data: {hologram_update.dict(exclude_unset=True)}")
    update_data = hologram_update.dict(exclude_unset=True)
    if not update_data:
        print(f"[HOLOGRAM ROUTER WARN] No update data provided for hologram ID: {hologram_id} by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    updated_hologram = await crud_operations.update_user_hologram(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.firebase_uid, hologram_update_data=update_data
    )
    if not updated_hologram:
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found or update failed for user {current_user.firebase_uid} (e.g., name conflict).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found or update failed (e.g., name conflict).")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} updated successfully for user {current_user.firebase_uid}.")
    return updated_hologram

@router.delete("/{hologram_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_saved_hologram(
    hologram_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} deleting hologram ID: {hologram_id}")
    deleted = await crud_operations.delete_user_hologram(
        conn=db_conn, hologram_id=hologram_id, user_id=current_user.firebase_uid
    )
    if not deleted:
        print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for deletion by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found.")
    print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} deleted successfully for user {current_user.firebase_uid}.")
    return None
