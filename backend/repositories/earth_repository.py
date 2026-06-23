from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from backend.core.models.earth_models import EarthNodeDB, EarthNodeCreate, EarthNodeUpdate

logger = logging.getLogger(__name__)

COLLECTION_NAME = "earth_nodes"

class EarthRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = db.get_collection(COLLECTION_NAME)

    async def get_nodes_by_earth(self, earth_id: str, skip: int = 0, limit: int = 200) -> List[EarthNodeDB]:
        try:
            cursor = self.collection.find(
                filter={"earth_id": earth_id},
                sort={"created_at": -1},
                limit=limit,
                skip=skip
            )
            return [EarthNodeDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"EarthRepo.get_nodes_by_earth({earth_id}): {e}")
            raise

    async def get_node_by_id(self, node_id: str, earth_id: str) -> Optional[EarthNodeDB]:
        try:
            row = self.collection.find_one({"_id": node_id, "earth_id": earth_id})
            if row:
                return EarthNodeDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"EarthRepo.get_node_by_id({node_id}): {e}")
            raise

    async def create_node(self, earth_id: str, owner: str, node_in: EarthNodeCreate) -> Optional[EarthNodeDB]:
        now = datetime.utcnow().isoformat()
        data = node_in.dict()
        data["earth_id"] = earth_id
        data["owner"] = owner
        data["shared_with"] = []
        data["version"] = 1
        data["created_at"] = now
        data["updated_at"] = now
        try:
            result = self.collection.insert_one(data)
            if result and result.inserted_id:
                data["id"] = str(result.inserted_id)
                return EarthNodeDB(**data)
            return None
        except Exception as e:
            logger.error(f"EarthRepo.create_node({earth_id}): {e}")
            raise

    async def update_node(self, node_id: str, earth_id: str, owner: str, update: EarthNodeUpdate) -> Optional[EarthNodeDB]:
        now = datetime.utcnow().isoformat()
        update_data = update.dict(exclude_unset=True)
        if not update_data:
            return await self.get_node_by_id(node_id, earth_id)
        update_data["updated_at"] = now
        try:
            result = self.collection.update_one(
                {"_id": node_id, "earth_id": earth_id, "owner": owner},
                {"$set": update_data, "$inc": {"version": 1}}
            )
            if result.modified_count > 0 or result.matched_count > 0:
                return await self.get_node_by_id(node_id, earth_id)
            return None
        except Exception as e:
            logger.error(f"EarthRepo.update_node({node_id}): {e}")
            raise

    async def delete_node(self, node_id: str, earth_id: str, owner: str) -> bool:
        try:
            result = self.collection.delete_one({"_id": node_id, "earth_id": earth_id, "owner": owner})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"EarthRepo.delete_node({node_id}): {e}")
            raise

    async def share_nodes(self, node_ids: List[str], source_earth: str, target_earth: str, owner: str) -> int:
        shared = 0
        for nid in node_ids:
            try:
                result = self.collection.update_one(
                    {"_id": nid, "earth_id": source_earth, "owner": owner},
                    {"$addToSet": {"shared_with": target_earth}}
                )
                if result.modified_count > 0:
                    shared += 1
            except Exception as e:
                logger.error(f"EarthRepo.share_nodes({nid}): {e}")
        return shared

    async def get_shared_nodes(self, earth_id: str, skip: int = 0, limit: int = 200) -> List[EarthNodeDB]:
        try:
            cursor = self.collection.find(
                filter={"shared_with": earth_id},
                sort={"updated_at": -1},
                limit=limit,
                skip=skip
            )
            return [EarthNodeDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"EarthRepo.get_shared_nodes({earth_id}): {e}")
            raise

    async def bulk_upsert(self, nodes: List[Dict[str, Any]]) -> int:
        count = 0
        for node in nodes:
            try:
                node_id = node.pop("_id", None)
                if node_id:
                    result = self.collection.update_one(
                        {"_id": node_id, "earth_id": node.get("earth_id")},
                        {"$set": node}
                    )
                    if result.modified_count > 0 or result.matched_count > 0:
                        count += 1
                else:
                    result = self.collection.insert_one(node)
                    if result and result.inserted_id:
                        count += 1
            except Exception as e:
                logger.error(f"EarthRepo.bulk_upsert: {e}")
        return count
