# File: backend/models/hologlyph_models.py
# Purpose: Defines Pydantic models that mirror structures in NetHoloGlyph protocol definitions.
# Future Scaffolding for: NetHoloGlyph Protocol integration.

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Basic geometric types from definitions.proto
class Vector3(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class Quaternion(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0 # Typically identity quaternion

# Example mirroring nethologlyph.protocol.definitions.proto ThreeDEmoji
class ThreeDEmojiModel(BaseModel):
    emoji_id: str = Field(..., description="Unique ID for this instance of the emoji.")
    type: str = Field(..., description="Type of emoji (e.g., 'smile', 'thumbs_up', 'heart').")
    position: Vector3 = Field(default_factory=Vector3)
    orientation: Quaternion = Field(default_factory=Quaternion)
    color_hex: Optional[str] = Field(None, description="Dominant color in hex (e.g., '#FFD700').")
    scale: float = Field(1.0, description="Uniform scale factor.")
    
    # Mirrored from enum AnimationType in .proto
    # Using Optional[str] for simplicity here, could be an Enum class
    animation_type: Optional[str] = Field(None, description="E.g., 'NONE', 'PULSE', 'SPIN_Y', 'BOUNCE'.")
    animation_speed: float = Field(1.0, description="Speed of the animation.")

# Placeholder for a more generic HolographicSymbol
class HolographicSymbolModel(BaseModel):
    symbol_id: str = Field(..., description="Unique identifier for the holographic symbol.")
    timestamp_ms: int = Field(..., description="Timestamp in milliseconds.")
    # This would be greatly expanded based on the actual definition in definitions.proto
    # e.g., geometry_data_ref: Optional[str] = None
    # e.g., material_properties: Optional[Dict[str, Any]] = None
    # For now, a generic payload
    data_payload: Dict[str, Any] = Field(default_factory=dict, description="Generic data payload for the symbol.")

# Example usage (for illustration):
# if __name__ == "__main__":
#     emoji = ThreeDEmojiModel(
#         emoji_id="emoji_instance_001",
#         type="smile_beam",
#         position=Vector3(x=1.0, y=0.5, z=-2.0),
#         color_hex="#FFFF00",
#         animation_type="PULSE"
#     )
#     print(emoji.json(indent=2))

#     holo_sym = HolographicSymbolModel(
#         symbol_id="sym_abc_123",
#         timestamp_ms=1678886400000,
#         data_payload={"shape": "cube", "size": 0.5, "color": "blue"}
#     )
#     print(holo_sym.json(indent=2))
