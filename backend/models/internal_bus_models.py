from pydantic import BaseModel, Field
from typing import Any, Optional, Dict
from datetime import datetime
import uuid

# Represents a standardized message for communication between Tria's internal services/bots.
class InternalMessage(BaseModel):
    message_id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique identifier for the message.")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of message creation (UTC).")
    source_service: str = Field(..., description="Identifier of the originating service or bot (e.g., 'GestureBot', 'CoordinationService').")
    target_service: Optional[str] = Field(None, description="Identifier of the target service or bot if directly addressed (e.g., 'RendererService', 'NetHoloGlyphService').")
    event_type: str = Field(..., description="Type of event or command (e.g., 'HolographicElementUpdate', 'AudioStreamChunk', 'TriaInternalCommand').")
    
    # The payload can be any Pydantic model or a dictionary.
    # Using Dict[str, Any] for flexibility, but specific models are preferred for defined events.
    payload: Dict[str, Any] = Field(..., description="The actual data content of the message.")
    
    # Optional fields for message routing, context, or metadata
    correlation_id: Optional[uuid.UUID] = Field(None, description="ID to correlate related messages, e.g., request-response.")
    user_id: Optional[str] = Field(None, description="Firebase UID of the user associated with this event, if applicable.")
    session_id: Optional[str] = Field(None, description="Session ID associated with this event, if applicable.")
    priority: Optional[int] = Field(default=0, description="Message priority, if applicable.")

    class Config:
        orm_mode = False # Not intended for direct DB mapping, but can be enabled if needed.
        extra = "forbid" # Prevent unexpected fields during parsing.

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
```
