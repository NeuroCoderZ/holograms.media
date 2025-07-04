import asyncpg
from typing import List, Optional, Dict, Any
import logging
from backend.core.models.gesture_models import UserGestureDefinitionDB, UserGestureDefinitionCreate

logger = logging.getLogger(__name__)

class GestureRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_gestures_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserGestureDefinitionDB]:
        sql = """
            SELECT id, user_id, gesture_name, gesture_definition, gesture_data_ref, created_at, updated_at
            FROM user_gesture_definitions
            WHERE user_id = $1
            ORDER BY created_at DESC
            OFFSET $2
            LIMIT $3;
        """
        try:
            rows = await self.conn.fetch(sql, user_id, skip, limit)
            return [UserGestureDefinitionDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in GestureRepository.get_gestures_by_user_id for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.get_gestures_by_user_id for user {user_id}: {e}")
            raise

    async def create_gesture(self, user_id: str, gesture_in: UserGestureDefinitionCreate) -> Optional[UserGestureDefinitionDB]:
        sql = """
            INSERT INTO user_gesture_definitions (user_id, gesture_name, gesture_definition, gesture_data_ref)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, gesture_name, gesture_definition, gesture_data_ref, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(
                sql,
                user_id,
                gesture_in.gesture_name,
                gesture_in.gesture_definition,
                gesture_in.gesture_data_ref
            )
            return UserGestureDefinitionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            # Specific error for unique constraint violation (e.g., duplicate gesture_name for user)
            if e.sqlstate == '23505': # Unique violation
                logger.warning(f"Gesture creation failed for user {user_id}, name '{gesture_in.gesture_name}': {e.detail or e.message}")
                return None # Indicate conflict by returning None, service layer can handle HTTP 409
            logger.error(f"DB error in GestureRepository.create_gesture for user {user_id}, name '{gesture_in.gesture_name}': {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.create_gesture for user {user_id}, name '{gesture_in.gesture_name}': {e}")
            raise

    async def get_gesture_by_id(self, gesture_id: int, user_id: str) -> Optional[UserGestureDefinitionDB]:
        sql = """
            SELECT id, user_id, gesture_name, gesture_definition, gesture_data_ref, created_at, updated_at
            FROM user_gesture_definitions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            row = await self.conn.fetchrow(sql, gesture_id, user_id)
            return UserGestureDefinitionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in GestureRepository.get_gesture_by_id for gesture_id {gesture_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.get_gesture_by_id for gesture_id {gesture_id}, user {user_id}: {e}")
            raise

    async def update_gesture(self, gesture_id: int, user_id: str, gesture_update_data: Dict[str, Any]) -> Optional[UserGestureDefinitionDB]:
        # Dynamically build the SET part of the SQL query
        set_clauses = []
        values = []
        param_idx = 1

        for key, value in gesture_update_data.items():
            set_clauses.append(f"{key} = ${param_idx}")
            values.append(value)
            param_idx += 1

        if not set_clauses:
            # Should be caught by service layer, but good to have a check
            logger.warning(f"No update data provided for gesture_id {gesture_id}, user {user_id}")
            return await self.get_gesture_by_id(gesture_id, user_id) # Return current state if no changes

        set_query_part = ", ".join(set_clauses)
        values.extend([gesture_id, user_id]) # For WHERE clause

        sql = f"""
            UPDATE user_gesture_definitions
            SET {set_query_part}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${param_idx} AND user_id = ${param_idx + 1}
            RETURNING id, user_id, gesture_name, gesture_definition, gesture_data_ref, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(sql, *values)
            return UserGestureDefinitionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            if e.sqlstate == '23505': # Unique violation (e.g. if gesture_name is updated to an existing one)
                logger.warning(f"Gesture update failed for gesture_id {gesture_id}, user {user_id} due to unique constraint: {e.detail or e.message}")
                return None # Indicate conflict
            logger.error(f"DB error in GestureRepository.update_gesture for gesture_id {gesture_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.update_gesture for gesture_id {gesture_id}, user {user_id}: {e}")
            raise

    async def delete_gesture(self, gesture_id: int, user_id: str) -> bool:
        sql = """
            DELETE FROM user_gesture_definitions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            result = await self.conn.execute(sql, gesture_id, user_id)
            # "DELETE X" returns "DELETE count_of_deleted_rows"
            return result.startswith("DELETE 1")
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in GestureRepository.delete_gesture for gesture_id {gesture_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GestureRepository.delete_gesture for gesture_id {gesture_id}, user {user_id}: {e}")
            raise
