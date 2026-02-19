# backend/routers/signaling.py
import re
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import List, Dict
from backend.auth.security import get_current_active_user_ws

MAX_MESSAGE_SIZE = 65536  # 64KB limit for signaling messages
ROOM_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{4,36}$')

class ConnectionManager:
    def __init__(self):
        # Словарь для хранения активных соединений.
        # Ключ - room_id, значение - список WebSocket соединений.
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """Принимает новое WebSocket соединение и добавляет его в комнату."""
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        print(f"Client connected to room {room_id}. Total clients: {len(self.active_connections[room_id])}")


    def disconnect(self, websocket: WebSocket, room_id: str):
        """Отключает WebSocket и удаляет его из комнаты."""
        if room_id in self.active_connections:
            try:
                self.active_connections[room_id].remove(websocket)
                print(f"Client disconnected from room {room_id}. Total clients: {len(self.active_connections[room_id])}")
            except ValueError:
                # Соединение уже было удалено, например, в ходе массовой очистки
                pass
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, message: str, room_id: str, sender: WebSocket):
        """Транслирует сообщение всем клиентам в комнате, кроме отправителя."""
        if room_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    try:
                        # Проверяем состояние перед отправкой
                        if connection.client_state.value == 1: # CONNECTED
                            await connection.send_text(message)
                            print(f"Message broadcasted to a client in room {room_id}")
                        else:
                            disconnected.append(connection)
                    except Exception as e:
                        print(f"Failed to send message in room {room_id}: {e}")
                        disconnected.append(connection)
            
            # Удаляем те, что упали или неактивны
            for conn in disconnected:
                try:
                    self.active_connections[room_id].remove(conn)
                except ValueError:
                    pass
            
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]


router = APIRouter()
manager = ConnectionManager()

@router.get("/test-signaling")
async def test_signaling_endpoint():
    return {"message": "Signaling router is active!"}

@router.websocket("/ws/signaling/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str,
    # [SECURITY] Lockdown: Обязательная аутентификация для сигналинга
    user: dict = Depends(get_current_active_user_ws)
):
    """
    WebSocket эндпоинт для сигналинга WebRTC.

    - Валидирует room_id (защита от injection).
    - Принимает соединение от клиента.
    - Слушает сообщения (SDP, ICE candidates).
    - Ретранслирует полученные сообщения всем остальным участникам в той же комнате.
    """
    # ✅ Валидация room_id
    if not ROOM_ID_PATTERN.match(room_id):
        await websocket.close(code=1008, reason="Invalid room_id format")
        return

    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            # ✅ Лимит размера сообщения (защита от DoS)
            if len(data) > MAX_MESSAGE_SIZE:
                print(f"Message too large from client in room {room_id}: {len(data)} bytes")
                continue
            # Просто ретранслируем полученные данные всем остальным в комнате
            await manager.broadcast_to_room(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        print(f"Client in room {room_id} disconnected gracefully.")
    except Exception as e:
        print(f"An error occurred in websocket for room {room_id}: {e}")
        manager.disconnect(websocket, room_id)