import logging
from typing import Any
# Removed asyncpg
import asyncio # ✅ Added import
from backend.services.gesture_intent_service import GestureIntentService
from backend.tria_agents.GestureAgent import GestureAgent
from backend.tria_agents.MemoryAgent import MemoryAgent
from backend.tria_agents.LearningAgent import LearningAgent # <-- Убедись, что импорт раскомментирован

logger = logging.getLogger(__name__)

class CoordinationService:
    def __init__(self, db: Any):
        self.db = db
    def __init__(self, db: Any):
        self.db = db
        self.gesture_agent = GestureAgent(self.db)
        self.memory_agent = MemoryAgent(self.db)
        self.gesture_intent_service = GestureIntentService(self.db)
        self.learning_agent = LearningAgent(self.db)
        logger.info("CoordinationService initialized with Astra DB and specialized agents.")

    async def handle_gesture_intent(self, user_id: str, intent_data: dict):
        """
        Основной метод для оркестрации обработки входящего жестового намерения.
        """
        logger.info(f"CoordinationService: Handling intent '{intent_data.get('intent')}' for user {user_id}")

        # 1. GestureAgent анализирует сырые данные и формирует структурированный "вектор намерения"
        intent_vector = await self.gesture_agent.analyze_raw_gesture(intent_data)
        logger.info(f"CoordinationService: Intent vector from GestureAgent: {intent_vector}")

        # 2. MemoryAgent находит релевантный контекст (эмбеддинг) в базе знаний
        prepared_context = await self.memory_agent.find_and_prepare_context(intent_vector, user_id) # Pass user_id for session context

        if not prepared_context or not prepared_context.get("synthesized_response"):
            msg = "Could not find context or synthesize response for this intent."
            logger.warning(f"CoordinationService: {msg} for intent_vector: {intent_vector}. User: {user_id}")
            return {"status": "error", "message": msg}

        synthesized_answer = prepared_context["synthesized_response"].get("answer", "")
        rag_sources = prepared_context["synthesized_response"].get("sources", [])
        rag_processing_time = prepared_context["synthesized_response"].get("processing_time", 0.0)

        logger.info(f"CoordinationService: Context prepared by MemoryAgent: Synthesized Answer Length: {len(synthesized_answer)}, Processing Time: {rag_processing_time:.4f}s")

        # 3. GestureIntentService применяет намерение к найденному контексту
        # TODO: GestureIntentService.apply_intent_to_embedding needs to be updated to handle synthesized_answer
        # For now, we pass the synthesized answer as a string, assuming GestureIntentService can process it.
        result = await self.gesture_intent_service.apply_intent_to_embedding(
            user_id=user_id,
            intent_vector=intent_vector,
            context_embedding=synthesized_answer # Passing synthesized answer as string
        )

        # ✅ ШАГ 4: Передача результата в LearningAgent для асинхронного анализа
        # Мы не ждем ответа, просто запускаем фоновую задачу (fire-and-forget)
        log_data_for_learning = {
            "user_id": user_id,
            "intent_vector": intent_vector,
            "synthesized_response": prepared_context["synthesized_response"], # Store the full RAG response
            "result": result
        }
        # В реальном приложении это был бы вызов через очередь задач (Celery, etc.)
        # Сейчас просто вызываем асинхронный метод
        # Сейчас просто вызываем асинхронный метод
        asyncio.create_task(self.learning_agent.process_interaction_for_learning(log_data_for_learning))

        return result
