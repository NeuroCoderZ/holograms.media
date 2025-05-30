from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class TriaLearningLogModel(BaseModel):
    """
    Pydantic model for Tria's learning log entries.
    Corresponds to the 'tria_learning_log' table in the database.
    """
    log_id: int = Field(..., description="Unique identifier for the log entry (auto-incrementing).")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of when the log event occurred (UTC).")
    event_type: str = Field(..., description="Type of event being logged (e.g., 'model_retrained', 'feedback_received', 'error_encountered').")
    bot_affected_id: Optional[str] = Field(default=None, description="Identifier of the Tria bot or component affected by the event, if applicable.")
    summary_text: Optional[str] = Field(default=None, description="A brief summary of the learning event.")
    details_json: Optional[Dict[str, Any]] = Field(default=None, description="Detailed information about the event, stored as JSON.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "log_id": 1,
                    "timestamp": "2024-06-15T10:30:00Z",
                    "event_type": "user_feedback_positive",
                    "bot_affected_id": "tria_text_to_speech_module_v2",
                    "summary_text": "User rated TTS quality as 5/5 for a given interaction.",
                    "details_json": {
                        "user_id": "user_xyz_123",
                        "interaction_id": "interaction_abc_789",
                        "rating": 5,
                        "comment": "The voice was very clear and natural."
                    }
                },
                {
                    "log_id": 2,
                    "timestamp": "2024-06-15T11:00:00Z",
                    "event_type": "system_error_handled",
                    "bot_affected_id": "tria_intent_parser_v1.2",
                    "summary_text": "Handled an unexpected null value during intent parsing.",
                    "details_json": {
                        "error_type": "NullPointerException",
                        "input_data_sample": "User said: '...' (truncated)",
                        "action_taken": "Returned default intent 'unknown_intent'"
                    }
                }
            ]
        }
