# File: backend/models/internal_bus_models.py
# Purpose: Defines Pydantic models for Tria's internal message bus.
# Future Scaffolding for: NetHoloGlyph Protocol integration.

import uuid
import time
from pydantic import BaseModel, Field
from typing import Any, Optional

class InternalMessage(BaseModel):
    """
    Represents a standardized message for communication between Tria's internal services/bots.
    This allows for a decoupled architecture where internal communication is distinct
    from external wire formats (like NetHoloGlyph).
    """
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique identifier for the message.")
    timestamp: float = Field(default_factory=time.time, description="Timestamp of message creation (epoch seconds).")
    source_service: str = Field(..., description="Identifier of the originating service or bot (e.g., 'GestureBot', 'CoordinationService').")
    target_service: Optional[str] = Field(None, description="Identifier of the target service or bot if directly addressed (e.g., 'RendererService', 'NetHoloGlyphService').")
    event_type: str = Field(..., description="Type of event or command (e.g., 'HolographicElementUpdate', 'AudioStreamChunk', 'TriaInternalCommand').")
    payload: Any = Field(..., description="The actual data content of the message.")

    class Config:
        orm_mode = True # To allow usage with ORMs if needed in future, though primarily for internal messaging.
        extra = "forbid" # Prevent unexpected fields

# Example usage (for illustration, not to be included in the file itself unless for testing):
# if __name__ == "__main__":
#     msg = InternalMessage(
#         source_service="AudioBot",
#         event_type="AudioChunkProcessed",
#         payload={"chunk_id": "12345", "duration_ms": 1500, "features": [0.1, 0.2]}
#     )
#     print(msg.json(indent=2))
