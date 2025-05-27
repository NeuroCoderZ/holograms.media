from typing import List, Optional, Dict, Any # Ensure Any is imported if Dict values are not specific
from pydantic import BaseModel, Field
import datetime

class CodeEmbeddingBase(BaseModel):
    component_id: str = Field(..., description="Unique identifier for the code component (e.g., function path, module name)")
    source_code_reference: Optional[str] = Field(None, description="Link or reference to the source code file/version")
    # Assuming embedding_vector will be handled appropriately during creation/retrieval,
    # it might not always be present in base model for creation if generated later.
    # For now, including it as optional.
    embedding_vector: Optional[List[float]] = Field(None, description="Semantic embedding of the code component")
    semantic_description: Optional[str] = Field(None, description="Human-readable description of what the component does")
    dependencies: Optional[List[str]] = Field(None, description="List of other component_ids this component depends on") # Assuming list of strings
    version: Optional[str] = Field(None, description="Version of this code component/embedding")

class CodeEmbeddingCreate(CodeEmbeddingBase):
    # Add any specific fields for creation if different from base
    # For now, assume it's the same as base, but ensure critical fields are not optional if needed for creation
    component_id: str # Make non-optional for creation
    embedding_vector: List[float] # Make non-optional for creation

class CodeEmbedding(CodeEmbeddingBase):
    # Fields from the database record, including those automatically generated
    embedding_vector: List[float] # Make non-optional for a stored record
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        orm_mode = True
