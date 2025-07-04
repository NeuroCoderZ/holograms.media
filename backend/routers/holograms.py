from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import asyncpg

from backend.services.hologram_service import HologramService
from backend.core import models as core_models # Updated import
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection
# from pydantic import Field # Field might not be needed if HologramUpdate is simple

router = APIRouter(
    # prefix="/users/me/holograms", # Prefix removed, will be set in app.py
    tags=["Current User Holograms (Legacy)"],
)

# HologramUpdate model is now imported from core_models

@router.post("/", response_model=core_models.UserHologramDB, status_code=status.HTTP_201_CREATED)
async def create_new_user_hologram(
    hologram_in: core_models.UserHologramCreate,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    hologram_service = HologramService(db_conn)
    try:
        # print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} creating hologram: {hologram_in.hologram_name}")
        created_hologram = await hologram_service.create_new_user_hologram(
            user_id=current_user.firebase_uid, hologram_in=hologram_in
        )
        if not created_hologram:
            # print(f"[HOLOGRAM ROUTER WARN] Hologram creation failed for user {current_user.firebase_uid}, name: {hologram_in.hologram_name}. May be a duplicate.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hologram name may already exist for this user or another DB error occurred.")
        # print(f"[HOLOGRAM ROUTER INFO] Hologram '{created_hologram.hologram_name}' (ID: {created_hologram.id}) created successfully for user {current_user.firebase_uid}.")
        return created_hologram
    except HTTPException:
        raise
    except Exception as e:
        # print(f"[HOLOGRAM ROUTER ERROR] Error creating user hologram for {current_user.firebase_uid}, name {hologram_in.hologram_name}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error creating hologram: {str(e)}")

@router.get("/", response_model=List[core_models.UserHologramDB])
async def list_user_holograms(
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    hologram_service = HologramService(db_conn)
    # print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} listing holograms. Skip: {skip}, Limit: {limit}")
    holograms = await hologram_service.get_user_holograms(
        user_id=current_user.firebase_uid, skip=skip, limit=limit
    )
    # print(f"[HOLOGRAM ROUTER INFO] Found {len(holograms)} holograms for user {current_user.firebase_uid}.")
    return holograms

@router.get("/{hologram_id}", response_model=core_models.UserHologramDB)
async def get_specific_user_hologram(
    hologram_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    hologram_service = HologramService(db_conn)
    # print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} fetching hologram ID: {hologram_id}")
    hologram = await hologram_service.get_specific_user_hologram(
        hologram_id=hologram_id, user_id=current_user.firebase_uid
    )
    if not hologram:
        # print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found.")
    # print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} found for user {current_user.firebase_uid}.")
    return hologram

@router.put("/{hologram_id}", response_model=core_models.UserHologramDB)
async def update_existing_user_hologram(
    hologram_id: int,
    hologram_update: core_models.HologramUpdate, # Use HologramUpdate from core_models
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    hologram_service = HologramService(db_conn)
    update_data = hologram_update.dict(exclude_unset=True)

    if not update_data:
        # print(f"[HOLOGRAM ROUTER WARN] No update data provided for hologram ID: {hologram_id} by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    # print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} updating hologram ID: {hologram_id} with data: {update_data}")
    updated_hologram = await hologram_service.update_existing_user_hologram(
        hologram_id=hologram_id, user_id=current_user.firebase_uid, hologram_update_data=update_data
    )
    if not updated_hologram:
        # print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found or update failed for user {current_user.firebase_uid} (e.g., name conflict).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found or update failed (e.g., name conflict).")
    # print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} updated successfully for user {current_user.firebase_uid}.")
    return updated_hologram

@router.delete("/{hologram_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_saved_hologram(
    hologram_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    hologram_service = HologramService(db_conn)
    # print(f"[HOLOGRAM ROUTER INFO] User {current_user.firebase_uid} deleting hologram ID: {hologram_id}")
    deleted = await hologram_service.delete_user_saved_hologram(
        hologram_id=hologram_id, user_id=current_user.firebase_uid
    )
    if not deleted:
        # print(f"[HOLOGRAM ROUTER WARN] Hologram ID: {hologram_id} not found for deletion by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hologram not found or not owned by user.")
    # print(f"[HOLOGRAM ROUTER INFO] Hologram ID: {hologram_id} deleted successfully for user {current_user.firebase_uid}.")
    return None
