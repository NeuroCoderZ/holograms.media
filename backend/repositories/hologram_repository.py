from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from backend.core.models.hologram_models import UserHologramDB, UserHologramCreate

logger = logging.getLogger(__name__)

class HologramRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = self.db.get_collection("user_holograms")

    async def get_holograms_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserHologramDB]:
        try:
            cursor = self.collection.find(
                filter={"user_id": user_id},
                sort={"created_at": -1},
                limit=limit,
                skip=skip
            )
            return [UserHologramDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"Astra DB error in HologramRepository.get_holograms_by_user_id for user {user_id}: {e}")
            raise

    async def create_hologram(self, user_id: str, hologram_in: UserHologramCreate) -> Optional[UserHologramDB]:
        now = datetime.utcnow().isoformat()
        hologram_data = hologram_in.dict()
        hologram_data["user_id"] = user_id
        hologram_data["created_at"] = now
        hologram_data["updated_at"] = now
        
        try:
            # Check for name uniqueness for user if needed, or rely on app logic
            # Astra JSON API won't enforce unique constraint on non-id fields easily without extra logic
            existing = self.collection.find_one({"user_id": user_id, "hologram_name": hologram_data["hologram_name"]})
            if existing:
                logger.warning(f"Hologram with name '{hologram_data['hologram_name']}' already exists for user {user_id}.")
                return None

            result = self.collection.insert_one(hologram_data)
            if result and result.inserted_id:
                hologram_data["id"] = str(result.inserted_id)
                return UserHologramDB(**hologram_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in HologramRepository.create_hologram for user {user_id}: {e}")
            raise

    async def get_hologram_by_id(self, hologram_id: str, user_id: str) -> Optional[UserHologramDB]:
        try:
            row = self.collection.find_one({"_id": hologram_id, "user_id": user_id})
            if row:
                return UserHologramDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in HologramRepository.get_hologram_by_id for id {hologram_id}: {e}")
            raise

    async def update_hologram(self, hologram_id: str, user_id: str, hologram_update_data: Dict[str, Any]) -> Optional[UserHologramDB]:
        now = datetime.utcnow().isoformat()
        hologram_update_data["updated_at"] = now
        try:
             # Check for name conflict if name is being updated
            if "hologram_name" in hologram_update_data:
                existing = self.collection.find_one({
                    "user_id": user_id, 
                    "hologram_name": hologram_update_data["hologram_name"],
                    "_id": {"$ne": hologram_id}
                })
                if existing:
                    logger.warning(f"Hologram name '{hologram_update_data['hologram_name']}' conflict for user {user_id}.")
                    return None

            result = self.collection.update_one(
                {"_id": hologram_id, "user_id": user_id},
                {"$set": hologram_update_data}
            )
            
            if result.modified_count > 0 or result.matched_count > 0:
                 return await self.get_hologram_by_id(hologram_id, user_id)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in HologramRepository.update_hologram for id {hologram_id}: {e}")
            raise

    async def delete_hologram(self, hologram_id: str, user_id: str) -> bool:
        try:
            result = self.collection.delete_one({"_id": hologram_id, "user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Astra DB error in HologramRepository.delete_hologram for id {hologram_id}: {e}")
            raise