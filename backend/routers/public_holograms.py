from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from backend.services.hologram_service import HologramService
from backend.core.models.hologram_models import UserHologramResponseModel
from backend.repositories.hologram_repository import HologramRepository
from backend.core.dependencies import get_hologram_repository

router = APIRouter(
    prefix="/users",
    tags=["Public User Data"]
)

logger = logging.getLogger(__name__)

@router.get("/{user_id}/holograms", response_model=List[UserHologramResponseModel])
async def get_user_holograms_public_endpoint(
    user_id: str,
    repo: HologramRepository = Depends(get_hologram_repository)
):
    """
    Retrieve all holograms for a specific user from the Tria API.
    """
    try:
        # The service layer might be overkill now, but we'll keep it for consistency
        # and potential future logic (caching, etc.).
        # A more direct approach would be: holograms = await repo.get_holograms_by_user_id(...)
        
        # This part needs to be refactored as HologramService expects a db_conn
        # For now, let's call the repo directly.
        holograms = await repo.get_holograms_by_user_id(user_id=user_id, skip=0, limit=100)
        return holograms
    except Exception as e:
        logger.error(f"Unexpected error in public_holograms endpoint for user_id {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching user holograms."
        )
