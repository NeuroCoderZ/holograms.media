from pydantic import BaseModel, Field, ConfigDict # Используем ConfigDict для Pydantic V2
from typing import Optional, List, Dict, Any
from datetime import datetime

class TriaCodeEmbeddingBase(BaseModel):
    component_id: str = Field(..., description="Unique identifier for the code component (e.g., function path, module name)", max_length=255)
    source_code_reference: Optional[str] = Field(None, description="Link or reference to the source code file/version")
    semantic_description: Optional[str] = Field(None, description="Human-readable or AI-generated summary of the component's purpose")
    dependencies: Optional[Dict[str, Any]] = Field(None, description="e.g., list of other component_ids this component depends on, using Dict for JSONB flexibility") # JSONB -> Dict
    version: Optional[str] = Field(None, description="Version of this code component/embedding", max_length=50)
    embedding_vector: Optional[List[float]] = Field(None, description="Semantic embedding of the code component. Assuming it might be set or updated later.")

class TriaCodeEmbeddingCreate(TriaCodeEmbeddingBase):
    # component_id is already required in TriaCodeEmbeddingBase if "..." is used as default
    # embedding_vector can be provided on creation or updated later.
    # If embedding_vector MUST be present on creation, make it non-optional here:
    # embedding_vector: List[float] = Field(...)
    pass # Inherits all fields, component_id is already mandatory

class TriaCodeEmbeddingInDB(TriaCodeEmbeddingBase): # Переименовал для ясности, что это модель для чтения из БД
    # component_id is inherited and mandatory
    # embedding_vector can be Optional if it can be null in DB, or List[float] if always present
    created_at: datetime
    updated_at: datetime

    # Pydantic V2 Config
    model_config = ConfigDict(from_attributes=True)

# Для удобства можно также определить модель для публичного API ответа, если она отличается
class TriaCodeEmbeddingPublic(TriaCodeEmbeddingBase):
    created_at: datetime
    updated_at: datetime
    # embedding_vector: Optional[List[float]] # Реши, нужно ли его всегда возвращать
    model_config = ConfigDict(from_attributes=True)