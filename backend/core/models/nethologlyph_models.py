from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

# Content from backend/models/nethologlyph_models.py

# --- Common Types (mirroring common_types.proto) ---
class Vector3NetModel(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class QuaternionNetModel(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0

# --- Main Packet Structure (mirroring NetHoloPacket in definitions.proto) ---
class NetHoloPacketHeader(BaseModel):
    packet_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = Field(default_factory=datetime.utcnow().timestamp, description="Epoch seconds UTC")
    source_id: str # e.g., user_firebase_uid or service_id
    target_id: Optional[str] = None # For direct messages
    version: str = Field(default="0.1.0")

# Content types (these would correspond to 'oneof' fields in Protobuf)

class HolographicSymbolNetModel(BaseModel):
    element_id: str
    symbol_type: str # e.g., 'cube', 'sphere', 'text_label'
    position: Optional[Vector3NetModel] = None
    rotation: Optional[QuaternionNetModel] = None
    scale: Optional[Vector3NetModel] = None
    color_rgba: Optional[List[float]] = None # [r, g, b, a]
    text_content: Optional[str] = None
    is_interactive: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None

class GestureChunkNetModel(BaseModel):
    sequence_id: Optional[str] = None
    timestamp: float # Relative to packet or absolute
    hand: Optional[str] = None # 'left', 'right'
    key_points: Optional[List[Vector3NetModel]] = None
    recognized_intent: Optional[str] = None
    confidence: Optional[float] = None

class TriaStateUpdateNetModel(BaseModel):
    status: str
    current_focus_entity_id: Optional[str] = None
    available_commands: Optional[List[str]] = None
    message_to_user: Optional[str] = None

class MediaStreamChunkNetModel(BaseModel):
    stream_id: str
    chunk_index: int
    data: bytes
    is_last_chunk: bool = False
    content_type: str

class NetHoloPacket(BaseModel):
    header: NetHoloPacketHeader
    payload_type: str = Field(..., description="Discriminator field: 'HolographicSymbol', 'GestureChunk', 'TriaStateUpdate', 'MediaStreamChunk', 'SceneUpdate', 'HandshakeRequest', 'HandshakeResponse', 'Error'")
    payload: Dict[str, Any]

class SceneUpdatePayload(BaseModel):
    scene_id: str
    upsert_elements: Optional[List[HolographicSymbolNetModel]] = None
    delete_element_ids: Optional[List[str]] = None
    scene_settings: Optional[Dict[str, Any]] = None

class HandshakeRequestPayload(BaseModel):
    client_version: str
    supported_features: Optional[List[str]] = None

class HandshakeResponsePayload(BaseModel):
    server_version: str
    session_id: str
    accepted_features: Optional[List[str]] = None
    error_message: Optional[str] = None

class ErrorPayload(BaseModel):
    code: int
    message: str
    details: Optional[str] = None

# Note: The Pydantic models from the original backend/core/models/nethologlyph_models.py
# (PydanticHolographicSymbol, PydanticGestureChunk, PydanticTriaStateUpdate) which inherited
# BaseUUIDModel have not been appended here. This choice prioritizes the comprehensive
# network protocol definitions from backend/models/nethologlyph_models.py.
# If DB representations of these network messages are needed, they might be better placed
# in a different model file or reconciled with these definitions if they serve a dual purpose.
# For now, this file focuses on representing the network packet structures.
# The Vector3Model and QuaternionModel from the original core file were similar to
# Vector3NetModel and QuaternionNetModel here; the "NetModel" suffixed versions are retained
# as they were part of the more complete definitions from backend/models/.
# The import of .hologlyph_models and .base_models is no longer needed with this content.
