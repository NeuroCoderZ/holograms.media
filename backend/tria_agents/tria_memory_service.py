# backend/tria_agents/tria_memory_service.py
# xMemory-inspired Hierarchical Memory Service для Tria
# Уровни: Original Message → Episode → Semantic → Theme
# Эмбеддинги: ТОЛЬКО gemini-embedding-2-preview (dim=3072)

import logging
import hashlib
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

EMBED_DIM = 3072

try:
    from backend.services.gemini_embedding_service import gemini_embeddings
    from backend.core.db.astra_connector import get_astra_db
except ImportError as e:
    logger.warning(f"xMemory imports failed: {e}")
    gemini_embeddings = None
    get_astra_db = None


async def get_embedding(
    text: str, task_type: str = "RETRIEVAL_DOCUMENT"
) -> Optional[List[float]]:
    """Получить эмбеддинг через gemini-embedding-2-preview."""
    if not gemini_embeddings:
        return None
    vector = await gemini_embeddings.get_embedding(text, task_type=task_type)
    if vector and len(vector) == EMBED_DIM:
        return vector
    logger.error(
        f"xMemory: embedding dim mismatch: {len(vector) if vector else 'None'}"
    )
    return None


async def compress_messages_to_episode(
    messages: List[Dict[str, str]], session_id: str, user_id: str
) -> Optional[Dict[str, Any]]:
    """Преобразует блок сообщений в episodic memory record."""
    if not messages or len(messages) < 2:
        return None

    conversation_text = "\n".join(
        f"{m.get('role', 'user').upper()}: {m.get('content', '')}" for m in messages
    )

    compression_prompt = f"""Ты система episodic memory. Преобразуй диалог в структурированный эпизод.
Диалог:
{conversation_text}

Верни JSON (только JSON, без markdown):
{{
  "title": "краткий заголовок (10-20 слов)",
  "content": "нарратив от третьего лица со всеми фактами, решениями, эмоциями",
  "key_facts": ["факт1", "факт2", "факт3"],
  "timestamp": "{datetime.utcnow().isoformat()}"
}}"""

    try:
        from backend.llm.gemini_llm import get_gemini_response

        response = await get_gemini_response(
            prompt=compression_prompt,
            system_instruction="Ты компрессор памяти. Извлекай только долгосрочно ценные факты. Отвечай ТОЛЬКО JSON.",
            model_id="gemini-3.1-flash-lite-preview",
        )

        import json

        clean = response.strip().replace("```json", "").replace("```", "").strip()
        episode_data = json.loads(clean)

        embed_text = (
            f"{episode_data.get('title', '')}\n{episode_data.get('content', '')}"
        )
        vector = await get_embedding(embed_text, "RETRIEVAL_DOCUMENT")

        if not vector:
            return None

        episode_id = hashlib.sha256(
            f"{user_id}_{session_id}_{episode_data.get('timestamp', '')}".encode()
        ).hexdigest()[:16]

        return {
            "_id": episode_id,
            "type": "episode",
            "level": 1,
            "user_id": user_id,
            "session_id": session_id,
            "title": episode_data.get("title", ""),
            "content": episode_data.get("content", ""),
            "key_facts": episode_data.get("key_facts", []),
            "timestamp": episode_data.get("timestamp", datetime.utcnow().isoformat()),
            "message_count": len(messages),
            "$vector": vector,
        }

    except Exception as e:
        logger.error(f"xMemory compress_to_episode error: {e}")
        return None


async def distill_semantic_from_episode(
    episode: Dict[str, Any], user_id: str
) -> List[Dict[str, Any]]:
    """Извлекает долгосрочные факты из эпизода."""
    semantic_nodes = []
    key_facts = episode.get("key_facts", [])

    if not key_facts:
        return []

    for fact in key_facts[:5]:
        if not fact or len(fact) < 10:
            continue

        vector = await get_embedding(fact, "RETRIEVAL_DOCUMENT")
        if not vector:
            continue

        sem_id = hashlib.sha256(f"{user_id}_{fact[:100]}".encode()).hexdigest()[:16]

        semantic_nodes.append(
            {
                "_id": sem_id,
                "type": "semantic",
                "level": 2,
                "user_id": user_id,
                "episode_id": episode.get("_id", ""),
                "content": fact,
                "theme_id": None,
                "created_at": datetime.utcnow().isoformat(),
                "$vector": vector,
            }
        )

        await asyncio.sleep(0.5)

    return semantic_nodes


async def retrieve_personal_context(
    query: str, user_id: str, limit: int = 5, similarity_threshold: float = 0.50
) -> str:
    """xMemory-inspired retrieval для персональной памяти."""
    try:
        if not get_astra_db:
            return ""

        db = get_astra_db()
        if not db:
            return ""

        query_vector = await get_embedding(query, "RETRIEVAL_QUERY")
        if not query_vector:
            return ""

        collection = db.get_collection("tria_episodic_memory")

        semantic_results = await collection.find(
            filter={"user_id": user_id, "type": "semantic"},
            sort={"$vector": query_vector},
            limit=limit,
            include_similarity=True,
        ).to_list()

        context_blocks = []
        included_episodes = set()

        for res in semantic_results:
            sim = res.get("$similarity", 0.0)
            if sim < similarity_threshold:
                continue

            content = res.get("content", "")
            context_blocks.append(f"[Memory] {content}")

            if sim > 0.70:
                episode_id = res.get("episode_id", "")
                if episode_id and episode_id not in included_episodes:
                    episode_results = await collection.find(
                        filter={"_id": episode_id, "type": "episode"}, limit=1
                    ).to_list()

                    if episode_results:
                        ep = episode_results[0]
                        ep_content = ep.get("content", "")
                        context_blocks.append(f"[Episode] {ep_content[:500]}")
                        included_episodes.add(episode_id)

        if not context_blocks:
            return ""

        logger.info(
            f"xMemory: Retrieved {len(context_blocks)} memory blocks for user {user_id}"
        )
        return "\n\n".join(context_blocks)

    except Exception as e:
        logger.error(f"xMemory retrieve_personal_context error: {e}")
        return ""


async def save_episode_to_memory(
    messages: List[Dict[str, str]], session_id: str, user_id: str
) -> bool:
    """Сохраняет эпизод в AstraDB."""
    if len(messages) < 4:
        return False

    try:
        if not get_astra_db:
            return False

        db = get_astra_db()
        if not db:
            return False

        collection = db.get_collection("tria_episodic_memory")

        episode = await compress_messages_to_episode(messages, session_id, user_id)
        if not episode:
            return False

        await collection.insert_one(episode)
        logger.info(f"xMemory: Saved episode {episode['_id']} for user {user_id}")

        semantic_nodes = await distill_semantic_from_episode(episode, user_id)
        if semantic_nodes:
            await collection.insert_many(semantic_nodes, ordered=False)
            logger.info(
                f"xMemory: Saved {len(semantic_nodes)} semantic nodes for user {user_id}"
            )

        return True

    except Exception as e:
        logger.error(f"xMemory save_episode_to_memory error: {e}")
        return False
