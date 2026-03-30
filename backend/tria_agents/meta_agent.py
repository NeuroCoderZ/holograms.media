"""
backend/tria_agents/meta_agent.py
Реализация динамических инструкций через AstraDB.
"""

import os
import logging
from typing import Optional
from astrapy import DataAPIClient

logger = logging.getLogger(__name__)

COLLECTION_NAME = "tria_meta_instructions"


class MetaInstructionService:
    def __init__(self):
        self.endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")
        self.token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
        self.keyspace = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
        self._client = None
        self._collection = None

    async def _setup(self):
        if not self._collection:
            try:
                if not self.token or not self.endpoint:
                    logger.warning("[MetaAgent] ASTRA_DB credentials not set.")
                    return
                self._client = DataAPIClient(self.token)
                db = self._client.get_async_database(
                    self.endpoint, keyspace=self.keyspace
                )
                # Используем get_collection — не создаём, не падаем если нет
                self._collection = db.get_collection(COLLECTION_NAME)
            except Exception as e:
                logger.error(
                    f"[MetaAgent] AstraDB setup failed: {e}. Using default instructions."
                )
                self._collection = None

    async def get_instruction(self, agent_id: str) -> str:
        """Получить актуальную мета-инструкцию для агента."""
        try:
            await self._setup()
            if not self._collection:
                return ""
            doc = await self._collection.find_one({"agent_id": agent_id})
            return doc.get("instruction", "") if doc else ""
        except Exception as e:
            print(f"[MetaAgent] get_instruction failed: {e}")
            return ""

    async def set_instruction(self, agent_id: str, instruction: str):
        """Обновить мета-инструкцию (только для Meta-Learning Agent)."""
        await self._setup()
        if not self._collection:
            logger.warning(
                "[MetaAgent] Collection not available, skipping set_instruction."
            )
            return
        await self._collection.update_one(
            {"agent_id": agent_id},
            {"$set": {"instruction": instruction}},
            upsert=True,
        )
