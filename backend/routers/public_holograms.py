from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import asyncpg
import logging

from backend.core.crud_operations import get_holograms_by_user_id
from backend.models.hologram_models import UserHologramResponseModel
from backend.db.pg_connector import get_db_connection # Assuming this path is correct based on other routers

router = APIRouter(
    prefix="/users",
    tags=["Public User Data"] # Tag updated as per instructions
)

logger = logging.getLogger(__name__)

@router.get("/{user_id}/holograms", response_model=List[UserHologramResponseModel])
async def get_user_holograms_public_endpoint(
    user_id: str,
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieve all holograms for a specific user.
    This endpoint is publicly accessible or subject to specific authorization rules
    defined elsewhere.
    """
    try:
        logger.info(f"Endpoint get_user_holograms_public_endpoint called for user_id: {user_id}")
        holograms = await get_holograms_by_user_id(db=db_conn, user_id=user_id)
        # The CRUD operation (get_holograms_by_user_id) already logs
        # the number of holograms found or if none were found.
        return holograms
    except asyncpg.PostgresError as e:
        # Logged in CRUD, but specific logging here can be useful for endpoint context
        logger.error(f"Database error in public_holograms endpoint for user_id {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, # Or 500
            detail="A database error occurred while fetching user holograms."
        )
    except Exception as e:
        # General exceptions are also logged in CRUD, but re-logging here with endpoint context
        logger.error(f"Unexpected error in public_holograms endpoint for user_id {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching user holograms."
        )
