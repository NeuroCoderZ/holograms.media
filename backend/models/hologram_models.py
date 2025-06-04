from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Basic geometric types
class Vector3Model(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class QuaternionModel(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0

# Models for Holographic Scene Elements
class HolographicElementBase(BaseModel):
    element_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    position: Vector3Model = Field(default_factory=Vector3Model)
    rotation: QuaternionModel = Field(default_factory=QuaternionModel)
    scale: Vector3Model = Field(default_factory=lambda: Vector3Model(x=1.0, y=1.0, z=1.0))
    opacity: float = Field(default=1.0, ge=0.0, le=1.0)
    visible: bool = True
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class HolographicSymbolModel(HolographicElementBase):
    symbol_type: str = Field(..., description="e.g., 'cube', 'sphere', 'text', 'custom_glyph_id'")
    color: Optional[List[float]] = Field(default_factory=lambda: [1.0, 1.0, 1.0, 1.0]) # RGBA
    text_content: Optional[str] = None # For text symbols
    # Add other symbol-specific properties as needed

class ThreeDEmojiModel(HolographicElementBase):
    emoji_id: str = Field(..., description="Identifier for the 3D emoji model (e.g., 'smile', 'thumbs_up')")
    animation_state: Optional[str] = None # e.g., 'idle', 'playing_once', 'looping'

class AudioVisualizationStateModel(HolographicElementBase):
    visualization_type: str = Field(default="waveform", description="e.g., 'waveform', 'frequency_bars', 'particle_cloud'")
    audio_feature_params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parameters for how audio features drive visualization")
    color_scheme: Optional[str] = Field(default="default")

# User-specific Hologram (aligns with user_holograms table)
class UserHologramBase(BaseModel):
    hologram_name: str = Field(..., min_length=1, max_length=255)
    # hologram_state_data will store a list of elements or a scene graph definition
    hologram_state_data: Dict[str, Any] = Field(default_factory=dict, description="Root object for scene graph or list of elements")
    # Example structure for hologram_state_data:
    # {
    #   "scene_settings": {"skybox": "default", "lighting": "ambient"},
    #   "elements": [HolographicSymbolModel(...), ThreeDEmojiModel(...), AudioVisualizationStateModel(...)]
    # }

class UserHologramCreate(UserHologramBase):
    pass

class UserHologramDB(UserHologramBase):
    id: int
    user_id: str # Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# For API responses that might list multiple elements
class HolographicScene(BaseModel):
    scene_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    description: Optional[str] = None
    elements: List[Dict[str, Any]] = Field(default_factory=list) # List of various HolographicElementBase derived models
    # Or, more strongly typed if all elements are known:
    # elements: List[Union[HolographicSymbolModel, ThreeDEmojiModel, AudioVisualizationStateModel]] = Field(default_factory=list)
    user_id: Optional[str] = None # Firebase UID if user-specific
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Example for a request to update part of a scene
class SceneElementUpdate(BaseModel):
    element_id: str
    position: Optional[Vector3Model] = None
    rotation: Optional[QuaternionModel] = None
    scale: Optional[Vector3Model] = None
    visible: Optional[bool] = None
    # Add other updatable fields

class UserHologramResponseModel(BaseModel):
    hologram_id: int
    hologram_name: str
    created_at: datetime
    preview_url: Optional[str] = Field(default=None, description="URL for the hologram preview image")

    class Config:
        orm_mode = True # If ORM objects are used
```
