from pydantic import Field, BaseModel # BaseModel might be needed for Literal definitions if they are not part of other models
from typing import Any, Dict, List, Optional, Literal # Added Literal
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel, current_time_utc

# Literal types from backend/models/tria_azr_models.py
AZR_TASK_STATUSES = Literal['pending', 'active', 'evaluating', 'completed_success', 'completed_failure', 'aborted']
AZR_SOLUTION_VERIFICATION_STATUSES = Literal['pending', 'unverified', 'verified_success', 'verified_failure', 'verification_failed_to_run', 'passed_sandbox', 'failed_sandbox', 'pending_human_review', 'approved', 'rejected', 'deployed']
# Added 'unverified', 'passed_sandbox', etc. from core model's description to make the Literal more comprehensive.

class TriaAZRTask(BaseUUIDModel):
    description_text: str = Field(..., description="Detailed description of the AZR task.")
    status: AZR_TASK_STATUSES = Field(default="pending", description="Current status of the task.") # Using Literal
    priority: int = Field(default=0, description="Priority of the task.")
    complexity_score: Optional[float] = Field(default=None, description="Estimated complexity of the task.")
    generation_source: str = Field(..., description="Source that generated this task (e.g., LearningBot_AnomalyDetection, UserFeedback_BotX_Performance).")
    related_bot_id: Optional[str] = Field(default=None, description="ID of the bot primarily related to this task, if any.")
    started_at: Optional[datetime] = Field(default=None, description="Timestamp when the task processing started.")
    completed_at: Optional[datetime] = Field(default=None, description="Timestamp when the task was completed or aborted.")
    metadata_json: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata for the task in JSON format.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                    "description_text": "Optimize RAG retrieval for common user queries.",
                    "status": "pending",
                    "priority": 1,
                    "complexity_score": 0.7,
                    "generation_source": "SystemGoal_RAG_Optimization",
                    "related_bot_id": "MemoryBot.py",
                    "created_at": "2024-05-29T10:00:00Z",
                    "updated_at": "2024-05-29T10:00:00Z",
                    "metadata_json": {"target_metric": "RAG_recall@5"}
                }
            ]
        }

class TriaAZRTaskSolution(BaseUUIDModel):
    task_id: UUID = Field(..., description="ID of the AZR task this solution addresses.")
    solution_approach_description: str = Field(..., description="Description of the approach taken for this solution.")
    solution_artifacts_json: Dict[str, Any] = Field(default_factory=dict, description="Artifacts related to the solution (e.g., new parameters, code diff URI).")
    outcome_summary: Optional[str] = Field(default=None, description="Summary of the outcome after applying/testing the solution.")
    performance_metrics_json: Dict[str, Any] = Field(default_factory=dict, description="Performance metrics observed with this solution.")
    verification_status: AZR_SOLUTION_VERIFICATION_STATUSES = Field(default="unverified", description="Status of solution verification.") # Using Literal
    human_reviewer_id: Optional[str] = Field(default=None, description="ID of the human reviewer, if applicable.")
    human_review_timestamp: Optional[datetime] = Field(default=None, description="Timestamp of the human review.")
    
    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
                    "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                    "solution_approach_description": "Adjusted embedding model parameters for broader semantic matching.",
                    "verification_status": "pending_human_review",
                    "created_at": "2024-05-29T11:00:00Z",
                    "updated_at": "2024-05-29T11:00:00Z",
                }
            ]
        }

# TriaLearningLogEntry from original core file. Note that a more comprehensive
# TriaLearningLogModel exists in learning_log_models.py
class TriaLearningLogEntry(BaseUUIDModel):
    event_type: str = Field(..., description="Type of the learning event (e.g., parameter_tune_proposed, azr_task_generated, user_feedback_processed).")
    bot_affected_id: Optional[str] = Field(default=None, description="ID of the bot affected by this learning event, if any.")
    summary_text: str = Field(..., description="A concise summary of the learning event.")
    details_json: Dict[str, Any] = Field(default_factory=dict, description="Detailed information about the event in JSON format.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
                    "event_type": "user_feedback_processed",
                    "summary_text": "Processed user feedback for interaction X, suggesting gesture misinterpretation.",
                    "details_json": {"interaction_id": "interaction_X_id", "feedback_type": "gesture_correction"},
                    "created_at": "2024-05-29T12:00:00Z",
                    "updated_at": "2024-05-29T12:00:00Z",
                }
            ]
        }

class TriaBotConfiguration(BaseUUIDModel):
    bot_id: str = Field(..., description="Identifier for the bot this configuration applies to (e.g., GestureBot.py, MemoryBot.py).")
    version: int = Field(default=1, description="Version number of this configuration for the specific bot.")
    config_parameters_json: Dict[str, Any] = Field(..., description="The actual configuration parameters for the bot.")
    description: str = Field(..., description="Description of this configuration and its purpose or changes.")
    created_by: str = Field(..., description="Entity that created this configuration (e.g., LearningBot_AZR_Cycle_XYZ, HumanDeveloper_Admin).")
    is_active: bool = Field(default=False, description="Whether this configuration is currently active for the bot.")
    previous_config_id: Optional[UUID] = Field(default=None, description="ID of the configuration this one was derived from, for rollback purposes.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
                    "bot_id": "MemoryBot.py",
                    "version": 2,
                    "config_parameters_json": {"embedding_threshold": 0.75, "max_retrieved_docs": 5},
                    "description": "Increased embedding threshold for higher precision.",
                    "created_by": "LearningBot_AZR_Cycle_123",
                    "is_active": True,
                    "created_at": "2024-05-29T13:00:00Z",
                    "updated_at": "2024-05-29T13:00:00Z",
                }
            ]
        }
