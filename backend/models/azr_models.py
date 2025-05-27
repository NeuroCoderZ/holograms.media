from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import datetime

class AZRTaskBase(BaseModel):
    description_text: str
    status: str = Field("pending", description="e.g., pending, active, evaluating, completed_success, completed_failure, aborted")
    priority: Optional[int] = 0
    complexity_score: Optional[float] = None
    generation_source: Optional[str] = None
    related_bot_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

class AZRTaskCreate(AZRTaskBase):
    pass # Inherits all fields, can add specific creation-time fields if needed

class AZRTask(AZRTaskBase):
    task_id: int
    created_at: datetime.datetime
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None

    class Config:
        orm_mode = True
