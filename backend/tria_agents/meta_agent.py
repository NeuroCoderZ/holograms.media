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

    async def get_instruction(self, agent_id: str, user_id: str = None) -> str:
        """
        Получить актуальную мета-инструкцию для агента.
        Implements Holochain Philosophy: Personal (Local) overrides Global.
        1. Personal Tria (Source Chain): immutable, user-owned.
           Key format: 'personal_{user_id}_{agent_id}'.
        2. Global Tria (Archetypes): statistical fallback.
           Key format: 'global_{agent_id}'.
        """
        try:
            await self._setup()
            if not self._collection:
                return ""
            
            # 1. Try Personal Tria first (if user_id provided)
            if user_id:
                personal_key = f"personal_{user_id}_{agent_id}"
                doc = await self._collection.find_one({"agent_id": personal_key})
                if doc and doc.get("instruction"):
                    logger.info(f"[MetaAgent] Personal Tria wins for {personal_key}")
                    return doc.get("instruction")
            
            # 2. Try generic agent_id (legacy)
            doc = await self._collection.find_one({"agent_id": agent_id})
            if doc and doc.get("instruction"):
                return doc.get("instruction")
            
            # 3. Fallback to Global Tria (Archetypes)
            global_key = f"global_{agent_id}"
            doc = await self._collection.find_one({"agent_id": global_key})
            if doc and doc.get("instruction"):
                logger.info(f"[MetaAgent] Global Tria fallback for {agent_id}")
                return doc.get("instruction")
            
            return ""
        except Exception as e:
            print(f"[MetaAgent] get_instruction failed: {e}")
            return ""
        except Exception as e:
            print(f"[MetaAgent] get_instruction failed: {e}")
            return ""

    async def set_instruction(self, agent_id: str, instruction: str, user_id: str = None):
        """
        Обновить мета-инструкцию.
        Implements Holochain Philosophy: Personal (Local) overrides Global.
        1. If user_id is provided -> Write to Personal Chain (personal_{user_id}_{agent_id})
        2. If no user_id -> Write to Global Archetype (global_{agent_id})
        """
        await self._setup()
        if not self._collection:
            logger.warning(
                "[MetaAgent] Collection not available, skipping set_instruction."
            )
            return
        
        # Determine the key based on Personal vs Global rule
        if user_id:
            key = f"personal_{user_id}_{agent_id}"
            logger.info(f"[MetaAgent] Personal Tria wins: Writing to {key}")
        else:
            key = f"global_{agent_id}"  # Fallback to Global Archetype
            logger.info(f"[MetaAgent] Global Tria fallback: Writing to {key}")
            
        await self._collection.update_one(
            {"agent_id": key},
            {"$set": {"instruction": instruction}},
            upsert=True,
        )

    async def sync_global_pattern(self, pattern_id: str, quality_score: float):
        """
        Holoca-style: When a pattern is shared/exchanged, its value (weight) increases.
        Global Tria (Statistical Archetype): Pattern weight grows with quality.
        We update the 'global_{pattern_id}' entry to increase its relevance.
        """
        await self._setup()
        if not self._collection:
            logger.warning("[MetaAgent] Collection not available for sync.")
            return
        
        global_key = f"global_{pattern_id}"
        # Quality_score: 0.0 to 1.0. Weight increase: proportional to quality.
        weight_increase = 0.1 + (quality_score * 0.5)  # Range: 0.1 to 0.6
        
        try:
            # In AstraDB, we update a 'weight' field or similar metadata
            await self._collection.update_one(
                {"agent_id": global_key},
                {"$inc": {"sync_weight": weight_increase}},
                upsert=True
            )
            logger.info(f"[MetaAgent] Global Tria: Pattern {global_key} weight increased by {weight_increase:.2f}")
        except Exception as e:
            logger.error(f"[MetaAgent] Sync failed for {global_key}: {e}")
