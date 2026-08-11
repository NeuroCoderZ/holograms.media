# backend/routers/auth.py
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict

from pydantic import BaseModel, Field

from backend.auth.security import verify_google_token, create_access_token, get_current_user
from backend.auth.telegram_auth import TelegramAuthError, validate_init_data_hmac
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Окно свежести initData. Дока Telegram допускает до 24 ч, берём час:
# для входа этого с запасом хватает, а окно replay-атаки короче в 24 раза.
TELEGRAM_INIT_DATA_MAX_AGE = 3600

router = APIRouter(tags=["Authentication"])

@router.get("/test")
async def auth_test():
    return {"status": "ok", "message": "Auth router is reachable via GET"}

# Developer email addresses - map to "developer" role
DEV_EMAILS = ["neurocoderz@gmail.com"]

class TokenRequest(BaseModel):
    token: str = Field(..., description="Google ID Token")

@router.post("/token", response_model=Dict[str, str])
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

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Возвращает информацию о текущем пользователе на основе JWT.
    """
    return current_user


class TelegramAuthRequest(BaseModel):
    init_data: str = Field(..., description="Telegram.WebApp.initData (сырая строка)")


@router.post("/telegram", response_model=Dict[str, str])
async def login_with_telegram(payload: TelegramAuthRequest):
    """Принимает initData из Telegram Mini App, обменивает на JWT.

    До 2026-08-11 этого пути не существовало: фронт брал `initDataUnsafe`
    и аутентифицировал пользователя без проверки подписи, то есть любой мог
    подделать данные и войти под чужим Telegram ID (аудит L1-C).

    Здесь initData проверяется по официальной схеме HMAC-SHA256
    (core.telegram.org/bots/webapps) вместе со свежестью auth_date.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN is not configured — Telegram login disabled")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram login is not configured",
        )

    try:
        data = validate_init_data_hmac(
            payload.init_data,
            settings.TELEGRAM_BOT_TOKEN,
            max_age_seconds=TELEGRAM_INIT_DATA_MAX_AGE,
        )
    except TelegramAuthError as exc:
        # Причина пишется в лог, наружу — обобщённо, чтобы не помогать подбору.
        logger.warning("Telegram initData rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication data",
        ) from exc

    user = data.get("user") or {}
    telegram_id = user.get("id")
    if not telegram_id:
        raise HTTPException(status_code=400, detail="Telegram user id is missing")

    # У Telegram нет email — роль по умолчанию пользовательская.
    # Привязка к существующему аккаунту делается отдельным эндпоинтом /link
    # с двойным доказательством владения (см. docs/AUTH_ARCHITECTURE.md).
    access_token = create_access_token(
        data={
            "sub": f"tg:{telegram_id}",
            "telegram_id": telegram_id,
            "username": user.get("username"),
            "role": "user",
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "user",
        "telegram_id": str(telegram_id),
    }