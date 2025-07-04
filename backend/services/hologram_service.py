import asyncpg
from typing import List, Optional, Dict, Any
from backend.repositories.hologram_repository import HologramRepository
from backend.core.models.hologram_models import UserHologramDB, UserHologramCreate

class HologramService:
    def __init__(self, conn: asyncpg.Connection):
        self.repo = HologramRepository(conn)

    async def get_user_holograms(self, user_id: str, skip: int, limit: int) -> List[UserHologramDB]:
        """
        Получает список голограмм для пользователя.
        """
        # В будущем здесь может быть логика кеширования или дополнительной проверки прав
        return await self.repo.get_holograms_by_user_id(user_id=user_id, skip=skip, limit=limit)

    async def create_new_user_hologram(self, user_id: str, hologram_in: UserHologramCreate) -> Optional[UserHologramDB]:
        """
        Создает новую голограмму для пользователя.
        """
        # Здесь может быть дополнительная бизнес-логика, например, валидация hologram_state_data
        return await self.repo.create_hologram(user_id=user_id, hologram_in=hologram_in)

    async def get_specific_user_hologram(self, hologram_id: int, user_id: str) -> Optional[UserHologramDB]:
        """
        Получает конкретную голограмму пользователя.
        """
        return await self.repo.get_hologram_by_id(hologram_id=hologram_id, user_id=user_id)

    async def update_existing_user_hologram(self, hologram_id: int, user_id: str, hologram_update_data: Dict[str, Any]) -> Optional[UserHologramDB]:
        """
        Обновляет существующую голограмму пользователя.
        hologram_update_data - это словарь с полями для обновления.
        """
        if not hologram_update_data:
            # Можно вернуть текущее состояние или ошибку, если нет данных для обновления
            return await self.repo.get_hologram_by_id(hologram_id=hologram_id, user_id=user_id)

        return await self.repo.update_hologram(hologram_id=hologram_id, user_id=user_id, hologram_update_data=hologram_update_data)

    async def delete_user_saved_hologram(self, hologram_id: int, user_id: str) -> bool:
        """
        Удаляет сохраненную голограмму пользователя.
        """
        return await self.repo.delete_hologram(hologram_id=hologram_id, user_id=user_id)
