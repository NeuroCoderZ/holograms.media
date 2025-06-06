from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import asyncpg

from backend.core import crud_operations
from backend.core.models import gesture_models, user_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection
from pydantic import Field

router = APIRouter(
    prefix="/users/me/gestures",
    tags=["User Gestures"],
)

class GestureUpdate(gesture_models.UserGestureDefinitionBase):
    gesture_name: Optional[str] = Field(None, min_length=1, max_length=100)
    gesture_definition: Optional[Dict[str, Any]] = None
    gesture_data_ref: Optional[int] = None

    def __init__(self, **data: Any):
        super().__init__(**{k: v for k, v in data.items() if v is not None})

@router.post("/", response_model=gesture_models.UserGestureDefinitionDB, status_code=status.HTTP_201_CREATED)
async def create_new_user_gesture(
    gesture_in: gesture_models.UserGestureDefinitionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    try:
        print(f"[GUESTURE ROUTER INFO] User {current_user.firebase_uid} creating gesture: {gesture_in.gesture_name}")
        created_gesture = await crud_operations.create_user_gesture(
            conn=db_conn, user_id=current_user.firebase_uid, gesture_in=gesture_in
        )
        if not created_gesture:
            print(f"[GUESTURE ROUTER WARN] Gesture creation failed for user {current_user.firebase_uid}, name: {gesture_in.gesture_name}. May be a duplicate.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Gesture name may already exist for this user or another database error occurred.")
        print(f"[GUESTURE ROUTER INFO] Gesture '{created_gesture.gesture_name}' (ID: {created_gesture.id}) created successfully for user {current_user.firebase_uid}.")
        return created_gesture
    except HTTPException:
        raise
    except Exception as e:
        print(f"[GUESTURE ROUTER ERROR] Error creating user gesture for {current_user.firebase_uid}, name {gesture_in.gesture_name}: {e}") 
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating gesture.")

@router.get("/", response_model=List[gesture_models.UserGestureDefinitionDB])
async def list_user_gestures(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200) 
):
    print(f"[GUESTURE ROUTER INFO] User {current_user.firebase_uid} listing gestures. Skip: {skip}, Limit: {limit}")
    gestures = await crud_operations.get_user_gestures(
        conn=db_conn, user_id=current_user.firebase_uid, skip=skip, limit=limit
    )
    print(f"[GUESTURE ROUTER INFO] Found {len(gestures)} gestures for user {current_user.firebase_uid}.")
    return gestures

@router.get("/{gesture_id}", response_model=gesture_models.UserGestureDefinitionDB)
async def get_specific_user_gesture(
    gesture_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[GUESTURE ROUTER INFO] User {current_user.firebase_uid} fetching gesture ID: {gesture_id}")
    gesture = await crud_operations.get_user_gesture_by_id(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.firebase_uid
    )
    if not gesture:
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found.")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} found for user {current_user.firebase_uid}.")
    return gesture

@router.put("/{gesture_id}", response_model=gesture_models.UserGestureDefinitionDB)
async def update_existing_user_gesture(
    gesture_id: int,
    gesture_update: GestureUpdate, 
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[GUESTURE ROUTER INFO] User {current_user.firebase_uid} updating gesture ID: {gesture_id} with data: {gesture_update.dict(exclude_unset=True)}")
    update_data = gesture_update.dict(exclude_unset=True) 
    
    if not update_data: 
        print(f"[GUESTURE ROUTER WARN] No update data provided for gesture ID: {gesture_id} by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    updated_gesture = await crud_operations.update_user_gesture(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.firebase_uid, gesture_update_data=update_data
    )
    if not updated_gesture:
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found or update failed for user {current_user.firebase_uid} (e.g., name conflict).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found or update failed (e.g., name conflict).")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} updated successfully for user {current_user.firebase_uid}.")
    return updated_gesture

@router.delete("/{gesture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_defined_gesture(
    gesture_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[GUESTURE ROUTER INFO] User {current_user.firebase_uid} deleting gesture ID: {gesture_id}")
    deleted = await crud_operations.delete_user_gesture(
        conn=db_conn, gesture_id=gesture_id, user_id=current_user.firebase_uid
    )
    if not deleted:
        print(f"[GUESTURE ROUTER WARN] Gesture ID: {gesture_id} not found for deletion by user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gesture not found.")
    print(f"[GUESTURE ROUTER INFO] Gesture ID: {gesture_id} deleted successfully for user {current_user.firebase_uid}.")
    return None
