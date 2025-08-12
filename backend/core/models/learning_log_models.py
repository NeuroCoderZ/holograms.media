from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class TriaLearningLogModel(BaseModel):
    """
    Pydantic model for Tria's learning log entries.
    Corresponds to the 'tria_learning_log' table in the database.
    """
    log_id: Optional[int] = Field(default=None, description="Unique identifier for the log entry (auto-incrementing).") # Made optional
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of when the log event occurred (UTC).")
    user_id: Optional[str] = Field(default=None, description="ID of the user associated with this log event, references users table.") # Added from schema
    session_id: Optional[str] = Field(default=None, description="ID of the chat session associated with this log event.") # Added from schema, using str for UUID
    event_type: str = Field(..., description="Type of event being logged (e.g., 'model_retrained', 'feedback_received', 'error_encountered').")
    bot_affected_id: Optional[str] = Field(default=None, description="Identifier of the Tria bot or component affected by the event, if applicable.")
    summary_text: Optional[str] = Field(default=None, description="A brief summary of the learning event.")
    prompt_text: Optional[str] = Field(default=None, description="Full text of the prompt given by the user or system.") # Added from schema
    tria_response_text: Optional[str] = Field(default=None, description="Full text of Tria's response.") # Added from schema
    model_used: Optional[str] = Field(default=None, description="Identifier for the specific AI/ML model used for the response.") # Added from schema
    feedback_score: Optional[int] = Field(default=None, description="Optional user-provided feedback score.") # Added from schema
    custom_data: Optional[Dict[str, Any]] = Field(default=None, description="Flexible JSONB field for any additional structured data relevant to the log entry.") # Renamed from details_json

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "log_id": 1,
                    "timestamp": "2024-06-15T10:30:00Z",
                    "user_id": "user_xyz_123",
                    "session_id": "session_abc_789",
                    "event_type": "user_feedback_positive",
                    "bot_affected_id": "tria_text_to_speech_module_v2",
                    "summary_text": "User rated TTS quality as 5/5 for a given interaction.",
                    "prompt_text": "Original prompt from user.",
                    "tria_response_text": "Tria's generated response.",
                    "model_used": "gpt-4-turbo",
                    "feedback_score": 5,
                    "custom_data": {
                        "interaction_id": "interaction_abc_789",
                        "rating": 5,
                        "comment": "The voice was very clear and natural."
                    }
                },
                {
                    "log_id": None, # Example of creating without log_id
                    "timestamp": "2024-06-15T11:00:00Z",
                    "user_id": "user_def_456",
                    "session_id": None,
                    "event_type": "system_error_handled",
                    "bot_affected_id": "tria_intent_parser_v1.2",
                    "summary_text": "Handled an unexpected null value during intent parsing.",
                    "prompt_text": "User input for error case.",
                    "tria_response_text": "Error message from bot.",
                    "model_used": None,
                    "feedback_score": None,
                    "custom_data": {
                        "error_type": "NullPointerException",
                        "input_data_sample": "User said: '...' (truncated)",
                        "action_taken": "Returned default intent 'unknown_intent'"
                    }
                }
            ]
        }
