from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

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
# For Pydantic, we can use Union for the payload or have specific packet types.

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
    # Simplified version of InterpretedGestureSequence for network transmission
    sequence_id: Optional[str] = None
    timestamp: float # Relative to packet or absolute
    hand: Optional[str] = None # 'left', 'right'
    # Primitives or key points might be simplified for network
    key_points: Optional[List[Vector3NetModel]] = None # Example: list of fingertip positions
    recognized_intent: Optional[str] = None # e.g., "select", "drag_start"
    confidence: Optional[float] = None

class TriaStateUpdateNetModel(BaseModel):
    status: str # e.g., 'processing', 'idle', 'error'
    current_focus_entity_id: Optional[str] = None
    available_commands: Optional[List[str]] = None
    message_to_user: Optional[str] = None

class MediaStreamChunkNetModel(BaseModel):
    stream_id: str
    chunk_index: int
    data: bytes # Raw bytes of audio or video chunk
    is_last_chunk: bool = False
    content_type: str # e.g., "audio/webm;codecs=opus", "video/mp4"

# --- NetHoloPacket using a payload type field and a dictionary for the actual payload ---
# This is a common way to model 'oneof' in Pydantic for JSON compatibility.
class NetHoloPacket(BaseModel):
    header: NetHoloPacketHeader
    payload_type: str = Field(..., description="Discriminator field: 'HolographicSymbol', 'GestureChunk', 'TriaStateUpdate', 'MediaStreamChunk', 'SceneUpdate', 'HandshakeRequest', 'HandshakeResponse', 'Error'")
    
    # The actual payload. The structure depends on payload_type.
    # Using Dict[str, Any] for flexibility. Specific models can be parsed by the receiver.
    payload: Dict[str, Any] 

    # Example for specific payload models if preferred over Dict[str, Any]
    # For this, you'd typically use a Union of all possible payload types,
    # but that can be complex with FastAPI request parsing if not handled carefully.
    # payload: Union[
    #     HolographicSymbolNetModel,
    #     GestureChunkNetModel,
    #     TriaStateUpdateNetModel,
    #     MediaStreamChunkNetModel,
    #     # Add other specific payload types here
    # ] = Field(..., discriminator='payload_type') # Discriminator only works well if payload_type is inside each model

# --- Example Specific Payloads (can be used to structure the 'payload' dict) ---

class SceneUpdatePayload(BaseModel):
    scene_id: str
    # List of elements to add/update. For deletions, a separate list or flag can be used.
    upsert_elements: Optional[List[HolographicSymbolNetModel]] = None
    delete_element_ids: Optional[List[str]] = None
    scene_settings: Optional[Dict[str, Any]] = None # e.g., lighting, skybox

class HandshakeRequestPayload(BaseModel):
    client_version: str
    supported_features: Optional[List[str]] = None

class HandshakeResponsePayload(BaseModel):
    server_version: str
    session_id: str
    accepted_features: Optional[List[str]] = None
    error_message: Optional[str] = None # If handshake failed

class ErrorPayload(BaseModel):
    code: int # e.g., 400, 500
    message: str
    details: Optional[str] = None

# These Pydantic models are intended for internal use within the Python backend
# to represent the data that will be (or has been) serialized/deserialized
# using Protobuf for actual network transmission.
# They help with type checking and validation within the Python application.
```
