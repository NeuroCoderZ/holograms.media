# backend/models/tria_models.py
from pydantic import BaseModel
from typing import Optional

class TriaPromptRequest(BaseModel):
    """
    Request model for sending a prompt to Tria.
    """
    prompt: str
    session_id: Optional[str] = None

class TriaPromptResponse(BaseModel):
    """
    Response model for a prompt sent to Tria.
    """
    response: str
    session_id: Optional[str] = None
    error: Optional[str] = None
