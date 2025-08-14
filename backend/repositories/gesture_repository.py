import httpx
import os
from typing import List, Optional, Dict, Any
import logging
from backend.core.models.gesture_models import UserGestureDefinitionDB, UserGestureDefinitionCreate

logger = logging.getLogger(__name__)

# Base URL for the Tria API on Cloudflare. This should be in a config file.
# For now, we'll define it here. We'll need to figure out the real URL structure.
BASE_URL = os.getenv("TRIA_API_BASE_URL", "https://api.cloudflare.com/client/v4/accounts/your_account_id/tria")

class GestureRepository:
    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self.client = client
        self.headers = {"Authorization": f"Bearer {api_key}"}

    async def get_gestures_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserGestureDefinitionDB]:
        """
        Fetches gestures for a user from the Tria Cloudflare API.
        """
        params = {"skip": skip, "limit": limit}
        try:
            response = await self.client.get(
                f"{BASE_URL}/users/{user_id}/gestures",
                params=params,
                headers=self.headers
            )
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
            data = response.json()
            return [UserGestureDefinitionDB(**item) for item in data]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in GestureRepository.get_gestures_by_user_id for user {user_id}: {e}")
            # Depending on the desired behavior, you might want to return an empty list or re-raise
            return []
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.get_gestures_by_user_id for user {user_id}: {e}")
            return []

    async def create_gesture(self, user_id: str, gesture_in: UserGestureDefinitionCreate) -> Optional[UserGestureDefinitionDB]:
        """
        Creates a new gesture for a user via the Tria Cloudflare API.
        """
        try:
            response = await self.client.post(
                f"{BASE_URL}/users/{user_id}/gestures",
                json=gesture_in.dict(),
                headers=self.headers
            )
            if response.status_code == 409: # Conflict
                 logger.warning(f"Gesture creation failed for user {user_id}, name '{gesture_in.gesture_name}': Conflict.")
                 return None
            response.raise_for_status()
            return UserGestureDefinitionDB(**response.json())
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in GestureRepository.create_gesture for user {user_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.create_gesture for user {user_id}: {e}")
            return None

    # ... other methods (get_gesture_by_id, update_gesture, delete_gesture) would be similarly refactored ...
    # For now, I will stub them to return default values to avoid breaking the service layer.

    async def get_gesture_by_id(self, gesture_id: int, user_id: str) -> Optional[UserGestureDefinitionDB]:
        logger.warning("get_gesture_by_id is currently stubbed and not implemented for Cloudflare API.")
        return None

    async def update_gesture(self, gesture_id: int, user_id: str, gesture_update_data: Dict[str, Any]) -> Optional[UserGestureDefinitionDB]:
        logger.warning("update_gesture is currently stubbed and not implemented for Cloudflare API.")
        return None

    async def delete_gesture(self, gesture_id: int, user_id: str) -> bool:
        logger.warning("delete_gesture is currently stubbed and not implemented for Cloudflare API.")
        return False