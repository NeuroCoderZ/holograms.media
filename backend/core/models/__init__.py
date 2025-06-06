# backend/core/models/__init__.py

# Import models from base_models.py
from .base_models import CoreModel, IDModel, TimestampModel, BaseUUIDModel, current_time_utc

# Import models from user_models.py
from .user_models import UserPublic, UserInDB

# Import models from tria_azr_models.py
from .tria_azr_models import (
    TriaAZRTask,
    TriaAZRTaskSolution,
    TriaLearningLogEntry,
    TriaBotConfiguration
)

# Import models from hologlyph_models.py
# Note: Vector3Model, QuaternionModel, HolographicSymbolModel are also in hologram_models.py
# The __init__.py currently sources them from hologlyph_models.py. This is fine.
from .hologlyph_models import (
    Vector3Model,
    QuaternionModel,
    HolographicSymbolModel,
    ThreeDEmojiModel,
    AudioVisualizationStateModel,
    TriaStateUpdateModel
)

# Import models from multimodal_models.py
from .multimodal_models import AudiovisualGesturalChunkModel

# Import models from gesture_models.py
# Corrected to reflect names found in gesture_models.py manifesto
from .gesture_models import CoreGesturePrimitiveModel, CoreInterpretedGestureModel, CoreGestureModel, GesturalPrimitive, InterpretedGestureSequenceBase, UserGestureDefinitionBase

# Import models from internal_bus_models.py
from .internal_bus_models import InternalMessage

# Import models from nethologlyph_models.py
# Corrected to reflect names found in nethologlyph_models.py manifesto
from .nethologlyph_models import (
    HolographicSymbolNetModel, # Was PydanticHolographicSymbol
    GestureChunkNetModel,      # Was PydanticGestureChunk
    TriaStateUpdateNetModel    # Was PydanticTriaStateUpdate
)

# Import models from code_embedding_models.py
from .code_embedding_models import TriaCodeEmbeddingModel

# Import models from learning_log_models.py
from .learning_log_models import TriaLearningLogModel

# Rebuilt __all__ to include all successfully imported models above
__all__ = [
    # from .base_models
    "CoreModel", "IDModel", "TimestampModel", "BaseUUIDModel", "current_time_utc",
    # from .user_models
    "UserPublic", "UserInDB",
    # from .tria_azr_models
    "TriaAZRTask", "TriaAZRTaskSolution", "TriaLearningLogEntry", "TriaBotConfiguration",
    # from .hologlyph_models
    "Vector3Model", "QuaternionModel", "HolographicSymbolModel", "ThreeDEmojiModel",
    "AudioVisualizationStateModel", "TriaStateUpdateModel",
    # from .multimodal_models
    "AudiovisualGesturalChunkModel",
    # from .gesture_models (corrected and expanded)
    "CoreGesturePrimitiveModel", "CoreInterpretedGestureModel", "CoreGestureModel",
    "GesturalPrimitive", "InterpretedGestureSequenceBase", "UserGestureDefinitionBase",
    # from .internal_bus_models
    "InternalMessage",
    # from .nethologlyph_models (corrected)
    "HolographicSymbolNetModel", "GestureChunkNetModel", "TriaStateUpdateNetModel",
    # from .code_embedding_models
    "TriaCodeEmbeddingModel",
    # from .learning_log_models
    "TriaLearningLogModel"
]
