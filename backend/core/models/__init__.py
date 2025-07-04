# backend/core/models/__init__.py

# Import models from base_models.py
from .base_models import CoreModel, IDModel, TimestampModel, BaseUUIDModel, current_time_utc

# Import models from user_models.py
from .user_models import UserPublic, UserInDB

# Import models from hologram_models.py
from .hologram_models import (
    UserHologramBase, UserHologramCreate, UserHologramDB, UserHologramResponseModel, HologramUpdate,
    Vector3Model, QuaternionModel, HolographicSymbolModel, ThreeDEmojiModel, # Also used by hologlyph_models
    AudioVisualizationStateModel # Also used by hologlyph_models
)

# Import models from gesture_models.py
from .gesture_models import (
    UserGestureDefinitionBase, UserGestureDefinitionCreate, UserGestureDefinitionDB, GestureUpdate,
    InterpretedGestureSequenceBase, InterpretedGestureSequenceCreate, InterpretedGestureSequenceDB,
    GesturalPrimitive, # Support model for sequences
    CoreGesturePrimitiveModel, CoreInterpretedGestureModel, CoreGestureModel # Other gesture models
)

# Import models from chat_models.py
from .chat_models import (
    UserChatSessionBase, UserChatSessionCreate, UserChatSessionDB,
    ChatMessageBase, ChatMessageCreate, ChatMessageDB, ChatMessagePublic,
    ChatSessionWithHistory, NewChatMessageRequest
)

# Import models from prompt_models.py
from .prompt_models import (
    UserPromptVersionBase, UserPromptVersionCreate, UserPromptVersionDB
)

# Import models from tria_azr_models.py (keeping these as they seem distinct)
from .tria_azr_models import (
    TriaAZRTask,
    TriaAZRTaskSolution,
    TriaLearningLogEntry,
    TriaBotConfiguration
)

# Import models from hologlyph_models.py (some models might overlap with hologram_models, ensure distinct purpose or consolidate later)
# For now, only importing TriaStateUpdateModel as others are in hologram_models.py
from .hologlyph_models import TriaStateUpdateModel

# Import models from multimodal_models.py
from .multimodal_models import AudiovisualGesturalChunkModel

# Import models from internal_bus_models.py
from .internal_bus_models import InternalMessage

# Import models from nethologlyph_models.py
from .nethologlyph_models import (
    HolographicSymbolNetModel,
    GestureChunkNetModel,
    TriaStateUpdateNetModel
)

# Import models from code_embedding_models.py
from .code_embedding_models import TriaCodeEmbeddingModel

# Import models from learning_log_models.py
from .learning_log_models import TriaLearningLogModel


__all__ = [
    # from .base_models
    "CoreModel", "IDModel", "TimestampModel", "BaseUUIDModel", "current_time_utc",
    # from .user_models
    "UserPublic", "UserInDB",

    # from .hologram_models (for CRUD and general use)
    "UserHologramBase", "UserHologramCreate", "UserHologramDB", "UserHologramResponseModel",
    "Vector3Model", "QuaternionModel", "HolographicSymbolModel", "ThreeDEmojiModel",
    "AudioVisualizationStateModel",

    # from .gesture_models (for CRUD on user_gestures and gesture_sequences)
    "UserGestureDefinitionBase", "UserGestureDefinitionCreate", "UserGestureDefinitionDB",
    "InterpretedGestureSequenceBase", "InterpretedGestureSequenceCreate", "InterpretedGestureSequenceDB",
    "GesturalPrimitive",
    # Other gesture models (not primary for this phase's CRUD)
    "CoreGesturePrimitiveModel", "CoreInterpretedGestureModel", "CoreGestureModel",

    # from .chat_models (for CRUD on chat_sessions and chat_messages)
    "UserChatSessionBase", "UserChatSessionCreate", "UserChatSessionDB",
    "ChatMessageBase", "ChatMessageCreate", "ChatMessageDB", "ChatMessagePublic",
    "ChatSessionWithHistory", "NewChatMessageRequest",

    # from .prompt_models (for CRUD on user_prompt_versions)
    "UserPromptVersionBase", "UserPromptVersionCreate", "UserPromptVersionDB",

    # from .tria_azr_models
    "TriaAZRTask", "TriaAZRTaskSolution", "TriaLearningLogEntry", "TriaBotConfiguration",

    # from .hologlyph_models (ensure no clashes with hologram_models if used for different purposes)
    "TriaStateUpdateModel", # Vector3Model etc. are now sourced from hologram_models

    # from .multimodal_models
    "AudiovisualGesturalChunkModel",

    # from .internal_bus_models
    "InternalMessage",

    # from .nethologlyph_models
    "HolographicSymbolNetModel", "GestureChunkNetModel", "TriaStateUpdateNetModel",

    # from .code_embedding_models
    "TriaCodeEmbeddingModel",

    # from .learning_log_models
    "TriaLearningLogModel"
]
