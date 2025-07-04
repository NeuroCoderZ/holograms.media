import logging
import asyncpg
from backend.services.gesture_intent_service import GestureIntentService
# Заглушки для будущих ботов, чтобы не было ошибок импорта, если файлы еще не созданы
from backend.tria_bots.GestureBot import GestureBot
from backend.tria_bots.MemoryBot import MemoryBot
# from .LearningBot import LearningBot # LearningBot пока не используется активно в этой цепочке

logger = logging.getLogger(__name__)

class OldTriaCoordinationService: # Переименованный старый класс
    def __init__(self, gesture_bot: any, audio_bot: any, video_bot: any, memory_bot: any, learning_bot: any):
        self.gesture_bot = gesture_bot
        self.audio_bot = audio_bot
        self.video_bot = video_bot
        self.memory_bot = memory_bot
        self.learning_bot = learning_bot
        # TODO: Initialize further as needed
        logger.info("OldTriaCoordinationService initialized (stub)")

    async def handle_incoming_chunk(self, interaction_chunk: dict) -> dict:
        # TODO: Orchestrate bot processing for a new interaction chunk
        logger.info(f"OldTriaCoordinationService: Handling incoming chunk (stub): {interaction_chunk.get('id', 'N/A')}")
        return {"status": "processed_stub", "chunk_id": interaction_chunk.get("id")}

    async def handle_command(self, command_data: dict) -> dict:
        # TODO: Process direct commands to Tria
        logger.info(f"OldTriaCoordinationService: Handling command (stub): {command_data.get('command_name', 'N/A')}")
        return {"status": "command_received_stub", "command_name": command_data.get("command_name")}

class CoordinationService:
    def __init__(self, db_conn: asyncpg.Connection):
        self.db_conn = db_conn
        self.gesture_bot = GestureBot(self.db_conn)
        self.memory_bot = MemoryBot(self.db_conn)
        self.gesture_intent_service = GestureIntentService(self.db_conn) # Инициализируем сразу
        # self.learning_bot = LearningBot(db_conn) # Пока не используется
        logger.info("CoordinationService initialized with GestureBot, MemoryBot, and GestureIntentService.")

    async def handle_gesture_intent(self, user_id: str, intent_data: dict):
        """
        Основной метод для обработки входящего жестового намерения.
        Оркестрирует взаимодействие ботов.
        """
        logger.info(f"CoordinationService: Handling intent_data for user {user_id}: {intent_data}")

        # 1. GestureBot анализирует сырые данные (которые в intent_data)
        # В intent_data сейчас приходит {"intent": "...", "context": {...}}
        # GestureBot.analyze_raw_gesture ожидает такой же формат
        intent_vector = await self.gesture_bot.analyze_raw_gesture(intent_data)
        logger.info(f"CoordinationService: Intent vector from GestureBot: {intent_vector}")

        # 2. MemoryBot находит релевантный контекст (эмбеддинг)
        # find_and_prepare_context ожидает intent_vector, который содержит target_context
        prepared_context = await self.memory_bot.find_and_prepare_context(intent_vector)

        if not prepared_context or "base_embedding" not in prepared_context:
            logger.warning(f"CoordinationService: Could not find context for intent_vector: {intent_vector}. User: {user_id}")
            return {"status": "error", "message": "Could not find context for this intent."}

        logger.info(f"CoordinationService: Context prepared by MemoryBot: Embedding ID {prepared_context['base_embedding'].id}")

        # 3. GestureIntentService применяет намерение к найденному контексту
        # Метод apply_intent_to_embedding будет создан на следующем шаге
        # Он должен принимать user_id, intent_vector (содержащий type, intensity) и context_embedding (объект EmbeddingDB)
        result = await self.gesture_intent_service.apply_intent_to_embedding(
            user_id=user_id,
            intent_vector=intent_vector, # Передаем весь intent_vector
            context_embedding=prepared_context['base_embedding']
        )

        # TODO: В будущем, передать результат в LearningBot для анализа
        # if result.get("status") == "success" and self.learning_bot:
        #     learning_payload = {
        #         "user_id": user_id,
        #         "intent": intent,
        #         "context": context,
        #         "modification_details": result # или более специфичные данные о модификации
        #     }
        #     await self.learning_bot.process_interaction_outcome(learning_payload)

        return result
