import httpx
import os
from functools import lru_cache
from fastapi import Depends, HTTPException, status

from backend.repositories.gesture_repository import GestureRepository
from backend.repositories.hologram_repository import HologramRepository
from backend.core.db.astra_connector import get_db
from typing import Any

# --- HTTP Client Dependency ---

async def get_http_client() -> httpx.AsyncClient:
    """
    Dependency that provides a single, reusable httpx.AsyncClient instance
    per application lifecycle.
    """
    # This is a simple implementation. For production, you might want to manage
    # the client lifecycle with on_event("startup") and on_event("shutdown").
    async with httpx.AsyncClient() as client:
        yield client

# --- API Key Dependency ---

@lru_cache()
def get_tria_api_key() -> str:
    """
    Dependency that retrieves the Tria API key from environment variables.
    Uses lru_cache to read the environment variable only once.
    """
    tria_api_key = os.getenv("TRIA_API_KEY")
    if not tria_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TRIA_API_KEY environment variable is not set."
        )
    return tria_api_key

# --- Repository Dependencies ---

def get_gesture_repository(
    db: Any = Depends(get_db)
) -> GestureRepository:
    """
    Dependency that provides a GestureRepository instance initialized with Astra DB.
    """
    return GestureRepository(db)

def get_hologram_repository(
    db: Any = Depends(get_db)
) -> HologramRepository:
    """
    Dependency that provides a HologramRepository instance initialized with Astra DB.
    """
    return HologramRepository(db)
