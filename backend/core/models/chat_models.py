from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

class UserChatSessionBase(BaseModel):
    session_title: Optional[str] = Field(None, max_length=255)

class UserChatSessionCreate(UserChatSessionBase):
    pass

class UserChatSessionDB(UserChatSessionBase):
    id: Union[int, str]
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    role: str = Field(..., description="Sender of the message: 'user', 'assistant', or 'system'")
    message_content: str = Field(..., description="Actual text content of the message")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

class ChatMessageCreate(ChatMessageBase):
    user_chat_session_id: Union[int, str]

class ChatMessageDB(ChatMessageBase):
    id: Union[int, str]
    user_chat_session_id: Union[int, str]
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatMessagePublic(ChatMessageDB):
    pass

class ChatSessionWithHistory(UserChatSessionDB):
    messages: List[ChatMessagePublic] = Field(default_factory=list)

class NewChatMessageRequest(BaseModel):
    user_chat_session_id: Optional[Union[int, str]] = None
    session_title: Optional[str] = Field(None, max_length=255, description="Title for a new session if session_id is not provided")
    message_content: str
    role: str = Field(default='user', description="Typically 'user' for new requests from client")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UserPromptTitleInfo(BaseModel):
    prompt_title: str
    version_count: int
    last_updated: datetime

    class Config:
        from_attributes = True
