from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from backend.core.models.gesture_models import UserGestureDefinitionDB, UserGestureDefinitionCreate

logger = logging.getLogger(__name__)

class GestureRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = self.db.get_collection("user_gestures")

    async def get_gestures_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserGestureDefinitionDB]:
        try:
            cursor = self.collection.find(
                filter={"user_id": user_id},
                sort={"created_at": -1}, # Assuming created_at exists
                limit=limit,
                skip=skip
            )
            return [UserGestureDefinitionDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"Astra DB error in GestureRepository.get_gestures_by_user_id for user {user_id}: {e}")
            raise

    async def create_gesture(self, user_id: str, gesture_in: UserGestureDefinitionCreate) -> Optional[UserGestureDefinitionDB]:
        now = datetime.utcnow().isoformat()
        gesture_data = gesture_in.dict()
        gesture_data["user_id"] = user_id
        gesture_data["created_at"] = now
        gesture_data["updated_at"] = now
        
        try:
            existing = self.collection.find_one({"user_id": user_id, "gesture_name": gesture_data["gesture_name"]})
            if existing:
                logger.warning(f"Gesture with name '{gesture_data['gesture_name']}' already exists for user {user_id}.")
                return None

            result = self.collection.insert_one(gesture_data)
            if result and result.inserted_id:
                gesture_data["id"] = str(result.inserted_id)
                return UserGestureDefinitionDB(**gesture_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in GestureRepository.create_gesture for user {user_id}: {e}")
            raise

    async def get_gesture_by_id(self, gesture_id: str, user_id: str) -> Optional[UserGestureDefinitionDB]:
        try:
            row = self.collection.find_one({"_id": gesture_id, "user_id": user_id})
            if row:
                return UserGestureDefinitionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in GestureRepository.get_gesture_by_id for id {gesture_id}: {e}")
            raise

    async def update_gesture(self, gesture_id: str, user_id: str, gesture_update_data: Dict[str, Any]) -> Optional[UserGestureDefinitionDB]:
        now = datetime.utcnow().isoformat()
        gesture_update_data["updated_at"] = now
        try:
             # Check for name conflict
            if "gesture_name" in gesture_update_data:
                existing = self.collection.find_one({
                    "user_id": user_id, 
                    "gesture_name": gesture_update_data["gesture_name"],
                    "_id": {"$ne": gesture_id}
                })
                if existing:
                    logger.warning(f"Gesture name '{gesture_update_data['gesture_name']}' conflict for user {user_id}.")
                    return None

            result = self.collection.update_one(
                {"_id": gesture_id, "user_id": user_id},
                {"$set": gesture_update_data}
            )
            
            if result.modified_count > 0 or result.matched_count > 0:
                 return await self.get_gesture_by_id(gesture_id, user_id)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in GestureRepository.update_gesture for id {gesture_id}: {e}")
            raise

    async def delete_gesture(self, gesture_id: str, user_id: str) -> bool:
        try:
            result = self.collection.delete_one({"_id": gesture_id, "user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Astra DB error in GestureRepository.delete_gesture for id {gesture_id}: {e}")
            raise