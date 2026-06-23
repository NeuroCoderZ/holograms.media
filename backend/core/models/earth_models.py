from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class Vector3Model(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class QuaternionModel(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0


class AudioParams(BaseModel):
    freq_range: List[float] = [20.0, 20000.0]
    amplitude: float = 0.5
    waveform: str = "sine"
    modulation: Dict[str, Any] = Field(default_factory=dict)


class VisualParams(BaseModel):
    color: List[float] = [1.0, 1.0, 1.0, 1.0]
    opacity: float = 0.8
    shader: str = "hologram"
    shader_params: Dict[str, Any] = Field(default_factory=dict)
    texture_id: Optional[str] = None


class GeometryParams(BaseModel):
    type: str = "sphere"
    params: Dict[str, Any] = Field(default_factory=dict)
    generated_by: Optional[str] = None
    generation_params: Dict[str, Any] = Field(default_factory=dict)


class EarthNodeCreate(BaseModel):
    type: str = "mesh"
    position: Vector3Model = Field(default_factory=Vector3Model)
    rotation: QuaternionModel = Field(default_factory=QuaternionModel)
    scale: Vector3Model = Field(default_factory=lambda: Vector3Model(x=1.0, y=1.0, z=1.0))
    visual: VisualParams = Field(default_factory=VisualParams)
    audio: AudioParams = Field(default_factory=AudioParams)
    geometry: GeometryParams = Field(default_factory=GeometryParams)
    gesture_dna: Optional[str] = None
    parent_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class EarthNodeDB(EarthNodeCreate):
    id: str
    earth_id: str
    owner: str
    shared_with: List[str] = Field(default_factory=list)
    version: int = 1
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EarthNodeUpdate(BaseModel):
    position: Optional[Vector3Model] = None
    rotation: Optional[QuaternionModel] = None
    scale: Optional[Vector3Model] = None
    visual: Optional[VisualParams] = None
    audio: Optional[AudioParams] = None
    geometry: Optional[GeometryParams] = None
    gesture_dna: Optional[str] = None
    tags: Optional[List[str]] = None


class EarthShareRequest(BaseModel):
    target_earth_id: str
    node_ids: List[str]
    permission: str = "read"


class EarthScene(BaseModel):
    earth_id: str
    node_count: int = 0
    version: int = 1
    locked_by: Optional[str] = None
    updated_at: datetime
