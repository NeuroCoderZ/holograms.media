from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import logging
import json
from datetime import datetime

from backend.core.models.earth_models import (
    EarthNodeCreate, EarthNodeDB, EarthNodeUpdate, EarthScene, EarthShareRequest
)
from backend.services.earth_service import EarthService
from backend.auth.security import get_current_active_user, get_current_active_user_ws, get_optional_current_active_user_ws
from backend.core.db.astra_connector import get_db

router = APIRouter(tags=["Earth Storage"])
logger = logging.getLogger(__name__)

active_rooms: Dict[str, List[WebSocket]] = {}

def get_earth_service(db=Depends(get_db)) -> EarthService:
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return EarthService(db)

@router.get("/earth/{earth_id}/scene", response_model=EarthScene)
async def get_earth_scene(
    earth_id: str,
    service: EarthService = Depends(get_earth_service),
    _=Depends(get_current_active_user)
):
    return await service.get_scene(earth_id)

@router.get("/earth/{earth_id}/nodes", response_model=List[EarthNodeDB])
async def list_earth_nodes(
    earth_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    service: EarthService = Depends(get_earth_service),
    _=Depends(get_current_active_user)
):
    return await service.get_nodes(earth_id, skip, limit)

@router.get("/earth/{earth_id}/nodes/{node_id}", response_model=EarthNodeDB)
async def get_earth_node(
    earth_id: str,
    node_id: str,
    service: EarthService = Depends(get_earth_service),
    _=Depends(get_current_active_user)
):
    node = await service.get_node(node_id, earth_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.post("/earth/{earth_id}/nodes", response_model=EarthNodeDB, status_code=201)
async def create_earth_node(
    earth_id: str,
    node_in: EarthNodeCreate,
    service: EarthService = Depends(get_earth_service),
    current_user=Depends(get_current_active_user)
):
    node = await service.create_node(earth_id, current_user.user_id, node_in)
    if not node:
        raise HTTPException(status_code=500, detail="Failed to create node")
    await _broadcast_to_room(earth_id, {"action": "node_created", "node": node.dict()})
    return node

@router.patch("/earth/{earth_id}/nodes/{node_id}", response_model=EarthNodeDB)
async def update_earth_node(
    earth_id: str,
    node_id: str,
    update: EarthNodeUpdate,
    service: EarthService = Depends(get_earth_service),
    current_user=Depends(get_current_active_user)
):
    node = await service.update_node(node_id, earth_id, current_user.user_id, update)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not owned")
    await _broadcast_to_room(earth_id, {"action": "node_updated", "node": node.dict()})
    return node

@router.delete("/earth/{earth_id}/nodes/{node_id}", status_code=204)
async def delete_earth_node(
    earth_id: str,
    node_id: str,
    service: EarthService = Depends(get_earth_service),
    current_user=Depends(get_current_active_user)
):
    deleted = await service.delete_node(node_id, earth_id, current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Node not found or not owned")
    await _broadcast_to_room(earth_id, {"action": "node_deleted", "node_id": node_id})

@router.post("/earth/{earth_id}/share", response_model=Dict[str, Any])
async def share_nodes(
    earth_id: str,
    share: EarthShareRequest,
    service: EarthService = Depends(get_earth_service),
    current_user=Depends(get_current_active_user)
):
    count = await service.share_nodes(share.node_ids, earth_id, share.target_earth_id, current_user.user_id)
    return {"shared": count, "target_earth": share.target_earth_id}

@router.get("/earth/{earth_id}/shared", response_model=List[EarthNodeDB])
async def list_shared_nodes(
    earth_id: str,
    service: EarthService = Depends(get_earth_service),
    _=Depends(get_current_active_user)
):
    return await service.get_shared(earth_id)

@router.post("/earth/{earth_id}/import", response_model=List[EarthNodeDB])
async def import_shared_nodes(
    earth_id: str,
    node_ids: List[str],
    service: EarthService = Depends(get_earth_service),
    _=Depends(get_current_active_user)
):
    return await service.import_shared(earth_id, node_ids)


@router.websocket("/ws/v1/earth/{earth_id}")
async def earth_ws(
    websocket: WebSocket,
    earth_id: str,
    user=Depends(get_current_active_user_ws),
    db=Depends(get_db)
):
    await websocket.accept()
    user_id = user.get("id")
    logger.info(f"[EarthWS] {user_id} joined room {earth_id}")

    if earth_id not in active_rooms:
        active_rooms[earth_id] = []
    active_rooms[earth_id].append(websocket)

    service = EarthService(db) if db else None

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            action = data.get("action")

            if action == "patch" and service:
                patches = data.get("patches", [])
                count = await service.apply_remote_patch(earth_id, patches)
                await _broadcast_to_room(earth_id, {
                    "action": "patches_applied",
                    "patches": patches,
                    "by": user_id,
                    "count": count
                }, exclude=websocket)

            elif action == "sync_request" and service:
                nodes = await service.get_nodes(earth_id, limit=500)
                await websocket.send_json({
                    "action": "sync_full",
                    "nodes": [n.dict() for n in nodes],
                    "earth_id": earth_id
                })

            elif action == "ping":
                await websocket.send_json({"action": "pong"})

    except WebSocketDisconnect:
        logger.info(f"[EarthWS] {user_id} left room {earth_id}")
    except Exception as e:
        logger.error(f"[EarthWS] Error in room {earth_id}: {e}")
    finally:
        if earth_id in active_rooms:
            active_rooms[earth_id] = [ws for ws in active_rooms[earth_id] if ws != websocket]
            if not active_rooms[earth_id]:
                del active_rooms[earth_id]


async def _broadcast_to_room(earth_id: str, message: dict, exclude: WebSocket = None):
    if earth_id not in active_rooms:
        return
    dead = []
    for ws in active_rooms[earth_id]:
        if ws == exclude:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        active_rooms[earth_id].remove(ws)
