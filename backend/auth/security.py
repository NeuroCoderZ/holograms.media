# backend/auth/security.py
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status, WebSocket, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import logging

# Предполагается, что модель пользователя и функции для работы с БД будут импортированы
# from backend.db.user_repository import get_user_by_google_id, create_user_from_google_info
# from backend.models.user import UserInDB

from backend.core.config import settings

logger = logging.getLogger(__name__)

# --- Конфигурация взята из центрального файла backend/core/config.py ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Создает JWT токен."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_google_token(token: str) -> Dict[str, Any]:
    """Проверяет ID токен от Google."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token is missing")
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError as e:
        logger.error(f"Invalid Google token: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {e}")
    except Exception as e:
        logger.error(f"Error verifying Google token: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not process Google token: {e}")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Декодирует JWT из заголовка для HTTP эндпоинтов."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        google_id: str = payload.get("sub")
        if google_id is None:
            raise credentials_exception
        
        # ЗАГЛУШКА: Возвращаем данные из токена, пока нет интеграции с БД
        user_data = {
            "id": google_id, # Добавляем поле id для совместимости
            "google_id": google_id,
            "email": payload.get("email"),
            "is_active": True
        }
        return user_data

    except JWTError:
        raise credentials_exception

async def get_current_user_ws(token: str = Query(...)):
    """Декодирует JWT из query-параметра для WebSocket."""
    # Эта функция дублирует get_current_user, но берет токен из Query.
    # В будущем можно будет рефакторить для избежания дублирования.
    return await get_current_user(token)


async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Проверяет, активен ли пользователь (для HTTP)."""
    if not current_user.get("is_active", False):
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_active_user_ws(current_user: dict = Depends(get_current_user_ws)):
    """Проверяет, активен ли пользователь (для WS)."""
    if not current_user.get("is_active", False):
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_optional_current_active_user_ws(token: Optional[str] = Query(None)):
    """Опциональная аутентификация для WebSocket."""
    if not token:
        return None
    try:
        return await get_current_user(token)
    except Exception:
        return None
