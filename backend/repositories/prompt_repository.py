import asyncpg
from typing import List, Optional, Dict, Any
import logging

from backend.core.models import (
    UserPromptVersionDB, UserPromptVersionCreate
)

logger = logging.getLogger(__name__)

class PromptRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_prompt_version(self, user_id: str, version_number: int, prompt_in: UserPromptVersionCreate) -> Optional[UserPromptVersionDB]:
        sql = """
            INSERT INTO user_prompt_versions (user_id, prompt_title, prompt_text, version_number, associated_hologram_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, prompt_title, prompt_text, version_number, created_at, associated_hologram_id, metadata;
        """
        try:
            row = await self.conn.fetchrow(
                sql,
                user_id,
                prompt_in.prompt_title,
                prompt_in.prompt_text,
                version_number,
                prompt_in.associated_hologram_id,
                prompt_in.metadata
            )
            return UserPromptVersionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            # Check for unique constraint violation (user_id, prompt_title, version_number)
            if e.sqlstate == '23505': # unique_violation
                logger.warning(f"DB error: Prompt version already exists for user {user_id}, title '{prompt_in.prompt_title}', version {version_number}. Detail: {e.detail}")
                return None
            logger.error(f"DB error in PromptRepository.create_prompt_version for user {user_id}, title '{prompt_in.prompt_title}': {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in PromptRepository.create_prompt_version for user {user_id}, title '{prompt_in.prompt_title}': {e}")
            raise

    async def get_prompt_version_by_id(self, prompt_version_id: int, user_id: str) -> Optional[UserPromptVersionDB]:
        sql = """
            SELECT id, user_id, prompt_title, prompt_text, version_number, created_at, associated_hologram_id, metadata
            FROM user_prompt_versions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            row = await self.conn.fetchrow(sql, prompt_version_id, user_id)
            return UserPromptVersionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.get_prompt_version_by_id for id {prompt_version_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in PromptRepository.get_prompt_version_by_id for id {prompt_version_id}, user {user_id}: {e}")
            raise

    async def get_prompt_version_by_title_and_version(self, prompt_title: str, version: int, user_id: str) -> Optional[UserPromptVersionDB]:
        sql = """
            SELECT id, user_id, prompt_title, prompt_text, version_number, created_at, associated_hologram_id, metadata
            FROM user_prompt_versions
            WHERE prompt_title = $1 AND version_number = $2 AND user_id = $3;
        """
        try:
            row = await self.conn.fetchrow(sql, prompt_title, version, user_id)
            return UserPromptVersionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.get_prompt_version_by_title_and_version for title '{prompt_title}', user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for title '{prompt_title}', user {user_id}: {e}")
            raise

    async def get_latest_version_number_for_title(self, prompt_title: str, user_id: str) -> Optional[int]:
        sql = """
            SELECT MAX(version_number)
            FROM user_prompt_versions
            WHERE prompt_title = $1 AND user_id = $2;
        """
        try:
            max_version = await self.conn.fetchval(sql, prompt_title, user_id)
            return max_version
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.get_latest_version_number_for_title for title '{prompt_title}', user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for title '{prompt_title}', user {user_id}: {e}")
            raise

    async def get_latest_prompt_version_by_title(self, prompt_title: str, user_id: str) -> Optional[UserPromptVersionDB]:
        sql = """
            SELECT id, user_id, prompt_title, prompt_text, version_number, created_at, associated_hologram_id, metadata
            FROM user_prompt_versions
            WHERE prompt_title = $1 AND user_id = $2
            ORDER BY version_number DESC
            LIMIT 1;
        """
        try:
            row = await self.conn.fetchrow(sql, prompt_title, user_id)
            return UserPromptVersionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.get_latest_prompt_version_by_title for title '{prompt_title}', user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for title '{prompt_title}', user {user_id}: {e}")
            raise

    async def list_prompt_versions_by_title(self, prompt_title: str, user_id: str, skip: int = 0, limit: int = 100) -> List[UserPromptVersionDB]:
        sql = """
            SELECT id, user_id, prompt_title, prompt_text, version_number, created_at, associated_hologram_id, metadata
            FROM user_prompt_versions
            WHERE prompt_title = $1 AND user_id = $2
            ORDER BY version_number DESC
            OFFSET $3
            LIMIT $4;
        """
        try:
            rows = await self.conn.fetch(sql, prompt_title, user_id, skip, limit)
            return [UserPromptVersionDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.list_prompt_versions_by_title for title '{prompt_title}', user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for title '{prompt_title}', user {user_id}: {e}")
            raise

    async def list_distinct_prompt_titles_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        # Returns a list of dicts, each containing 'prompt_title', 'version_count', 'last_updated'
        sql = """
            SELECT
                prompt_title,
                COUNT(id) AS version_count,
                MAX(created_at) AS last_updated
            FROM user_prompt_versions
            WHERE user_id = $1
            GROUP BY prompt_title
            ORDER BY MAX(created_at) DESC;
        """
        try:
            rows = await self.conn.fetch(sql, user_id)
            # Pydantic model UserPromptTitleInfo can be used here if defined and imported
            return [dict(row) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.list_distinct_prompt_titles_by_user_id for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in PromptRepository.list_distinct_prompt_titles_by_user_id for user {user_id}: {e}")
            raise

    async def delete_prompt_version_by_id(self, prompt_version_id: int, user_id: str) -> bool:
        sql = """
            DELETE FROM user_prompt_versions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            result = await self.conn.execute(sql, prompt_version_id, user_id)
            return result.startswith("DELETE 1")
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.delete_prompt_version_by_id for id {prompt_version_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in PromptRepository.delete_prompt_version_by_id for id {prompt_version_id}, user {user_id}: {e}")
            raise

    async def delete_all_versions_for_prompt_title(self, prompt_title: str, user_id: str) -> int:
        sql = """
            DELETE FROM user_prompt_versions
            WHERE prompt_title = $1 AND user_id = $2;
        """
        try:
            result_str = await self.conn.execute(sql, prompt_title, user_id) # "DELETE X"
            return int(result_str.split(" ")[1]) if result_str.startswith("DELETE") else 0
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in PromptRepository.delete_all_versions_for_prompt_title for title '{prompt_title}', user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for title '{prompt_title}', user {user_id}: {e}")
            raise

```
