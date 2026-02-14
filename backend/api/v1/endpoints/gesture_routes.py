from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.core.models.multimodal_models import UserGestureModel
from backend.repositories.gesture_repository import GestureRepository
from backend.core.dependencies import get_gesture_repository

router = APIRouter(
    prefix="/users",
    tags=["User Gestures"],
)

@router.get("/{user_id}/gestures", response_model=List[UserGestureModel])
async def read_user_gestures(
    user_id: str,
    repo: GestureRepository = Depends(get_gesture_repository)
):
    """
    Retrieve all gestures for a specific user.
    """
    try:
        gestures = await repo.get_gestures_by_user_id(user_id=user_id)
        return gestures
    except Exception as e:
        logger.error(f"Error fetching gestures for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch gestures")

@router.post("/{user_id}/gestures", response_model=UserGestureModel)
async def create_user_gesture(
    user_id: str,
    gesture_in: UserGestureModel, # Using UserGestureModel for input as well for simplicity
    repo: GestureRepository = Depends(get_gesture_repository)
):
    """
    Create a new gesture for a specific user.
    """
    try:
        # Map internal model to repository create model if needed
        from backend.core.models.gesture_models import UserGestureDefinitionCreate
        create_data = UserGestureDefinitionCreate(
            gesture_name=gesture_in.gesture_name,
            code=gesture_in.code,
            trajectories=gesture_in.trajectories
        )
        gesture = await repo.create_gesture(user_id=user_id, gesture_in=create_data)
        if not gesture:
             raise HTTPException(status_code=400, detail="Gesture with this name already exists or creation failed")
        return gesture
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating gesture for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create gesture")

@router.delete("/{user_id}/gestures/{gesture_id}")
async def delete_user_gesture(
    user_id: str,
    gesture_id: str,
    repo: GestureRepository = Depends(get_gesture_repository)
):
    """
    Delete a specific gesture for a user.
    """
    try:
        success = await repo.delete_gesture(gesture_id=gesture_id, user_id=user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Gesture not found")
        return {"status": "success", "message": "Gesture deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting gesture {gesture_id} for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete gesture")
