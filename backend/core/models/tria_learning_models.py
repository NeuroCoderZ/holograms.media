# backend/core/models/tria_learning_models.py
from pydantic import Field, BaseModel
from typing import Dict, Any, Optional, List
from uuid import UUID
import datetime

# Используем существующий UUIDDBBaseModel, если он подходит, или создадим свой.
# UUIDDBBaseModel из base_models.py:
# class UUIDDBBaseModel(BaseModel):
#     id: UUID = Field(default_factory=uuid4, description="Primary key, UUID.")
#     created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of creation (UTC).")
#     updated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of last update (UTC).")
#     class Config:
#         orm_mode = True

# Если UUIDDBBaseModel не определен или не подходит, можно использовать такой базовый класс:
class BaseAuditModel(BaseModel):
    id: UUID = Field(default_factory=__import__('uuid').uuid4)
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

    class Config:
        orm_mode = True # Pydantic V1
        # from_attributes = True # Pydantic V2

# Используем UUIDDBBaseModel из нашего существующего base_models.py
from .base_models import UUIDDBBaseModel

class TriaLearningLogDB(UUIDDBBaseModel):
    user_id: str = Field(..., description="Firebase UID of the user.")
    session_id: Optional[str] = Field(None, description="Optional session identifier for the interaction.")

    intent_vector: Dict[str, Any] = Field(..., description="The intent vector processed by GestureBot, including type, intensity, and target_context.")
    # intent_type: str
    # intent_intensity: float
    # intent_target_context: Dict[str, Any]

    context_embedding_id: Optional[UUID] = Field(None, description="ID of the base embedding that was targeted for modification. Null if no specific embedding was found or targeted.")

    action_result: str = Field(..., description="Outcome of the action: 'success', 'ignored' (e.g., not applicable affordance), 'error'.")
    result_message: Optional[str] = Field(None, description="Optional message associated with the action result (e.g., error details, reason for ignore).")

    modified_embedding_id: Optional[UUID] = Field(None, description="ID of the embedding if it was successfully modified. Could be same as context_embedding_id if updated in-place.")
    # original_embedding_vector: Optional[List[float]] # Может быть слишком объемно для лога
    # modified_embedding_vector: Optional[List[float]] # Может быть слишком объемно для лога

    feedback_signal: Optional[int] = Field(None, description="User feedback signal: -1 (negative), 0 (neutral/skip), 1 (positive).")
    additional_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other relevant metadata for this learning log entry.")

    class Config:
        # orm_mode = True # Уже унаследовано от UUIDDBBaseModel
        # Для Pydantic V2, если UUIDDBBaseModel не использует его:
        # from_attributes = True
        pass

class TriaLearningLogCreate(BaseModel): # Не наследуем от UUIDDBBaseModel, т.к. id и timestamp'ы ставятся БД
    user_id: str
    session_id: Optional[str] = None
    intent_vector: Dict[str, Any]
    context_embedding_id: Optional[UUID] = None
    action_result: str
    result_message: Optional[str] = None
    modified_embedding_id: Optional[UUID] = None
    feedback_signal: Optional[int] = None
    additional_metadata: Optional[Dict[str, Any]] = None
