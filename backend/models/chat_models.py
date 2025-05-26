from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any # Ensure List, Dict, Any are imported
from datetime import datetime

# For creating a new chat session
class ChatSessionCreate(BaseModel):
    session_title: Optional[str] = Field(None, max_length=255)

# For representing a user's chat session
class UserChatSession(BaseModel):
    id: int
    user_id: int
    session_title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# For creating a new message within a session
class ChatMessageCreate(BaseModel):
    message_content: str = Field(..., min_length=1)
    # role will be 'user' for messages sent via this model by a user.
    # 'assistant' messages will be created internally.
    # 'system' messages also internal or via specific admin tools.
    # For simplicity, we might not need 'role' here if it's always 'user'.
    # Let's assume for now this is for user-sent messages.
    metadata: Optional[Dict[str, Any]] = None


# Public representation of a chat message (part of history)
class ChatMessagePublic(BaseModel):
    id: int
    user_chat_session_id: int
    role: str # 'user', 'assistant', 'system'
    message_content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True
