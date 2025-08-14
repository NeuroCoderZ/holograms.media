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
    Retrieve all gestures for a specific user from the Tria API.
    """
    try:
        # The repository now handles the API call
        gestures = await repo.get_gestures_by_user_id(user_id=user_id)
        return gestures
    except Exception as e:
        # The repository logs errors, but we can raise a generic server error here
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching gestures."
        )
