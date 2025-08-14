from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel, current_time_utc # Assuming BaseUUIDModel provides id, created_at, updated_at

class Vector3Model(BaseModel): # Kept from original core
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class QuaternionModel(BaseModel): # Kept from original core
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0 # Default to no rotation

class HolographicSymbolModel(BaseUUIDModel): # Kept from original core
    symbol_id_str: str = Field(..., description="A human-readable or context-specific ID for the symbol, if different from the UUID 'id'.")
    type: str = Field(..., description="Type of the holographic symbol (e.g., 'cube', 'sphere', 'text_label', 'custom_model_uri').")
    position: Vector3Model = Field(default_factory=Vector3Model)
    orientation: QuaternionModel = Field(default_factory=QuaternionModel)
    scale: Vector3Model = Field(default_factory=lambda: Vector3Model(x=1.0, y=1.0, z=1.0))
    material_properties_json: Optional[Dict[str, Any]] = Field(default=None, description="JSON string or dict for material properties like color, texture URI, shininess etc.")
    custom_data_json: Optional[Dict[str, Any]] = Field(default=None, description="Any other application-specific data for this symbol.")
    code_language: Optional[str] = Field(default=None, description="Language of associated code, if this symbol represents code ('liquid code').")
    embedding_model_version: Optional[str] = Field(default=None, description="Version of the embedding model used, if applicable.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
                    "symbol_id_str": "main_logo_sphere",
                    "type": "sphere",
                    "position": {"x": 0, "y": 1.5, "z": -2.0},
                    "orientation": {"x": 0, "y": 0, "z": 0, "w": 1},
                    "scale": {"x": 0.5, "y": 0.5, "z": 0.5},
                    "material_properties_json": {"color": "#FF0000", "opacity": 0.8},
                    "created_at": "2024-05-29T10:00:00Z",
                    "updated_at": "2024-05-29T10:00:00Z"
                }
            ]
        }

# Enhanced ThreeDEmojiModel: Based on core's BaseUUIDModel inheritance and Vector3Model/QuaternionModel usage,
# but with richer fields from backend/models/hologlyph_models.py's ThreeDEmojiModel
class ThreeDEmojiModel(BaseUUIDModel):
    # emoji_id_str from core's ThreeDEmojiModel, type from models' ThreeDEmojiModel
    emoji_id_str: str = Field(..., description="Unique ID for this instance of the emoji (maps to 'emoji_id' from backend/models version).")
    type: str = Field(..., description="Type of emoji (e.g., 'smile', 'thumbs_up', 'heart').") # From backend/models

    position: Vector3Model = Field(default_factory=Vector3Model) # Consistent with core
    orientation: QuaternionModel = Field(default_factory=QuaternionModel) # Consistent with core

    color_hex: Optional[str] = Field(None, description="Dominant color in hex (e.g., '#FFD700').") # From backend/models

    # Using a single float for uniform scale, as in backend/models version.
    # If non-uniform scale is needed later, this could be changed to Vector3Model.
    scale: float = Field(1.0, description="Uniform scale factor.") # From backend/models

    animation_type: Optional[str] = Field(None, description="E.g., 'NONE', 'PULSE', 'SPIN_Y', 'BOUNCE'.") # From backend/models
    animation_speed: Optional[float] = Field(default=1.0) # From core, also in backend/models

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
                    "emoji_id_str": "smile_instance_007",
                    "type": "smile_beam",
                    "position": {"x":1.0, "y":0.5, "z":-2.0},
                    "orientation": {"x":0, "y":0, "z":0, "w":1},
                    "color_hex": "#FFFF00",
                    "scale": 1.5,
                    "animation_type": "PULSE",
                    "animation_speed": 0.5,
                    "created_at": "2024-05-30T10:00:00Z",
                    "updated_at": "2024-05-30T10:00:00Z"
                }
            ]
        }


class AudioVisualizationStateModel(BaseUUIDModel): # Kept from original core
    stream_id: str = Field(..., description="Identifier for the audio stream being visualized.")
    frequency_bands_json: Optional[List[float]] = Field(default=None, description="Data representing audio frequency bands.")
    overall_intensity: Optional[float] = Field(default=0.0)
    pass

    class Config:
        orm_mode = True

class TriaStateUpdateModel(BaseUUIDModel): # Kept from original core
    state_key: str = Field(..., description="Key identifying the part of Tria's state being updated (e.g., 'current_mood', 'active_task_id').")
    state_value_json: Dict[str, Any] = Field(..., description="The value of the state, can be complex.")
    bot_id: Optional[str] = Field(default=None, description="ID of the bot whose state is being updated, if applicable.")
    pass

    class Config:
        orm_mode = True
