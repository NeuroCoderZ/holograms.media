from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Aligns with 'user_chat_sessions' table
class UserChatSessionBase(BaseModel):
    session_title: Optional[str] = Field(None, max_length=255)
    # user_id (Firebase UID) will be added at the service/router level for creation

class UserChatSessionCreate(UserChatSessionBase):
    pass

class UserChatSessionDB(UserChatSessionBase):
    id: int # Primary key
    user_id: str # Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Aligns with 'chat_history' table (representing individual messages)
class ChatMessageBase(BaseModel):
    # user_chat_session_id will be provided when creating a message
    role: str = Field(..., description="Sender of the message: 'user', 'assistant', or 'system'")
    message_content: str = Field(..., description="Actual text content of the message")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

class ChatMessageCreate(ChatMessageBase):
    user_chat_session_id: int # Foreign key to user_chat_sessions table

class ChatMessageDB(ChatMessageBase):
    id: int # Primary key
    user_chat_session_id: int
    timestamp: datetime # Defaulted in DB

    class Config:
        orm_mode = True

# For API responses, might include more details or structure
class ChatMessagePublic(ChatMessageDB):
    pass

# For representing a list of messages in a session
class ChatSessionWithHistory(UserChatSessionDB):
    messages: List[ChatMessagePublic] = Field(default_factory=list)

# For creating a new message and potentially a new session if session_id is not provided
class NewChatMessageRequest(BaseModel):
    user_chat_session_id: Optional[int] = None # If provided, adds to existing session
    session_title: Optional[str] = Field(None, max_length=255, description="Title for a new session if session_id is not provided")
    message_content: str
    role: str = Field(default='user', description="Typically 'user' for new requests from client")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UserPromptTitleInfo(BaseModel):
    """Used for listing unique prompt titles with their counts and last update time."""
    prompt_title: str
    version_count: int
    last_updated: datetime

    class Config:
        orm_mode = True
```
