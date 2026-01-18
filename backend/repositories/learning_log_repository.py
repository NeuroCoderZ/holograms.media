from astrapy import Database
from typing import Optional
import logging
from datetime import datetime
from backend.core.models.tria_learning_models import TriaLearningLogCreate, TriaLearningLogModel

logger = logging.getLogger(__name__)

class LearningLogRepository:
    def __init__(self, db: Database):
        self.db = db
        self.collection = self.db.get_collection("tria_learning_logs")

    async def create_log_entry(self, log_create: TriaLearningLogCreate) -> Optional[TriaLearningLogModel]:
        data = log_create.dict()
        data["timestamp"] = datetime.utcnow().isoformat()
        
        try:
            result = self.collection.insert_one(data)
            if result and result.inserted_id:
                data["id"] = str(result.inserted_id)
                return TriaLearningLogModel(**data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in LearningLogRepository.create_log_entry: {e}")
            raise
