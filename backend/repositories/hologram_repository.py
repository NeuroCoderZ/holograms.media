import httpx
import os
from typing import List, Optional, Dict, Any
import logging
from backend.core.models.hologram_models import UserHologramDB, UserHologramCreate

logger = logging.getLogger(__name__)

# Base URL for the Tria API on Cloudflare. This should be in a config file.
BASE_URL = os.getenv("TRIA_API_BASE_URL", "https://api.cloudflare.com/client/v4/accounts/your_account_id/tria")

class HologramRepository:
    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self.client = client
        self.headers = {"Authorization": f"Bearer {api_key}"}

    async def get_holograms_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserHologramDB]:
        """
        Fetches holograms for a user from the Tria Cloudflare API.
        """
        params = {"skip": skip, "limit": limit}
        try:
            response = await self.client.get(
                f"{BASE_URL}/users/{user_id}/holograms",
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return [UserHologramDB(**item) for item in data]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in HologramRepository.get_holograms_by_user_id for user {user_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.get_holograms_by_user_id for user {user_id}: {e}")
            return []

    async def create_hologram(self, user_id: str, hologram_in: UserHologramCreate) -> Optional[UserHologramDB]:
        """
        Creates a new hologram for a user via the Tria Cloudflare API.
        """
        try:
            response = await self.client.post(
                f"{BASE_URL}/users/{user_id}/holograms",
                json=hologram_in.dict(),
                headers=self.headers
            )
            if response.status_code == 409: # Conflict
                logger.warning(f"Hologram creation failed for user {user_id}, name '{hologram_in.hologram_name}': Conflict.")
                return None
            response.raise_for_status()
            return UserHologramDB(**response.json())
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in HologramRepository.create_hologram for user {user_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.create_hologram for user {user_id}: {e}")
            return None

    # ... other methods stubbed for now ...

    async def get_hologram_by_id(self, hologram_id: int, user_id: str) -> Optional[UserHologramDB]:
        logger.warning("get_hologram_by_id is currently stubbed and not implemented for Cloudflare API.")
        return None

    async def update_hologram(self, hologram_id: int, user_id: str, hologram_update_data: Dict[str, Any]) -> Optional[UserHologramDB]:
        logger.warning("update_hologram is currently stubbed and not implemented for Cloudflare API.")
        return None

    async def delete_hologram(self, hologram_id: int, user_id: str) -> bool:
        logger.warning("delete_hologram is currently stubbed and not implemented for Cloudflare API.")
        return False