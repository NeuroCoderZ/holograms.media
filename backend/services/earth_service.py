from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from backend.repositories.earth_repository import EarthRepository
from backend.core.models.earth_models import (
    EarthNodeDB, EarthNodeCreate, EarthNodeUpdate, EarthScene
)

logger = logging.getLogger(__name__)

class EarthService:
    def __init__(self, db):
        self.repo = EarthRepository(db)

    async def get_scene(self, earth_id: str) -> Optional[EarthScene]:
        nodes = await self.repo.get_nodes_by_earth(earth_id, limit=1)
        latest = nodes[0] if nodes else None
        return EarthScene(
            earth_id=earth_id,
            node_count=len(await self.repo.get_nodes_by_earth(earth_id, limit=0)),
            updated_at=latest.updated_at if latest else datetime.utcnow()
        )

    async def get_nodes(self, earth_id: str, skip: int = 0, limit: int = 200) -> List[EarthNodeDB]:
        return await self.repo.get_nodes_by_earth(earth_id, skip, limit)

    async def get_node(self, node_id: str, earth_id: str) -> Optional[EarthNodeDB]:
        return await self.repo.get_node_by_id(node_id, earth_id)

    async def create_node(self, earth_id: str, owner: str, node_in: EarthNodeCreate) -> Optional[EarthNodeDB]:
        return await self.repo.create_node(earth_id, owner, node_in)

    async def update_node(self, node_id: str, earth_id: str, owner: str, update: EarthNodeUpdate) -> Optional[EarthNodeDB]:
        return await self.repo.update_node(node_id, earth_id, owner, update)

    async def delete_node(self, node_id: str, earth_id: str, owner: str) -> bool:
        return await self.repo.delete_node(node_id, earth_id, owner)

    async def share_nodes(self, node_ids: List[str], source_earth: str, target_earth: str, owner: str) -> int:
        return await self.repo.share_nodes(node_ids, source_earth, target_earth, owner)

    async def get_shared(self, earth_id: str) -> List[EarthNodeDB]:
        return await self.repo.get_shared_nodes(earth_id)

    async def import_shared(self, target_earth: str, node_ids: List[str]) -> List[EarthNodeDB]:
        imported = []
        for nid in node_ids:
            row = await self.repo.get_node_by_id(nid, None)
            if row and target_earth in row.shared_with:
                create = EarthNodeCreate(
                    type=row.type,
                    position=row.position,
                    rotation=row.rotation,
                    scale=row.scale,
                    visual=row.visual,
                    audio=row.audio,
                    geometry=row.geometry,
                    gesture_dna=row.gesture_dna,
                    tags=row.tags
                )
                created = await self.repo.create_node(target_earth, row.owner, create)
                if created:
                    imported.append(created)
        return imported

    async def apply_remote_patch(self, earth_id: str, patches: List[Dict[str, Any]]) -> int:
        return await self.repo.bulk_upsert(patches)
