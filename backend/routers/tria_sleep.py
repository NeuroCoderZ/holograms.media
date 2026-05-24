# backend/routers/tria_sleep.py
"""
Sleep Cycle API — асинхронная консолидация памяти Personal Tria.

Endpoints:
  POST /api/v1/tria/sleep-sync — приём Soma-блоков, векторизация, возврат предиктивных эмбеддингов
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import hashlib

from backend.auth import security
from backend.core.models.user_models import UserInDB
from backend.core.db.astra_connector import get_db
from backend.services.gemini_embedding_service import gemini_embeddings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tria",
    tags=["Tria Sleep"]
)


# --- Models ---

class SomaBlock(BaseModel):
    intent: str
    landmarks: List[Dict[str, float]]
    metadata: Dict[str, Any] = {}
    timestamp: Optional[int] = None


class SleepSyncRequest(BaseModel):
    soma_blocks: List[SomaBlock]
    tria_id: str = "anonymous_tria"


class PredictiveEmbedding(BaseModel):
    intent: str
    landmarks: List[Dict[str, float]] = []
    metadata: Dict[str, Any] = {}
    confidence: float = 0.0


class SleepSyncResponse(BaseModel):
    status: str
    blocks_processed: int
    predictions: List[PredictiveEmbedding] = []


# --- Helpers ---

def _soma_to_text(block: SomaBlock) -> str:
    """Конвертирует Soma-блок в текстовое описание для Gemini Embedding 2."""
    coords = " ".join(
        f"({l.get('x', 0):.3f},{l.get('y', 0):.3f},{l.get('z', 0):.3f})"
        for l in block.landmarks[:21]
    )
    return f"Gesture intent: {block.intent} | Landmarks: {coords} | Context: {block.metadata}"


def _generate_predictive_from_matches(matches: List[Dict], top_k: int = 5) -> List[PredictiveEmbedding]:
    """Генерирует предиктивные эмбеддинги на основе найденных совпадений."""
    predictions = []
    seen = set()
    for m in matches:
        intent = m.get("intent") or m.get("name", "unknown")
        if intent not in seen and len(predictions) < top_k:
            seen.add(intent)
            predictions.append(PredictiveEmbedding(
                intent=intent,
                metadata=m.get("metadata", {}),
                confidence=m.get("$similarity", 0.0)
            ))
    return predictions


# --- Endpoint ---

@router.post("/sleep-sync", response_model=SleepSyncResponse)
async def sleep_sync(
    request: SleepSyncRequest,
    current_user: UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    """
    Асинхронная консолидация памяти Personal Tria (Sleep Cycle).
    Принимает Soma-блоки, векторизует их и возвращает предиктивные эмбеддинги.
    """
    if not request.soma_blocks:
        return SleepSyncResponse(
            status="no_data",
            blocks_processed=0,
            predictions=[]
        )

    user_id = getattr(current_user, "user_id", None) or getattr(current_user, "id", None) or request.tria_id
    predictions = []

    try:
        # 1. Векторизация каждого Soma-блока
        vectors = []
        for block in request.soma_blocks:
            text_repr = _soma_to_text(block)
            vector = await gemini_embeddings.get_embedding(
                text_repr,
                task_type="RETRIEVAL_DOCUMENT"
            )
            if vector:
                vectors.append({"vector": vector, "intent": block.intent, "metadata": block.metadata})

        # 2. Поиск ассоциативных кластеров в AstraDB
        if db is not None and vectors:
            collection = db.get_collection("tria_knowledge_gemini")
            if collection is not None:
                all_matches = []
                for v in vectors:
                    try:
                        results = await collection.find(
                            sort={"$vector": v["vector"]},
                            limit=5,
                            include_similarity=True
                        ).to_list()
                        for r in results:
                            sim = r.get("$similarity", 0.0)
                            if sim > 0.7:
                                all_matches.append(r)
                    except Exception:
                        continue

                predictions = _generate_predictive_from_matches(all_matches)

        # 3. Если нет ассоциаций в базе, возвращаем сами интенты как прогнозы
        if not predictions:
            for v in vectors[:5]:
                predictions.append(PredictiveEmbedding(
                    intent=v["intent"],
                    metadata=v["metadata"],
                    confidence=1.0
                ))

        logger.info(f"[Sleep Cycle] Processed {len(request.soma_blocks)} blocks for user {user_id}, returned {len(predictions)} predictions")

        return SleepSyncResponse(
            status="completed",
            blocks_processed=len(request.soma_blocks),
            predictions=predictions
        )

    except Exception as e:
        logger.error(f"[Sleep Cycle] Error processing sleep-sync: {e}")
        return SleepSyncResponse(
            status="error",
            blocks_processed=0,
            predictions=[]
        )
