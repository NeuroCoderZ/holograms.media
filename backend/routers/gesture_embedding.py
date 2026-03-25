# backend/routers/gesture_embedding.py
"""
REST API для Gesture Embedding — мост между фронтенд KNN и Gemini Embedding 2.

Endpoints:
  POST /api/v1/gestures/embed — распознание жеста через мультимодальный эмбеддинг
  POST /api/v1/gestures/register — регистрация нового жеста в глобальной Триа
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import hashlib
import json

from backend.auth import security
from backend.core.models.user_models import UserInDB
from backend.core.db.astra_connector import get_db
from backend.services.gemini_embedding_service import gemini_embeddings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/gestures",
    tags=["Gesture Embedding"]
)


# --- Models ---

class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0

class GestureEmbedRequest(BaseModel):
    landmarks: List[Landmark]
    local_candidate: Optional[str] = None
    local_score: Optional[float] = None
    mode: Optional[str] = "verify"  # "verify" or "full_search"
    context: Optional[Dict[str, Any]] = {}

class GestureRegisterRequest(BaseModel):
    name: str
    landmarks: List[Landmark]
    metadata: Optional[Dict[str, Any]] = {}

class GestureEmbedResponse(BaseModel):
    intent: Optional[str] = None
    confidence: float = 0.0
    metadata: Dict[str, Any] = {}
    matches: List[Dict[str, Any]] = []


# --- Helpers ---

def landmarks_to_text(landmarks: List[Landmark], intent_hint: str = None) -> str:
    """
    Конвертирует landmarks в текстовое описание для Gemini Embedding 2.
    Текстовое представление позволяет использовать тот же embedding space,
    что и для текстовых документов в RAG.
    """
    parts = []
    parts.append(f"Hand gesture with {len(landmarks)} landmarks.")
    
    # Key geometric features
    if len(landmarks) >= 21:
        wrist = landmarks[0]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]
        thumb_tip = landmarks[4]
        
        # Pinch distance (thumb-index)
        pinch = ((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2) ** 0.5
        # Spread (index-middle)
        spread = ((index_tip.x - middle_tip.x)**2 + (index_tip.y - middle_tip.y)**2) ** 0.5
        # Hand size (wrist to middle tip)
        hand_size = ((wrist.x - middle_tip.x)**2 + (wrist.y - middle_tip.y)**2) ** 0.5
        
        parts.append(f"Pinch distance: {pinch:.4f}")
        parts.append(f"Finger spread: {spread:.4f}")
        parts.append(f"Hand size: {hand_size:.4f}")
    
    if intent_hint:
        parts.append(f"Possible intent: {intent_hint}")
    
    # Compact coordinate dump for embedding precision
    coords = [f"({l.x:.3f},{l.y:.3f},{l.z:.3f})" for l in landmarks[:21]]
    parts.append("Coordinates: " + " ".join(coords))
    
    return " | ".join(parts)


# --- Endpoints ---

@router.post("/embed", response_model=GestureEmbedResponse)
async def embed_gesture(
    request: GestureEmbedRequest,
    current_user: UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    """
    Распознание жеста через Gemini Embedding 2 + AstraDB vector search.
    """
    if not request.landmarks or len(request.landmarks) < 21:
        raise HTTPException(status_code=400, detail="Minimum 21 landmarks required")
    
    try:
        # 1. Создаём текстовое описание для эмбеддинга
        text_repr = landmarks_to_text(request.landmarks, request.local_candidate)
        
        # 2. Gemini Embedding 2 (3072d)
        vector = await gemini_embeddings.get_embedding(
            text_repr, 
            task_type="RETRIEVAL_QUERY"
        )
        
        if not vector:
            return GestureEmbedResponse(
                intent=request.local_candidate,
                confidence=request.local_score or 0.0,
                metadata={"fallback": True}
            )
        
        # 3. AstraDB vector search
        if db is None:
            logger.warning("DB unavailable for gesture search")
            return GestureEmbedResponse(
                intent=request.local_candidate,
                confidence=request.local_score or 0.0,
                metadata={"fallback": True, "reason": "db_unavailable"}
            )
        
        collection = db.get_collection("tria_gestures")
        
        # User-specific + global gestures
        user_id = getattr(current_user, "user_id", None) or getattr(current_user, "id", None)
        rls_filter = {"$or": [
            {"metadata.visibility": "global"},
            {"metadata.owner_id": str(user_id)}
        ]}
        
        results = await collection.find(
            filter=rls_filter,
            sort={"$vector": vector},
            limit=5,
            include_similarity=True
        ).to_list()
        
        matches = []
        best_intent = None
        best_confidence = 0.0
        best_metadata = {}
        
        for r in results:
            similarity = r.get("$similarity", 0.0)
            meta = r.get("metadata", {})
            name = meta.get("intent", r.get("name", "unknown"))
            
            matches.append({
                "intent": name,
                "confidence": similarity,
                "source": meta.get("source", "global")
            })
            
            if similarity > best_confidence:
                best_confidence = similarity
                best_intent = name
                best_metadata = meta
        
        # 4. Если облачный результат лучше локального
        if best_intent and best_confidence > (request.local_score or 0.0):
            return GestureEmbedResponse(
                intent=best_intent,
                confidence=best_confidence,
                metadata=best_metadata,
                matches=matches
            )
        
        # Fallback к локальному кандидату
        return GestureEmbedResponse(
            intent=request.local_candidate,
            confidence=request.local_score or 0.0,
            metadata={"source": "local_preferred"},
            matches=matches
        )
        
    except Exception as e:
        logger.error(f"Gesture embed error: {e}")
        return GestureEmbedResponse(
            intent=request.local_candidate,
            confidence=request.local_score or 0.0,
            metadata={"error": str(e)}
        )


@router.post("/register", response_model=Dict[str, Any])
async def register_gesture(
    request: GestureRegisterRequest,
    current_user: UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    """
    Регистрация нового жеста в глобальной Триа (AstraDB).
    Вызывается из панели жестов при создании/редактировании.
    """
    if not request.landmarks or len(request.landmarks) < 21:
        raise HTTPException(status_code=400, detail="Minimum 21 landmarks required")
    
    try:
        # 1. Эмбеддинг через Gemini 2
        text_repr = landmarks_to_text(request.landmarks, request.name)
        vector = await gemini_embeddings.get_embedding(
            text_repr,
            task_type="RETRIEVAL_DOCUMENT"
        )
        
        if not vector:
            raise HTTPException(status_code=503, detail="Embedding service unavailable")
        
        # 2. Сохранение в AstraDB
        user_id = getattr(current_user, "user_id", None) or getattr(current_user, "id", None)
        
        chunk_id = hashlib.sha256(
            f"gesture:{user_id}:{request.name}:{len(request.landmarks)}".encode()
        ).hexdigest()
        
        document = {
            "_id": chunk_id,
            "$vector": vector,
            "name": request.name,
            "content": text_repr,
            "metadata": {
                "intent": request.name,
                "owner_id": str(user_id),
                "visibility": request.metadata.get("visibility", "personal"),
                "source": "gesture_panel",
                "landmark_count": len(request.landmarks),
                **request.metadata
            }
        }
        
        if db is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        
        collection = db.get_collection("tria_gestures")
        await collection.insert_one(document)
        
        logger.info(f"Registered gesture '{request.name}' for user {user_id}")
        
        return {
            "status": "registered",
            "gesture_id": chunk_id,
            "name": request.name,
            "vector_dim": len(vector)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gesture register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
