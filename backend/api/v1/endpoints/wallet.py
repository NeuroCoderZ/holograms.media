# backend/api/v1/endpoints/wallet.py
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict
import logging
from backend.core.db.astra_connector import get_astra_db
from backend.core.crud_operations import update_user_obolos, get_user_by_id
from backend.auth.security import get_current_active_user_ws # reusing auth logic

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/obolos/sync")
async def sync_obolos(
    request: Request,
    payload: Dict[str, float]
):
    """
    Synchronizes the user's Obolos balance.
    Expects: {"amount": float, "user_id": str}
    Note: In a production environment, user_id should be extracted from JWT.
    """
    user_id = payload.get("user_id")
    amount = payload.get("amount", 0.0)
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
        
    db = request.app.state.astra_db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
        
    new_balance = await update_user_obolos(db, user_id, amount)
    
    if new_balance is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "success": True,
        "new_balance": new_balance,
        "synced_amount": amount
    }

@router.get("/obolos/balance/{user_id}")
async def get_balance(user_id: str, request: Request):
    db = request.app.state.astra_db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
        
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"user_id": user_id, "obolos_balance": getattr(user, "obolos_balance", 0.0)}
