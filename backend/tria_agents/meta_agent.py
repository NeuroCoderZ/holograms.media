"""
backend/tria_agents/meta_agent.py
Реализация динамических инструкций через AstraDB.
"""
import os
from typing import Optional
from astrapy import DataAPIClient

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
                self._client = DataAPIClient(self.token)
                db = self._client.get_async_database(self.endpoint, keyspace=self.keyspace)
                # Используем get_collection — не создаём, не падаем если нет
                self._collection = db.get_collection(COLLECTION_NAME)
            except Exception as e:
                print(f"[MetaAgent] AstraDB setup failed: {e}. Using default instructions.")
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
        await self._collection.upsert_one(
            {"agent_id": agent_id},
            {"$set": {"instruction": instruction}}
        )
