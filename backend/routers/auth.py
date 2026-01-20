# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict

from backend.auth.security import verify_google_token, create_access_token
# import user repository functions when they are ready
# from backend.db.user_repository import get_user_by_google_id, create_user_from_google_info

router = APIRouter(tags=["Authentication"])

@router.post("/auth/google", response_model=Dict[str, str])
async def login_with_google(token_data: Dict[str, str] = Body(...)):
    """
    Принимает Google ID токен, верифицирует его, находит или создает пользователя,
    и возвращает собственный JWT токен доступа.
    """
    google_token = token_data.get("token")
    if not google_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token not provided in the request body.",
        )

    google_user_info = await verify_google_token(google_token)
    
    google_id = google_user_info.get("sub")
    email = google_user_info.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token is invalid or missing required claims (sub, email).",
        )

    # --- Интеграция с БД (AstraDB) ---
    # user = await get_user_by_google_id(google_id)
    # if not user:
    #     user = await create_user_from_google_info(google_user_info)
    
    # ЗАГЛУШКА: Вместо реальной работы с БД, мы просто доверяем токену
    # и создаем JWT на основе информации из него.
    
    # Создаем наш собственный JWT
    access_token = create_access_token(
        data={"sub": google_id, "email": email}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}