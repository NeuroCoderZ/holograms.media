import asyncpg
from typing import List, Optional, Dict, Any
import logging

from backend.repositories.prompt_repository import PromptRepository
from backend.core.models import (
    UserPromptVersionDB, UserPromptVersionCreate, UserPromptTitleInfo # Assuming UserPromptTitleInfo is in models.__init__
)

logger = logging.getLogger(__name__)

class PromptService:
    def __init__(self, conn: asyncpg.Connection):
        self.repo = PromptRepository(conn)

    async def create_new_prompt_version(self, user_id: str, prompt_data: UserPromptVersionCreate) -> Optional[UserPromptVersionDB]:
        """
        Creates a new version for a prompt.
        If it's a new title for the user, version starts at 1.
        If title exists, increments the latest version number.
        """
        logger.info(f"Service: Creating new prompt version for user {user_id}, title '{prompt_data.prompt_title}'.")

        latest_version_num = await self.repo.get_latest_version_number_for_title(
            prompt_title=prompt_data.prompt_title,
            user_id=user_id
        )

        new_version_number = 1
        if latest_version_num is not None:
            new_version_number = latest_version_num + 1

        created_prompt = await self.repo.create_prompt_version(
            user_id=user_id,
            version_number=new_version_number,
            prompt_in=prompt_data
        )
        if created_prompt:
            logger.info(f"Service: Prompt version {new_version_number} for title '{prompt_data.prompt_title}' created (ID: {created_prompt.id}).")
        else:
            logger.error(f"Service: Failed to create prompt version for title '{prompt_data.prompt_title}', user {user_id}.")
        return created_prompt

    async def get_prompt_version_by_id(self, prompt_version_id: int, user_id: str) -> Optional[UserPromptVersionDB]:
        """
        Retrieves a specific prompt version by its ID, ensuring it belongs to the user.
        """
        logger.info(f"Service: Getting prompt version by ID {prompt_version_id} for user {user_id}.")
        return await self.repo.get_prompt_version_by_id(prompt_version_id=prompt_version_id, user_id=user_id)

    async def get_prompt_version(self, prompt_title: str, version_number: int, user_id: str) -> Optional[UserPromptVersionDB]:
        """
        Retrieves a specific version of a prompt by title and version number for a user.
        """
        logger.info(f"Service: Getting prompt '{prompt_title}' v{version_number} for user {user_id}.")
        return await self.repo.get_prompt_version_by_title_and_version(
            prompt_title=prompt_title,
            version=version_number,
            user_id=user_id
        )

    async def get_latest_prompt_version(self, prompt_title: str, user_id: str) -> Optional[UserPromptVersionDB]:
        """
        Retrieves the latest version of a prompt by its title for a user.
        """
        logger.info(f"Service: Getting latest version of prompt '{prompt_title}' for user {user_id}.")
        return await self.repo.get_latest_prompt_version_by_title(prompt_title=prompt_title, user_id=user_id)

    async def list_versions_for_prompt_title(self, prompt_title: str, user_id: str, skip: int = 0, limit: int = 100) -> List[UserPromptVersionDB]:
        """
        Lists all versions of a specific prompt title for a user, sorted newest first.
        """
        logger.info(f"Service: Listing versions for prompt '{prompt_title}' (user: {user_id}), skip={skip}, limit={limit}.")
        return await self.repo.list_prompt_versions_by_title(prompt_title=prompt_title, user_id=user_id, skip=skip, limit=limit)

    async def list_user_prompt_titles(self, user_id: str) -> List[UserPromptTitleInfo]:
        """
        Lists all distinct prompt titles for a user, along with version count and last update time.
        """
        logger.info(f"Service: Listing distinct prompt titles for user {user_id}.")
        raw_titles_data = await self.repo.list_distinct_prompt_titles_by_user_id(user_id=user_id)
        # Convert raw dicts to UserPromptTitleInfo model if the model is available and matches structure
        # Assuming UserPromptTitleInfo is defined in models and matches the keys: prompt_title, version_count, last_updated
        return [UserPromptTitleInfo(**data) for data in raw_titles_data]


    async def delete_prompt_version(self, prompt_version_id: int, user_id: str) -> bool:
        """
        Deletes a specific version of a prompt, ensuring it belongs to the user.
        """
        logger.info(f"Service: Deleting prompt version ID {prompt_version_id} for user {user_id}.")
        deleted = await self.repo.delete_prompt_version_by_id(prompt_version_id=prompt_version_id, user_id=user_id)
        if deleted:
            logger.info(f"Service: Prompt version {prompt_version_id} deleted successfully.")
        else:
            logger.warning(f"Service: Prompt version {prompt_version_id} not found or not deleted for user {user_id}.")
        return deleted

    async def delete_prompt_by_title(self, prompt_title: str, user_id: str) -> int:
        """
        Deletes all versions of a prompt associated with a specific title for a user.
        Returns the number of versions deleted.
        """
        logger.info(f"Service: Deleting all versions of prompt '{prompt_title}' for user {user_id}.")
        deleted_count = await self.repo.delete_all_versions_for_prompt_title(prompt_title=prompt_title, user_id=user_id)
        logger.info(f"Service: Deleted {deleted_count} versions for prompt title '{prompt_title}' for user {user_id}.")
        return deleted_count
```
