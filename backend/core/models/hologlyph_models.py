from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base_models import BaseUUIDModel, current_time_utc # Assuming BaseUUIDModel provides id, created_at, updated_at

class Vector3Model(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class QuaternionModel(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0 # Default to no rotation

class HolographicSymbolModel(BaseUUIDModel): # Inherits id, created_at, updated_at
    symbol_id_str: str = Field(..., description="A human-readable or context-specific ID for the symbol, if different from the UUID 'id'.")
    type: str = Field(..., description="Type of the holographic symbol (e.g., 'cube', 'sphere', 'text_label', 'custom_model_uri').")
    position: Vector3Model = Field(default_factory=Vector3Model)
    orientation: QuaternionModel = Field(default_factory=QuaternionModel)
    scale: Vector3Model = Field(default_factory=lambda: Vector3Model(x=1.0, y=1.0, z=1.0))
    material_properties_json: Optional[Dict[str, Any]] = Field(default=None, description="JSON string or dict for material properties like color, texture URI, shininess etc.")
    custom_data_json: Optional[Dict[str, Any]] = Field(default=None, description="Any other application-specific data for this symbol.")
    # last_updated is inherited from BaseUUIDModel as 'updated_at'
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

# Stubs for other models mentioned in DRSB for this file
class ThreeDEmojiModel(BaseUUIDModel):
    emoji_id_str: str = Field(..., description="Identifier for the 3D emoji type.")
    position: Vector3Model = Field(default_factory=Vector3Model)
    orientation: QuaternionModel = Field(default_factory=QuaternionModel)
    animation_speed: Optional[float] = Field(default=1.0)
    # Add other relevant fields
    pass

    class Config:
        orm_mode = True

class AudioVisualizationStateModel(BaseUUIDModel):
    stream_id: str = Field(..., description="Identifier for the audio stream being visualized.")
    frequency_bands_json: Optional[List[float]] = Field(default=None, description="Data representing audio frequency bands.")
    overall_intensity: Optional[float] = Field(default=0.0)
    # Add other relevant fields
    pass

    class Config:
        orm_mode = True

class TriaStateUpdateModel(BaseUUIDModel):
    state_key: str = Field(..., description="Key identifying the part of Tria's state being updated (e.g., 'current_mood', 'active_task_id').")
    state_value_json: Dict[str, Any] = Field(..., description="The value of the state, can be complex.")
    bot_id: Optional[str] = Field(default=None, description="ID of the bot whose state is being updated, if applicable.")
    # Add other relevant fields
    pass

    class Config:
        orm_mode = True
