from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from uuid import UUID, uuid4
from datetime import datetime

from .base_models import current_time_utc # For default timestamp

class InternalMessage(BaseModel):
    message_id: UUID = Field(default_factory=uuid4, description="Unique identifier for this message.")
    timestamp: datetime = Field(default_factory=current_time_utc, description="Timestamp when the message was created.")
    source_service: str = Field(..., description="Identifier of the service that originated this message (e.g., 'GestureBot', 'FrontendClient', 'NetHoloGlyphService').")
    target_service: Optional[str] = Field(default=None, description="Identifier of the intended recipient service, if specific (e.g., 'CoordinationService', 'MemoryBot'). Can be None for broadcast-like events.")
    event_type: str = Field(..., description="Type of the event or message (e.g., 'new_gesture_chunk_received', 'tria_state_update_request', 'holographic_symbol_render_command').")
    payload: Dict[str, Any] = Field(default_factory=dict, description="The actual data payload of the message. Structure depends on event_type.")
    correlation_id: Optional[str] = Field(default=None, description="Optional ID to correlate related messages, e.g., a request and its subsequent response or a series of events in a flow.")

    class Config:
        orm_mode = True # Although not an ORM model, this can be useful for compatibility
        schema_extra = {
            "examples": [
                {
                    "message_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88",
                    "timestamp": "2024-05-29T16:00:00Z",
                    "source_service": "NetHoloGlyphService",
                    "target_service": "CoordinationService",
                    "event_type": "holographic_symbol_received",
                    "payload": {
                        "symbol_id": "some_symbol_uuid",
                        "type": "sphere",
                        "position": {"x": 1.0, "y": 2.0, "z": 0.5}
                    },
                    "correlation_id": "request_frontend_123"
                }
            ]
        }
