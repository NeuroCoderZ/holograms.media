# backend/routers/auth.py
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict

from pydantic import BaseModel, Field

from backend.auth.security import verify_google_token, create_access_token, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

@router.get("/auth/test")
async def auth_test():
    return {"status": "ok", "message": "Auth router is reachable via GET"}

# Developer email addresses - map to "developer" role
DEV_EMAILS = ["neurocoderz@gmail.com"]

class TokenRequest(BaseModel):
    token: str = Field(..., description="Google ID Token")

@router.post("/auth/token", response_model=Dict[str, str])
async def login_with_google(token_data: TokenRequest):
    """
    Принимает Google ID токен, обменивает на JWT.
    """
    logger.info(f"Received login request for Google token (standardized route)")
    google_token = token_data.token
    if not google_token:
        logger.warning("Empty token received in standardized route")
        raise HTTPException(status_code=400, detail="Token not provided")

    google_user_info = await verify_google_token(google_token)
    email = google_user_info.get("email")
    google_id = google_user_info.get("sub")

    role = "developer" if email in DEV_EMAILS else "user"
    
    access_token = create_access_token(
        data={"sub": google_id, "email": email, "role": role}
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": role,
        "email": email
    }

@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Возвращает информацию о текущем пользователе на основе JWT.
    """
    return current_user