from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import datetime

class LearningLogEntryBase(BaseModel):
    event_type: str
    bot_affected_id: Optional[str] = None
    summary_text: str
    details_json: Optional[Dict[str, Any]] = None

class LearningLogEntryCreate(LearningLogEntryBase):
    pass

class LearningLogEntry(LearningLogEntryBase):
    log_id: int
    timestamp: datetime.datetime

    class Config:
        orm_mode = True
