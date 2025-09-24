# backend/routers/gestures_ws.py
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import asyncpg

# Импортируем сервис после того, как он будет создан.
# Для корректной работы FastAPI при запуске, лучше, чтобы импорт был сверху.
# Если GestureIntentService еще не создан, можно временно закомментировать
# или создать заглушку сервиса, чтобы файл мог быть импортирован в app.py.
# Поскольку мы создаем сервис на следующем шаге, пока оставляем как есть.
# from backend.services.gesture_intent_service import GestureIntentService # Заменено на CoordinationService
from backend.tria_bots.CoordinationService import CoordinationService # <-- НОВЫЙ ИМПОРТ
from backend.core.db.pg_connector import get_db_connection
# Для аутентификации предполагается, что UserInDB импортируется security
from backend.auth.security import get_current_active_user_ws

router = APIRouter(tags=["Real-time Gesture Intents"])
logger = logging.getLogger(__name__)

@router.websocket("/ws/v1/gesture-intent")
async def websocket_endpoint(
    websocket: WebSocket,
    user: dict = Depends(get_current_active_user_ws),
        db: asyncpg.Connection = Depends(get_db_connection),
):
    await websocket.accept()
    logger.info(f"WebSocket connection established for user {user.id if user else 'unknown'}")


    # ✅ Инициализируем CoordinationService
    coordination_service = CoordinationService(db) # Передаем db_conn

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
            # Убедимся, что user.id передается, если user объект существует
            user_identifier = user.id if user else "anonymous_websocket_user" # Fallback, если user почему-то None

            result = await coordination_service.handle_gesture_intent(user_id=user_identifier, intent_data=data)

            await websocket.send_json(result)

    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed for user {user.id if user else 'unknown'}")
    except Exception as e:
        logger.error(f"Error in WebSocket for user {user.id if user else 'unknown'}: {e}", exc_info=True)
        # Попытаемся закрыть соединение с кодом ошибки, если оно еще открыто
        if websocket.client_state != WebSocketDisconnect: # Проверка состояния сокета
             await websocket.close(code=1011) # INTERNAL_SERVER_ERROR