from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    # Add other fields you might want to store in the token, e.g., user_id, roles
    # For now, username is a common subject ('sub') for JWT.
