from pydantic import Field, BaseModel, ConfigDict # Added ConfigDict
from typing import Optional, List, Dict, Any # List for embedding_vector
from uuid import UUID # Removed uuid4 as BaseUUIDModel handles it. If needed by appended code, it will be an issue.
from datetime import datetime

from .base_models import BaseUUIDModel # Assuming BaseUUIDModel provides id, created_at, updated_at

class TriaCodeEmbeddingModel(BaseUUIDModel): # Inherits id, created_at, updated_at
    code_hash: str = Field(..., description="SHA-256 hash of the canonical code snippet to detect exact duplicates.")
    code_snippet: str = Field(..., description="The actual code snippet that was embedded.")
    # Storing embeddings as a JSON list of floats. For actual vector DBs, this would be a vector type.
    embedding_vector_json: List[float] = Field(..., description="JSON representation of the code embedding vector.")
    code_language: str = Field(..., description="Programming language of the code snippet (e.g., 'python', 'javascript').")
    embedding_model_version: str = Field(..., description="Version of the embedding model used to generate this vector.")
    source_file_path: Optional[str] = Field(default=None, description="Original file path of the code snippet, if applicable.")
    code_construct_type: Optional[str] = Field(default=None, description="Type of code construct (e.g., 'function', 'class', 'module', 'line_block').")
    dependencies_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="JSON object describing dependencies or context (e.g., imported modules, parent class/function).")
    custom_metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other custom metadata related to this code embedding.")

    class Config:
        orm_mode = True
        schema_extra = {
            "examples": [
                {
                    "id": "f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
                    "code_hash": "a1b2c3d4e5f6...",
                    "code_snippet": "def hello_world():\n  print('Hello, world!')",
                    "embedding_vector_json": [0.1, 0.2, 0.3, "..."],
                    "code_language": "python",
                    "embedding_model_version": "text-embedding-ada-002-v1",
                    "source_file_path": "utils/greetings.py",
                    "code_construct_type": "function",
                    "created_at": "2024-05-29T17:00:00Z",
                    "updated_at": "2024-05-29T17:00:00Z"
                }
            ]
        }

# Content from backend/models/code_embedding_models.py

# BaseModel and Field are already imported. ConfigDict was added.
# Optional, List, Dict, Any, datetime are already imported.

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
