# backend/api/v1/endpoints/wallet.py
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict
import logging
from backend.core.db.astra_connector import get_astra_db
from backend.core.crud_operations import update_user_obolos, get_user_by_id
from backend.auth.security import get_current_active_user # Correct for HTTP

router = APIRouter()
logger = logging.getLogger(__name__)

from pydantic import BaseModel

class ObolosEarnRequest(BaseModel):
    gesture_count: int  # Количество жестов за сессию

@router.post("/obolos/earn")
async def earn_obolos(
    data: ObolosEarnRequest,
    current_user = Depends(get_current_active_user),  # JWT в заголовках
    request: Request = None
):
    """
    Зачисляет Obolos на основе количества жестов.
    Сервер сам рассчитывает награду, не доверяя клиенту.
    """
    if data.gesture_count < 0 or data.gesture_count > 10000:
        raise HTTPException(status_code=400, detail="Invalid gesture count")
    
    # Формула: 1 жест = 0.000001 Obolos
    reward = round(data.gesture_count * 0.000001, 6)
    
    db = request.app.state.astra_db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
        
    new_balance = await update_user_obolos(db, current_user.user_id, reward)
    
    if new_balance is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "success": True, 
        "reward": reward, 
        "new_balance": new_balance,
        "gestures_processed": data.gesture_count
    }

@router.get("/obolos/balance")
async def get_balance(
    current_user = Depends(get_current_active_user),
    request: Request = None
):
    """Возвращает баланс текущего авторизованного пользователя."""
    db = request.app.state.astra_db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
    user = await get_user_by_id(db, current_user.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": current_user.user_id,
        "obolos_balance": getattr(user, "obolos_balance", 0.0)
    }
