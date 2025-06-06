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

    # Fields added from backend/models/internal_bus_models.py
    user_id: Optional[str] = Field(None, description="Firebase UID of the user associated with this event, if applicable.")
    session_id: Optional[str] = Field(None, description="Session ID associated with this event, if applicable.")
    priority: Optional[int] = Field(default=0, description="Message priority, if applicable.")

    class Config:
        orm_mode = True # Kept from core version
        extra = "forbid" # Added from models version
        schema_extra = { # Kept from core version
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
                    "correlation_id": "request_frontend_123",
                    "user_id": "user_firebase_uid_example",
                    "session_id": "session_example_123",
                    "priority": 1
                }
            ]
        }

# Example comment from backend/models/internal_bus_models.py (retained for context)
# Example of a specific payload type (optional, for better type hinting and validation)
# class HolographicElementUpdatePayload(BaseModel):
#     element_id: str
#     changes: Dict[str, Any]

# Example of how to use a specific payload with InternalMessage:
# update_payload = HolographicElementUpdatePayload(element_id="cube1", changes={"color": "red"})
# internal_msg = InternalMessage(
#     source_service="UIManager",
#     target_service="RendererService",
#     event_type="HolographicElementUpdate",
#     payload=update_payload.model_dump() # Pydantic v2
#     # payload=update_payload.dict() # Pydantic v1
# )
