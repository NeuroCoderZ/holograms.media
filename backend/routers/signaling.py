# backend/routers/signaling.py
import asyncio
import re
import time
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from typing import List, Dict, Any
import json
from backend.auth.security import get_current_active_user_ws, get_current_active_user

MAX_MESSAGE_SIZE = 65536  # 64KB limit for signaling messages
ROOM_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{4,36}$")

# --- HTTP-фолбэк сигналинга (2026-08-10) ---
# Клиент (netHoloGlyphClient.startFallbackPolling) уходит в long-poll, когда WebSocket
# недоступен: Koyeb/Cloudflare рвут соединение при простое (наблюдался код 1006).
# До сих пор фолбэк был мёртвым — HTTP-эндпоинтов не существовало, poll всегда получал
# 404 и молча гасил ошибку в catch, а отправить answer/candidate было вообще нечем.
FALLBACK_TTL_SECONDS = 120     # сообщение живёт 2 минуты
FALLBACK_ROOM_LIMIT = 200      # максимум сообщений в комнате (защита от роста памяти)


class FallbackQueue:
    """Очередь сигналинг-сообщений в памяти для клиентов без WebSocket.

    Каждое сообщение помечается отправителем (sender_id), чтобы poll не возвращал
    клиенту его же сообщения — иначе он получит собственный offer обратно.
    """

    def __init__(self):
        self._rooms: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    async def push(self, room_id: str, sender_id: str, payload: str) -> None:
        async with self._lock:
            room = self._rooms.setdefault(room_id, [])
            room.append({
                "id": uuid.uuid4().hex,
                "sender_id": sender_id,
                "payload": payload,
                "ts": time.time(),
            })
            self._prune(room_id)

    async def pull(self, room_id: str, receiver_id: str, after: str | None = None) -> List[Dict[str, Any]]:
        async with self._lock:
            self._prune(room_id)
            room = self._rooms.get(room_id, [])
            start = 0
            if after:
                for i, m in enumerate(room):
                    if m["id"] == after:
                        start = i + 1
                        break
            return [
                {"id": m["id"], "sender_id": m["sender_id"], "payload": m["payload"]}
                for m in room[start:]
                if m["sender_id"] != receiver_id
            ]

    def _prune(self, room_id: str) -> None:
        """Чистит протухшие сообщения. Вызывается под уже захваченным локом."""
        room = self._rooms.get(room_id)
        if not room:
            return
        cutoff = time.time() - FALLBACK_TTL_SECONDS
        room[:] = [m for m in room if m["ts"] >= cutoff]
        if len(room) > FALLBACK_ROOM_LIMIT:
            del room[: len(room) - FALLBACK_ROOM_LIMIT]
        if not room:
            self._rooms.pop(room_id, None)


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
        print(
            f"Client connected to room {room_id}. Total clients: {len(self.active_connections[room_id])}"
        )

    def disconnect(self, websocket: WebSocket, room_id: str):
        """Отключает WebSocket и удаляет его из комнаты."""
        if room_id in self.active_connections:
            try:
                self.active_connections[room_id].remove(websocket)
                print(
                    f"Client disconnected from room {room_id}. Total clients: {len(self.active_connections[room_id])}"
                )
            except ValueError:
                # Соединение уже было удалено, например, в ходе массовой очистки
                pass
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, message: str, room_id: str, sender: WebSocket | None = None):
        """Транслирует сообщение всем клиентам в комнате, кроме отправителя.

        sender=None — сообщение пришло не из WebSocket (HTTP-фолбэк), поэтому
        рассылается всем участникам комнаты без исключений.
        """
        if room_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    try:
                        # Проверяем состояние перед отправкой
                        if connection.client_state.value == 1:  # CONNECTED
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
fallback_queue = FallbackQueue()


def _validate_room_id(room_id: str) -> None:
    """Единая проверка room_id для HTTP-эндпоинтов (WS закрывается кодом 1008)."""
    if not ROOM_ID_PATTERN.match(room_id):
        raise HTTPException(status_code=400, detail="Invalid room_id format")


