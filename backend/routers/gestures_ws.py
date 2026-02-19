# backend/routers/gestures_ws.py
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
# from astrapy import Database # Will be injected via Depends

# Импортируем сервис после того, как он будет создан.
# Для корректной работы FastAPI при запуске, лучше, чтобы импорт был сверху.
# Если GestureIntentService еще не создан, можно временно закомментировать
# или создать заглушку сервиса, чтобы файл мог быть импортирован в app.py.
# Поскольку мы создаем сервис на следующем шаге, пока оставляем как есть.
# from backend.services.gesture_intent_service import GestureIntentService # Заменено на CoordinationService
from backend.tria_agents.CoordinationService import CoordinationService # <-- НОВЫЙ ИМПОРТ
from backend.core.db.astra_connector import get_db
# Для аутентификации предполагается, что UserInDB импортируется security
from backend.auth.security import get_current_active_user_ws
from typing import Any, Optional

router = APIRouter(tags=["Real-time Gesture Intents"])
logger = logging.getLogger(__name__)

@router.websocket("/ws/v1/gesture-intent")
async def websocket_endpoint(
    websocket: WebSocket,
    # [SECURITY] Lockdown: Строгая аутентификация. Анонимные соединения отклоняются FastAPI до вызова функции.
    user: dict = Depends(get_current_active_user_ws),
    db: Any = Depends(get_db),
):
    # ✅ Accept connection ONLY AFTER auth check (FastAPI handles auth before this via Depends)
    await websocket.accept()
    user_id = user.get("id")
    logger.info(f"WebSocket connection established for authenticated user {user_id}")

    if db is None:
        logger.error(f"Database connection not available for user {user_id}")
        await websocket.send_json({"status": "error", "message": "Database connection unavailable. Some features may be limited."})
        # We can keep the connection open or close it gracefully
        # await websocket.close(code=1011, reason="Database Unavailable")
        # return

    try:
        # ✅ Инициализируем CoordinationService c защитой от сбоев
        coordination_service = CoordinationService(db) # Передаем db_conn (even if None, service should handle it)
    except Exception as e:
        logger.error(f"Failed to initialize CoordinationService for user {user_id}: {e}", exc_info=True)
        await websocket.send_json({"status": "error", "message": "Internal Server Error: AI Services Initialization Failed"})
        await websocket.close(code=1011)
        return

    try:
        while True:
            data = await websocket.receive_json()
            # Ожидаем данные в формате {"intent": "select", "context": {...}}
            # Проверка data и его содержимого (intent) должна быть здесь или в CoordinationService
            intent_val = data.get("intent") # переименовал, чтобы не конфликтовать с модулем `intent`

            if not intent_val:
                logger.warning(f"Received WebSocket message without intent from user {user.id if user else 'unknown'}")
                await websocket.send_json({"status": "error", "message": "Intent not provided in message data"})
                continue

            logger.info(f"Received intent_data from user {user.id if user else 'unknown'}: {data}")


            # ✅ Вызываем центральный обработчик
            user_identifier = user.get("id")

            result = await coordination_service.handle_gesture_intent(user_id=user_identifier, intent_data=data)

            await websocket.send_json(result)

    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed for user {user_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket for user {user_id}: {e}", exc_info=True)
        # Попытаемся закрыть соединение с кодом ошибки, если оно еще открыто
        if websocket.client_state != WebSocketDisconnect: # Проверка состояния сокета
             await websocket.close(code=1011) # INTERNAL_SERVER_ERROR