import asyncpg
from typing import List, Optional, Dict, Any
import logging
from backend.core.models.hologram_models import UserHologramDB, UserHologramCreate

logger = logging.getLogger(__name__)

class HologramRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_holograms_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserHologramDB]:
        sql = """
            SELECT id, user_id, hologram_name, hologram_state_data, created_at, updated_at
            FROM user_holograms
            WHERE user_id = $1
            ORDER BY created_at DESC
            OFFSET $2
            LIMIT $3;
        """
        try:
            rows = await self.conn.fetch(sql, user_id, skip, limit)
            return [UserHologramDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in HologramRepository.get_holograms_by_user_id for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.get_holograms_by_user_id for user {user_id}: {e}")
            raise

    async def create_hologram(self, user_id: str, hologram_in: UserHologramCreate) -> Optional[UserHologramDB]:
        sql = """
            INSERT INTO user_holograms (user_id, hologram_name, hologram_state_data)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, hologram_name, hologram_state_data, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(
                sql,
                user_id,
                hologram_in.hologram_name,
                hologram_in.hologram_state_data
            )
            return UserHologramDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            if e.sqlstate == '23505': # Unique violation for hologram_name per user
                logger.warning(f"Hologram creation failed for user {user_id}, name '{hologram_in.hologram_name}': {e.detail or e.message}")
                return None
            logger.error(f"DB error in HologramRepository.create_hologram for user {user_id}, name '{hologram_in.hologram_name}': {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.create_hologram for user {user_id}, name '{hologram_in.hologram_name}': {e}")
            raise

    async def get_hologram_by_id(self, hologram_id: int, user_id: str) -> Optional[UserHologramDB]:
        sql = """
            SELECT id, user_id, hologram_name, hologram_state_data, created_at, updated_at
            FROM user_holograms
            WHERE id = $1 AND user_id = $2;
        """
        try:
            row = await self.conn.fetchrow(sql, hologram_id, user_id)
            return UserHologramDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in HologramRepository.get_hologram_by_id for hologram_id {hologram_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.get_hologram_by_id for hologram_id {hologram_id}, user {user_id}: {e}")
            raise

    async def update_hologram(self, hologram_id: int, user_id: str, hologram_update_data: Dict[str, Any]) -> Optional[UserHologramDB]:
        set_clauses = []
        values = []
        param_idx = 1

        for key, value in hologram_update_data.items():
            set_clauses.append(f"{key} = ${param_idx}")
            values.append(value)
            param_idx += 1

        if not set_clauses:
            return await self.get_hologram_by_id(hologram_id, user_id)

        set_query_part = ", ".join(set_clauses)
        values.extend([hologram_id, user_id])

        sql = f"""
            UPDATE user_holograms
            SET {set_query_part}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${param_idx} AND user_id = ${param_idx + 1}
            RETURNING id, user_id, hologram_name, hologram_state_data, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(sql, *values)
            return UserHologramDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            if e.sqlstate == '23505':
                logger.warning(f"Hologram update failed for hologram_id {hologram_id}, user {user_id} due to unique constraint: {e.detail or e.message}")
                return None
            logger.error(f"DB error in HologramRepository.update_hologram for hologram_id {hologram_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.update_hologram for hologram_id {hologram_id}, user {user_id}: {e}")
            raise

    async def delete_hologram(self, hologram_id: int, user_id: str) -> bool:
        sql = """
            DELETE FROM user_holograms
            WHERE id = $1 AND user_id = $2;
        """
        try:
            result = await self.conn.execute(sql, hologram_id, user_id)
            return result.startswith("DELETE 1")
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in HologramRepository.delete_hologram for hologram_id {hologram_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HologramRepository.delete_hologram for hologram_id {hologram_id}, user {user_id}: {e}")
            raise