def _peer_id(current_user: dict, explicit: str | None) -> str:
    """Идентификатор участника: явный peer_id клиента либо владелец JWT."""
    if explicit:
        if not ROOM_ID_PATTERN.match(explicit):
            raise HTTPException(status_code=400, detail="Invalid peer_id format")
        return explicit
    return str(current_user.get("user_id") or current_user.get("sub") or "anonymous")


@router.get("/test-signaling")
async def test_signaling_endpoint():
    return {"message": "Signaling router is active!"}


@router.post("/ws/signaling/{room_id}/send")
async def fallback_send(
    room_id: str,
    body: Dict[str, Any],
    peer_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_active_user),
):
    """HTTP-фолбэк отправки: кладёт сигналинг-сообщение в комнату.

    Сообщение уходит и WebSocket-участникам (broadcast), и в HTTP-очередь — комната
    может быть смешанной: один пир на WS, другой на poll.
    """
    _validate_room_id(room_id)
    sender = _peer_id(current_user, peer_id)

    payload = json.dumps(body, ensure_ascii=False)
    if len(payload) > MAX_MESSAGE_SIZE:
        raise HTTPException(status_code=413, detail="Message too large")

    await fallback_queue.push(room_id, sender, payload)
    await manager.broadcast_to_room(payload, room_id, sender=None)

    return {"status": "ok", "room_id": room_id, "sender_id": sender}


@router.get("/ws/signaling/{room_id}/poll")
async def fallback_poll(
    room_id: str,
    after: str | None = Query(default=None),
    peer_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_active_user),
):
    """HTTP-фолбэк приёма: отдаёт накопленные сообщения комнаты, кроме своих.

    Курсор `after` — id последнего обработанного сообщения. Ответ безопасно
    опрашивать в цикле: без новых сообщений возвращается пустой список.
    """
    _validate_room_id(room_id)
    receiver = _peer_id(current_user, peer_id)

    messages = await fallback_queue.pull(room_id, receiver, after)
    return {
        "room_id": room_id,
        "peer_id": receiver,
        "messages": messages,
        "cursor": messages[-1]["id"] if messages else after,
    }


# Fallback endpoint БЕЗ room_id (для тестирования)
@router.websocket("/ws/signaling")
async def websocket_endpoint_default(websocket: WebSocket):
    """WebSocket эндпоинт без room_id (fallback для тестирования)."""
    await manager.connect(websocket, "default")
    try:
        while True:
            data = await websocket.receive_text()
            if len(data) > MAX_MESSAGE_SIZE:
                continue
            try:
                msg_json = json.loads(data)
                if msg_json.get("type") == "ping":
                    await websocket.send_text('{"type": "pong"}')
                    continue
            except Exception:
                pass
            await manager.broadcast_to_room(data, "default", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, "default")


@router.websocket("/ws/signaling/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    # [SECURITY] Lockdown: Обязательная аутентификация для сигналинга
    user: dict = Depends(get_current_active_user_ws),
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
    # Идентификатор WS-участника для HTTP-очереди: его сообщения не должны
    # возвращаться ему же при поллинге.
    ws_peer_id = str(user.get("user_id") or user.get("sub") or "ws-peer")
    try:
        while True:
            data = await websocket.receive_text()
            # ✅ Лимит размера сообщения (защита от DoS)
            if len(data) > MAX_MESSAGE_SIZE:
                print(
                    f"Message too large from client in room {room_id}: {len(data)} bytes"
                )
                continue

            # Обработка ping для поддержания соединения (Koyeb idle timeout ~60s)
            try:
                msg_json = json.loads(data)
                if msg_json.get("type") == "ping":
                    await websocket.send_text('{"type": "pong"}')
                    continue
            except Exception:
                pass

            # Ретранслируем WS-участникам и дублируем в HTTP-очередь: комната может быть
            # смешанной (один пир на WebSocket, другой на long-poll после обрыва).
            await manager.broadcast_to_room(data, room_id, websocket)
            await fallback_queue.push(room_id, ws_peer_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        print(f"Client in room {room_id} disconnected gracefully.")
    except Exception as e:
        print(f"An error occurred in websocket for room {room_id}: {e}")
        manager.disconnect(websocket, room_id)
