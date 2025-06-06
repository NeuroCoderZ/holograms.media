from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- TriaAZRTask Models ---
class TriaAZRTaskBase(BaseModel):
    description_text: str
    status: str = Field(default='pending', pattern="^(pending|active|evaluating|completed_success|completed_failure|aborted)$")
    priority: int = 0
    complexity_score: Optional[float] = None
    generation_source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class TriaAZRTaskCreate(TriaAZRTaskBase):
    pass

class TriaAZRTaskDB(TriaAZRTaskBase):
    task_id: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- TriaAZRTaskSolution Models ---
class TriaAZRTaskSolutionBase(BaseModel):
    task_id: int # Foreign Key to TriaAZRTask
    solution_approach_description: Optional[str] = None
    solution_artifacts_json: Optional[Dict[str, Any]] = None
    outcome_summary: Optional[str] = None
    performance_metrics_json: Optional[Dict[str, Any]] = None
    verification_status: str = Field(default='pending', pattern="^(pending|verified_success|verified_failure|verification_failed_to_run)$")

class TriaAZRTaskSolutionCreate(TriaAZRTaskSolutionBase):
    pass

class TriaAZRTaskSolutionDB(TriaAZRTaskSolutionBase):
    solution_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- TriaLearningLog Models ---
class TriaLearningLogBase(BaseModel):
    event_type: str
    bot_affected_id: Optional[str] = None
    summary_text: str
    details_json: Optional[Dict[str, Any]] = None

class TriaLearningLogCreate(TriaLearningLogBase):
    pass

class TriaLearningLogDB(TriaLearningLogBase):
    log_id: int
    timestamp: datetime # Defaulted in DB

    class Config:
        from_attributes = True

# --- TriaBotConfiguration Models ---
class TriaBotConfigurationBase(BaseModel):
    current_version: int = 1
    config_parameters_json: Dict[str, Any]
    last_updated_by: str = 'system'
    notes: Optional[str] = None

class TriaBotConfigurationCreate(TriaBotConfigurationBase):
    bot_id: str = Field(..., max_length=255) # PK, required on creation

class TriaBotConfigurationDB(TriaBotConfigurationBase):
    config_id: int # Auto-incrementing PK
    bot_id: str = Field(..., max_length=255) # Should be unique
    updated_at: datetime # Defaulted in DB

    class Config:
        from_attributes = True

# Model for the custom response of distinct prompt titles
class UserPromptTitleInfo(BaseModel):
    prompt_title: str
    version_count: int
    last_updated: datetime

    class Config:
        from_attributes = True
```
