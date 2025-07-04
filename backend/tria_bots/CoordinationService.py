import logging
import asyncpg
import asyncio # ✅ Added import
from backend.services.gesture_intent_service import GestureIntentService
from backend.tria_bots.GestureBot import GestureBot
from backend.tria_bots.MemoryBot import MemoryBot
from backend.tria_bots.LearningBot import LearningBot # <-- Убедись, что импорт раскомментирован

logger = logging.getLogger(__name__)

class CoordinationService:
    def __init__(self, db_conn: asyncpg.Connection):
        self.db_conn = db_conn
        self.gesture_bot = GestureBot(self.db_conn)
        self.memory_bot = MemoryBot(self.db_conn)
        self.gesture_intent_service = GestureIntentService(self.db_conn)
        self.learning_bot = LearningBot(self.db_conn) # <-- Раскомментируй инициализацию
        logger.info("CoordinationService initialized with GestureBot, MemoryBot, GestureIntentService, and LearningBot.")

    async def handle_gesture_intent(self, user_id: str, intent_data: dict):
        """
        Основной метод для оркестрации обработки входящего жестового намерения.
        """
        logger.info(f"CoordinationService: Handling intent '{intent_data.get('intent')}' for user {user_id}")

        # 1. GestureBot анализирует сырые данные и формирует структурированный "вектор намерения"
        intent_vector = await self.gesture_bot.analyze_raw_gesture(intent_data)
        logger.info(f"CoordinationService: Intent vector from GestureBot: {intent_vector}")

        # 2. MemoryBot находит релевантный контекст (эмбеддинг) в базе знаний
        prepared_context = await self.memory_bot.find_and_prepare_context(intent_vector)

        if not prepared_context or not prepared_context.get("base_embedding"):
            msg = "Could not find context for this intent."
            logger.warning(f"CoordinationService: {msg} for intent_vector: {intent_vector}. User: {user_id}")
            return {"status": "error", "message": msg}

        logger.info(f"CoordinationService: Context prepared by MemoryBot: Embedding ID {prepared_context['base_embedding'].id}")

        # 3. GestureIntentService применяет намерение к найденному контексту
        result = await self.gesture_intent_service.apply_intent_to_embedding(
            user_id=user_id,
            intent_vector=intent_vector,
            context_embedding=prepared_context['base_embedding']
        )

        # ✅ ШАГ 4: Передача результата в LearningBot для асинхронного анализа
        # Мы не ждем ответа, просто запускаем фоновую задачу (fire-and-forget)
        log_data_for_learning = {
            "user_id": user_id,
            "intent_vector": intent_vector,
            "context_embedding_id": prepared_context['base_embedding'].id, # Сохраняем ID, а не весь объект
            "result": result
        }
        # В реальном приложении это был бы вызов через очередь задач (Celery, etc.)
        # Сейчас просто вызываем асинхронный метод
        asyncio.create_task(self.learning_bot.process_interaction_for_learning(log_data_for_learning))

        return result
