from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from backend.core.models import (
    UserPromptVersionDB, UserPromptVersionCreate
)

logger = logging.getLogger(__name__)

class PromptRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = self.db.get_collection("user_prompt_versions")

    async def create_prompt_version(self, user_id: str, version_number: int, prompt_in: UserPromptVersionCreate) -> Optional[UserPromptVersionDB]:
        now = datetime.utcnow().isoformat()
        prompt_data = {
            "user_id": user_id,
            "prompt_title": prompt_in.prompt_title,
            "prompt_text": prompt_in.prompt_text,
            "version_number": version_number,
            "associated_hologram_id": str(prompt_in.associated_hologram_id) if prompt_in.associated_hologram_id else None,
            "metadata": prompt_in.metadata or {},
            "created_at": now
        }
        try:
            # Note: No strict unique constraint in Astra JSON API unless using _id
            # But we can check before inserting if needed, or just insert and rely on app logic
            result = self.collection.insert_one(prompt_data)
            if result and result.inserted_id:
                prompt_data["id"] = str(result.inserted_id)
                return UserPromptVersionDB(**prompt_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.create_prompt_version for user {user_id}: {e}")
            raise

    async def get_prompt_version_by_id(self, prompt_version_id: str, user_id: str) -> Optional[UserPromptVersionDB]:
        try:
            row = self.collection.find_one({"_id": prompt_version_id, "user_id": user_id})
            if row:
                return UserPromptVersionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.get_prompt_version_by_id for id {prompt_version_id}: {e}")
            raise

    async def get_prompt_version_by_title_and_version(self, prompt_title: str, version: int, user_id: str) -> Optional[UserPromptVersionDB]:
        try:
            row = self.collection.find_one({"prompt_title": prompt_title, "version_number": version, "user_id": user_id})
            if row:
                return UserPromptVersionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.get_prompt_version_by_title_and_version for title '{prompt_title}': {e}")
            raise

    async def get_latest_version_number_for_title(self, prompt_title: str, user_id: str) -> Optional[int]:
        try:
            cursor = self.collection.find(
                filter={"prompt_title": prompt_title, "user_id": user_id},
                sort={"version_number": -1},
                limit=1
            )
            latest = list(cursor)
            if latest:
                return latest[0]["version_number"]
            return None
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.get_latest_version_number_for_title for title '{prompt_title}': {e}")
            raise

    async def get_latest_prompt_version_by_title(self, prompt_title: str, user_id: str) -> Optional[UserPromptVersionDB]:
        try:
            cursor = self.collection.find(
                filter={"prompt_title": prompt_title, "user_id": user_id},
                sort={"version_number": -1},
                limit=1
            )
            latest = list(cursor)
            if latest:
                row = latest[0]
                return UserPromptVersionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.get_latest_prompt_version_by_title for title '{prompt_title}': {e}")
            raise

    async def list_prompt_versions_by_title(self, prompt_title: str, user_id: str, skip: int = 0, limit: int = 100) -> List[UserPromptVersionDB]:
        try:
            cursor = self.collection.find(
                filter={"prompt_title": prompt_title, "user_id": user_id},
                sort={"version_number": -1},
                limit=limit,
                skip=skip
            )
            return [UserPromptVersionDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.list_prompt_versions_by_title for title '{prompt_title}': {e}")
            raise

    async def list_distinct_prompt_titles_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        # Astra JSON API doesn't support GROUP BY directly. 
        # For simplicity, we fetch all and aggregate in memory or keep a separate titles collection.
        # Here we'll do a simple find all and aggregate.
        try:
            cursor = self.collection.find(filter={"user_id": user_id})
            all_versions = list(cursor)
            titles_info = {}
            for v in all_versions:
                title = v["prompt_title"]
                if title not in titles_info:
                    titles_info[title] = {"prompt_title": title, "version_count": 0, "last_updated": v["created_at"]}
                titles_info[title]["version_count"] += 1
                if v["created_at"] > titles_info[title]["last_updated"]:
                    titles_info[title]["last_updated"] = v["created_at"]
            
            # Sort by last_updated descending
            sorted_titles = sorted(titles_info.values(), key=lambda x: x["last_updated"], reverse=True)
            return sorted_titles
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.list_distinct_prompt_titles_by_user_id for user {user_id}: {e}")
            raise

    async def delete_prompt_version_by_id(self, prompt_version_id: str, user_id: str) -> bool:
        try:
            result = self.collection.delete_one({"_id": prompt_version_id, "user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.delete_prompt_version_by_id for id {prompt_version_id}: {e}")
            raise

    async def delete_all_versions_for_prompt_title(self, prompt_title: str, user_id: str) -> int:
        try:
            result = self.collection.delete_many({"prompt_title": prompt_title, "user_id": user_id})
            return result.deleted_count
        except Exception as e:
            logger.error(f"Astra DB error in PromptRepository.delete_all_versions_for_prompt_title for title '{prompt_title}': {e}")
            raise
