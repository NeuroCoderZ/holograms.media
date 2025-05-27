# This file makes Python treat the directory backend/models as a package.
# This makes it easier to import models, e.g., from backend.models import UserPublic, Token

from .auth_models import Token, TokenData
from .user_models import UserBase, UserCreate, UserInDBBase, UserPublic, UserInDB
from .gesture_models import GestureBase, GestureCreate, UserGesture, GesturalPrimitive, InterpretedGestureSequence
from .hologram_models import HologramBase, HologramCreate, UserHologram
from .chat_models import ChatSessionCreate, UserChatSession, ChatMessageCreate, ChatMessagePublic
from .prompt_models import PromptVersionBase, PromptVersionCreate, UserPromptVersion
from .code_embedding_models import CodeEmbedding, CodeEmbeddingCreate, CodeEmbeddingBase
from .azr_models import AZRTask, AZRTaskCreate, AZRTaskBase # Added AZR models
from .learning_log_models import LearningLogEntry, LearningLogEntryCreate, LearningLogEntryBase # Added Learning Log models

# New models for future scaffolding
from .internal_bus_models import InternalMessage
from .hologlyph_models import Vector3, Quaternion, ThreeDEmojiModel, HolographicSymbolModel


# Optional: Define __all__ to control what 'from backend.models import *' imports
__all__ = [
    # auth_models
    "Token", "TokenData",
    # user_models
    "UserBase", "UserCreate", "UserInDBBase", "UserPublic", "UserInDB",
    # gesture_models
    "GestureBase", "GestureCreate", "UserGesture",
    "GesturalPrimitive", "InterpretedGestureSequence",
    # hologram_models
    "HologramBase", "HologramCreate", "UserHologram",
    # chat_models
    "ChatSessionCreate", "UserChatSession", "ChatMessageCreate", "ChatMessagePublic",
    # prompt_models
    "PromptVersionBase", "PromptVersionCreate", "UserPromptVersion",
    # New models
    "InternalMessage",
    "Vector3", "Quaternion", "ThreeDEmojiModel", "HolographicSymbolModel",
    "CodeEmbedding", "CodeEmbeddingCreate", "CodeEmbeddingBase",
    "AZRTask", "AZRTaskCreate", "AZRTaskBase", # Added AZR models to __all__
    "LearningLogEntry", "LearningLogEntryCreate", "LearningLogEntryBase" # Added Learning Log models to __all__
]
