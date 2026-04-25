# backend/tria_agents/hermes_core.py
# HermesCore: Meta-Agent (Kernel)
# Architecture: DGM-H (Darwin Gödel Machine with Hyperagents)
# Connects: AstraDB (3072d embeddings) <-> Hermes LLM (Mistral Small) <-> MetaInstructionService

import logging
from typing import Dict, Any, Optional
from backend.tria_agents.meta_agent import MetaInstructionService
from backend.tria_agents.tria_rag_service import TriaRAGService

# Initialize RAG service
tria_rag = TriaRAGService()

logger = logging.getLogger(__name__)

class HermesCore:
    """
    HermesCore is the Meta-Agent (Kernel) of the Tria system.
    It monitors the state of the project (via deploy.js commits / AstraDB RAG)
    and evolves the instructions for other agents (Personal Tria).
    
    Philosophy: 
    - Personal Tria = Source Chain (Immutable, user-owned).
    - Global Tria = Aggregated patterns (DGM-H Archive).
    - HermesCore = The bridge that evolves instructions based on "what's broken".
    """
    
    def __init__(self, db_session=None):
        self.meta_service = MetaInstructionService()
        self.history_context = ""  # Accumulator of "what happened" (from deploy.js / git log)
        logger.info("HermesCore (Meta-Agent) initialized. Connected to MetaInstructionService.")

    async def _get_global_context(self, query: str) -> str:
        """
        Retrieves context from Global Tria (AstraDB RAG with 3072d embeddings).
        This is where Hermes "reads" the current state of the project.
        """
        try:
            # Query the RAG service (which uses Gemini Embeddings 3072d)
            # We search for "broken components", "regressions", "recent updates"
            context = await tria_rag.get_relevant_context(query, limit=5, user_id="hermes_core")
            return context if context else "No relevant context found in Global Tria."
        except Exception as e:
            logger.error(f"HermesCore: Failed to query Global Tria RAG: {e}")
            return "Error accessing knowledge base."

    async def analyze_regression(self, agent_id: str, error_desc: str) -> Dict[str, Any]:
        """
        Meta-Cognitive function: Analyzes what broke and why.
        Uses Hermes LLM (Mistral Small) to generate a diagnosis.
        """
        # 1. Get context from Global Tria (AstraDB)
        rag_context = await self._get_global_context(f"regression {error_desc}")
        
        # 2. Prepare the prompt for the Meta-Agent
        # Linked to `scripts/deploy.js` logic: we treat the error as a "commit message"
        prompt = f"""
        You are HermesCore, the Meta-Agent of Tria.
        Your task is to analyze a regression (something that broke) and suggest an evolution patch.
        
        Context from Global Tria (AstraDB RAG):
        {rag_context}
        
        Regression Report (from Personal Tria / deploy.js):
        Agent: {agent_id}
        Error: {error_desc}
        
        Task:
        1. Analyze WHY this regression happened based on the context.
        2. Generate a NEW instruction for this agent to prevent this in the future.
        3. Output ONLY the new instruction text.
        """

        try:
            from backend.llm.hermes_llm import get_hermes_response
            new_instruction = await get_hermes_response(
                prompt=prompt,
                system_instruction="You are HermesCore, a meta-agent that evolves Tria's instructions based on regressions."
            )
            return {
                "status": "analyzed",
                "agent_id": agent_id,
                "diagnosis": new_instruction,
                "new_instruction": new_instruction
            }
        except Exception as e:
            logger.error(f"HermesCore: LLM call failed: {e}")
            return {"status": "error", "message": str(e)}

    async def trigger_evolution(self, agent_id: str, new_instruction: str) -> bool:
        """
        Applies the evolution patch.
        Updates the MetaInstructionService (which writes to AstraDB collection 'tria_meta_instructions').
        This is the "Source Chain" update for the agent.
        """
        try:
            await self.meta_service.set_instruction(agent_id, new_instruction)
            logger.info(f"HermesCore: Evolution applied for {agent_id}. Instruction updated.")
            return True
        except Exception as e:
            logger.error(f"HermesCore: Failed to update instruction for {agent_id}: {e}")
            return False

    async def process_deploy_event(self, commit_message: str):
        """
        Processes a deploy.js event (commit).
        In Holochain philosophy: This is a new entry in the Source Chain.
        HermesCore reads it and updates the Global Tria context.
        """
        self.history_context += f"\nDeploy Event: {commit_message}"
        logger.info(f"HermesCore: Recorded deploy event: {commit_message[:50]}...")
        # Here you could trigger a RAG re-indexing or meta-analysis
        return {"status": "recorded", "context_length": len(self.history_context)}
