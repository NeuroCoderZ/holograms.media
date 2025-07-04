import asyncpg
from typing import List, Optional, Dict, Any
from backend.repositories.gesture_repository import GestureRepository
from backend.core.models.gesture_models import UserGestureDefinitionDB, UserGestureDefinitionCreate
from backend.core.models.gesture_models import CoreGestureModel # GestureUpdate была в gesture.py роутере, но не в моделях gesture_models, возможно это была ошибка в задании
                                                                 # Используем GestureUpdate из gesture_models.py если она там есть или создадим ее.
                                                                 # В gesture_models.py нет GestureUpdate. В routers/gestures.py был класс GestureUpdate.
                                                                 # Возьмем его определение оттуда или создадим аналогичное.
                                                                 # Для простоты пока определим его здесь, если он не будет найден.

# Если GestureUpdate не импортируется, можно временно определить ее так, как она была в роутере:
# from pydantic import BaseModel, Field
# class GestureUpdate(UserGestureDefinitionBase): # Предполагая, что UserGestureDefinitionBase импортирован
#     gesture_name: Optional[str] = Field(None, min_length=1, max_length=100)
#     gesture_definition: Optional[Dict[str, Any]] = None
#     gesture_data_ref: Optional[int] = None

#     def __init__(self, **data: Any):
#         super().__init__(**{k: v for k, v in data.items() if v is not None})

# Попытаемся импортировать GestureUpdate из роутера, если он там определен как экспортируемый класс
# Однако, лучше определить его в моделях. Поскольку его там нет, и в задании не было указания его туда перенести,
# будем ожидать, что он будет передан как Dict[str, Any] из роутера, как это делает gesture_update.dict(exclude_unset=True)

class GestureService:
    def __init__(self, conn: asyncpg.Connection):
        self.repo = GestureRepository(conn)

    async def get_user_gestures(self, user_id: str, skip: int, limit: int) -> List[UserGestureDefinitionDB]:
        """
        Получает список жестов для пользователя.
        """
        # Здесь может быть дополнительная бизнес-логика в будущем
        return await self.repo.get_gestures_by_user_id(user_id=user_id, skip=skip, limit=limit)

    async def create_new_user_gesture(self, user_id: str, gesture_in: UserGestureDefinitionCreate) -> Optional[UserGestureDefinitionDB]:
        """
        Создает новое определение жеста для пользователя.
        """
        # Здесь может быть валидация или другая бизнес-логика
        return await self.repo.create_gesture(user_id=user_id, gesture_in=gesture_in)

    async def get_specific_user_gesture(self, gesture_id: int, user_id: str) -> Optional[UserGestureDefinitionDB]:
        """
        Получает конкретное определение жеста пользователя.
        """
        return await self.repo.get_gesture_by_id(gesture_id=gesture_id, user_id=user_id)

    async def update_existing_user_gesture(self, gesture_id: int, user_id: str, gesture_update_data: Dict[str, Any]) -> Optional[UserGestureDefinitionDB]:
        """
        Обновляет существующее определение жеста пользователя.
        gesture_update_data - это словарь с полями для обновления.
        """
        if not gesture_update_data:
            # В репозитории есть похожая проверка, но лучше и на уровне сервиса
            return await self.repo.get_gesture_by_id(gesture_id=gesture_id, user_id=user_id) # или None, или ошибка

        return await self.repo.update_gesture(gesture_id=gesture_id, user_id=user_id, gesture_update_data=gesture_update_data)

    async def delete_user_defined_gesture(self, gesture_id: int, user_id: str) -> bool:
        """
        Удаляет определение жеста пользователя.
        """
        return await self.repo.delete_gesture(gesture_id=gesture_id, user_id=user_id)
