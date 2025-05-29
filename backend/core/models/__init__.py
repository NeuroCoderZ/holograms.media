# backend/core/models/__init__.py

# Import models from base_models.py
from .base_models import CoreModel, IDModel, TimestampModel, BaseUUIDModel, current_time_utc

# Import models from user_models.py
from .user_models import UserModel

# Import models from tria_azr_models.py
from .tria_azr_models import (
    TriaAZRTask,
    TriaAZRTaskSolution,
    TriaLearningLogEntry,
    TriaBotConfiguration
)

# Import models from hologlyph_models.py
from .hologlyph_models import (
    Vector3Model,
    QuaternionModel,
    HolographicSymbolModel,
    ThreeDEmojiModel, # Stub
    AudioVisualizationStateModel, # Stub
    TriaStateUpdateModel # Stub
)

# Import models from multimodal_models.py
from .multimodal_models import AudiovisualGesturalChunkModel

# Import models from gesture_models.py
from .gesture_models import GesturePrimitiveModel, InterpretedGestureModel, GestureModel

# Import models from internal_bus_models.py
from .internal_bus_models import InternalMessage

# Import models from nethologlyph_models.py
from .nethologlyph_models import (
    PydanticHolographicSymbol,
    PydanticGestureChunk,
    PydanticTriaStateUpdate
)

# Import models from code_embedding_models.py
from .code_embedding_models import TriaCodeEmbeddingModel

# It's good practice to define __all__ to specify what gets imported with 'from .models import *'
# However, explicit imports are generally preferred.
# If __all__ is desired, list all imported model names here as strings.
# For example:
# __all__ = [
#     "CoreModel", "IDModel", "TimestampModel", "BaseUUIDModel", "current_time_utc",
#     "UserModel",
#     "TriaAZRTask", "TriaAZRTaskSolution", "TriaLearningLogEntry", "TriaBotConfiguration",
#     "Vector3Model", "QuaternionModel", "HolographicSymbolModel", "ThreeDEmojiModel", 
#     "AudioVisualizationStateModel", "TriaStateUpdateModel",
#     "AudiovisualGesturalChunkModel",
#     "GesturePrimitiveModel", "InterpretedGestureModel", "GestureModel",
#     "InternalMessage",
#     "PydanticHolographicSymbol", "PydanticGestureChunk", "PydanticTriaStateUpdate",
#     "TriaCodeEmbeddingModel"
# ]

print("backend.core.models package initialized")
