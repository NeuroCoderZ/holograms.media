# File: backend/models/tria_state_model.py
# Purpose: Pydantic model for representing Tria's state or responses.
# Key Future Dependencies: Pydantic.
# Main Future Exports/API: TriaState.
# Link to Legacy Logic (if applicable): N/A
# Intended Technology Stack: Python, Pydantic.
# TODO: Define fields for Tria's current mode, active bots, response data.
# TODO: Model for Tria commands.

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TriaCommand(BaseModel):
    command_name: str
    parameters: Optional[Dict[str, Any]] = None

class TriaResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    active_bots: Optional[List[str]] = None
