# backend/routers/signaling.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict

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
            self.active_connections[room_id].remove(websocket)
            print(f"Client disconnected from room {room_id}. Total clients: {len(self.active_connections[room_id])}")
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, message: str, room_id: str, sender: WebSocket):
        """Транслирует сообщение всем клиентам в комнате, кроме отправителя."""
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    await connection.send_text(message)
                    print(f"Message broadcasted to a client in room {room_id}")


router = APIRouter()
manager = ConnectionManager()

@router.get("/test-signaling")
async def test_signaling_endpoint():
    return {"message": "Signaling router is active!"}

@router.websocket("/ws/signaling/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """
    WebSocket эндпоинт для сигналинга WebRTC.

    - Принимает соединение от клиента.
    - Слушает сообщения (SDP, ICE candidates).
    - Ретранслирует полученные сообщения всем остальным участникам в той же комнате.
    """
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Просто ретранслируем полученные данные всем остальным в комнате
            await manager.broadcast_to_room(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        # Можно добавить логику оповещения остальных участников, но для сигналинга это не обязательно.
        print(f"Client in room {room_id} disconnected gracefully.")
    except Exception as e:
        print(f"An error occurred in websocket for room {room_id}: {e}")
        manager.disconnect(websocket, room_id)