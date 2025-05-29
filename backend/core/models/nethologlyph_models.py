from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .hologlyph_models import Vector3Model, QuaternionModel # Re-use basic structures
from .base_models import BaseUUIDModel, current_time_utc # For consistency if IDs/timestamps are managed similarly

# These Pydantic models are intended to closely mirror the structure of their
# corresponding Protobuf messages defined in nethologlyph/protocol/definitions.proto.
# They are used for internal data handling after deserializing from Protobuf
# or before serializing to Protobuf.

class PydanticHolographicSymbol(BaseUUIDModel): # Using BaseUUIDModel for id and timestamps
    # symbol_id from Protobuf is mapped to 'id' from BaseUUIDModel
    symbol_id_str: str = Field(..., description="The 'symbol_id' field from Protobuf, a string.")
    type: str = Field(..., description="Type of the holographic symbol (e.g., 'cube', 'sphere').")
    position: Vector3Model = Field(default_factory=Vector3Model)
    orientation: QuaternionModel = Field(default_factory=QuaternionModel)
    scale: Vector3Model = Field(default_factory=lambda: Vector3Model(x=1.0, y=1.0, z=1.0))
    material_properties_json: Optional[str] = Field(default=None, description="JSON string for material properties, as in Protobuf.")
    custom_data: Optional[bytes] = Field(default=None, description="Custom data as bytes, matching Protobuf 'bytes' type.")
    # last_updated from Protobuf (google.protobuf.Timestamp) is mapped to 'updated_at'
    # The actual timestamp conversion (e.g., to datetime object) would happen during (de)serialization.
    code_language: Optional[str] = Field(default=None)
    embedding_model_version: Optional[str] = Field(default=None)

    class Config:
        orm_mode = True
        schema_extra = {
            "notes": "This model mirrors HolographicSymbol in definitions.proto. 'id' is the UUID, 'symbol_id_str' is the proto 'symbol_id'."
        }


class PydanticGestureChunk(BaseUUIDModel): # Using BaseUUIDModel for id and timestamps
    # gesture_id from Protobuf is mapped to 'id' from BaseUUIDModel
    gesture_id_str: str = Field(..., description="The 'gesture_id' field from Protobuf, a string.")
    user_id: str # Assuming user_id in proto is a string; if it's a UUID, change type
    # timestamp from Protobuf (google.protobuf.Timestamp) is mapped to 'created_at' or a specific field
    # For simplicity, created_at/updated_at from BaseUUIDModel can represent this.
    # If a separate 'event_timestamp' is needed:
    # event_timestamp: datetime = Field(default_factory=current_time_utc)
    recognized_gesture_type: Optional[str] = Field(default=None)
    confidence: Optional[float] = Field(default=None)
    landmark_data_3d: Optional[List[float]] = Field(default=None, description="Flattened list of 3D landmark data (e.g., 21*3=63 floats).")
    source_modality: Optional[str] = Field(default=None)
    gesture_sequence_id: Optional[str] = Field(default=None)
    is_continuous_gesture_segment: Optional[bool] = Field(default=False)
    temporal_spatial_metadata_json: Optional[str] = Field(default=None, description="JSON string for richer temporal/spatial data.")
    
    class Config:
        orm_mode = True
        schema_extra = {
            "notes": "This model mirrors GestureChunk in definitions.proto. 'id' is the UUID, 'gesture_id_str' is the proto 'gesture_id'."
        }

class PydanticTriaStateUpdate(BaseUUIDModel): # Using BaseUUIDModel for id and timestamps
    state_key: str = Field(..., description="e.g., 'current_mood', 'active_task_id'.")
    state_value_json: str = Field(..., description="JSON string representation of the state value.") # Protobuf uses bytes for JSON, often handled as string in Python
    # timestamp from Protobuf (google.protobuf.Timestamp) is mapped to 'created_at' or a specific field
    bot_id: Optional[str] = Field(default=None)

    class Config:
        orm_mode = True
        schema_extra = {
            "notes": "This model mirrors TriaStateUpdate in definitions.proto."
        }

# Add other Pydantic models mirroring Protobuf messages as needed, e.g.:
# PydanticThreeDEmoji, PydanticAudioVisualizationState, PydanticNetHoloPacket (if the wrapper itself is used internally)

# Note on Consolidation:
# If hologlyph_models.HolographicSymbolModel and nethologlyph_models.PydanticHolographicSymbol
# end up being identical in structure and purpose (e.g., if hologlyph_models are not directly tied to an ORM
# and are purely for data structure definition), they could potentially be consolidated.
# However, keeping them separate allows for 'hologlyph_models' to evolve for database storage/ORM features
# while 'nethologlyph_models' strictly mirror the network protocol. For MVP, this separation is acceptable.
