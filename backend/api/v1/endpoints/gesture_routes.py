from fastapi import APIRouter, Depends, HTTPException, status, Security
from typing import List
import asyncpg

# Предполагается, что UserGestureModel находится здесь
from backend.core.models.multimodal_models import UserGestureModel
# Предполагается, что crud_operations находится здесь
from backend.core import crud_operations
# Для подключения к БД
from backend.core.db.pg_connector import get_db_connection
# Для аутентификации и UserInDB
from backend.auth.security import get_current_active_user # Убедитесь, что этот путь корректен
from backend.core.models.user_models import UserInDB # Убедитесь, что этот путь корректен для UserInDB

# Если AuthService используется для дополнительной проверки user_id из токена
# from backend.core.auth_service import AuthService # Путь может отличаться

router = APIRouter(
    prefix="/users", # Префикс изменен на /users для соответствия пути /users/{user_id}/gestures
    tags=["User Gestures"],
)

@router.get("/{user_id}/gestures", response_model=List[UserGestureModel])
async def read_user_gestures(
    user_id: str,
    # Опциональная часть: Проверка JWT и соответствия user_id
    # current_user: UserInDB = Security(get_current_active_user, scopes=[]), # Используем Security для возможности scopes
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieve all gestures for a specific user.

    (Опционально: If JWT is enforced, this endpoint will require authentication,
    and will verify that the requesting user is authorized to access gestures for the given user_id.)
    """

    # Опциональная проверка безопасности:
    # if current_user.user_id_firebase != user_id: # или current_user.id, в зависимости от поля в UserInDB
    #     # Можно также проверить, является ли current_user администратором, если такая роль есть
    #     # if not current_user.is_admin: # Пример
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Not authorized to access gestures for this user.",
    #     )

    # Логика для получения жестов из crud_operations
    # Обратите внимание, что crud_operations.get_gestures_by_user_id может потребовать asyncpg.Connection
    try:
        gestures = await crud_operations.get_gestures_by_user_id(db=db, user_id=user_id)
        if not gestures:
            # Возвращаем пустой список, если жесты не найдены, это не ошибка
            return []
        return gestures
    except asyncpg.PostgresError as e:
        # Логирование ошибки здесь может быть полезным
        # logger.error(f"Database error when fetching gestures for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching gestures from the database."
        )
    except Exception as e: # Обработка других неожиданных ошибок
        # logger.error(f"Unexpected error when fetching gestures for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )

# Примечание: Если AuthService и JWT верификация являются обязательными,
# то зависимость `current_user: UserInDB = Security(get_current_active_user, scopes=[])`
# должна быть раскомментирована, и логика проверки user_id должна быть включена.
# Для MVP, как указано в задаче, это может быть опционально.
# Я оставлю эту часть закомментированной, чтобы соответствовать базовым требованиям MVP,
# но укажу, что это место для будущей реализации безопасности.
