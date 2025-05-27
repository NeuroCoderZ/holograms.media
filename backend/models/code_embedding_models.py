from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class TriaCodeEmbeddingBase(BaseModel):
    source_code_reference: Optional[str] = None
    semantic_description: Optional[str] = None
    dependencies: Optional[Dict[str, Any]] = None # Using Dict for JSONB flexibility
    version: Optional[str] = Field(None, max_length=50)
    embedding_vector: Optional[List[float]] = None # Assuming it might be set later

class TriaCodeEmbeddingCreate(TriaCodeEmbeddingBase):
    component_id: str = Field(..., max_length=255) # PK, required on creation
    # embedding_vector can be provided on creation or updated later
    # semantic_description and source_code_reference are also good to have on creation

class TriaCodeEmbeddingDB(TriaCodeEmbeddingBase):
    component_id: str = Field(..., max_length=255)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```
