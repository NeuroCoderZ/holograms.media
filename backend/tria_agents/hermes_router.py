# backend/tria_agents/hermes_router.py
# Hermes Router: Routes requests to the correct Hermes Agent family member
# Uses Mistral Small 4 (Latest) as the primary LLM (as per user request)
# Implements: Personal Tria (Local) overrides Global Tria

import logging
from typing import Dict, Any, Optional
from backend.llm.hermes_llm import get_hermes_response
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Agent type constants (matching hermes_family_architecture.svg)
AGENT_TYPE_CORE = "hermes_core"       # Meta-Agent / Coordinator
AGENT_TYPE_BEHAVIOR = "hermes_behavior" # Gestures, Clicks, Predictions
AGENT_TYPE_CONTEXT = "hermes_context"   # Codebase, Docs, Stack
AGENT_TYPE_MEMORY = "hermes_memory"    # Enkephalon + AstraDB
AGENT_TYPE_WALLET = "hermes_wallet"    # Obolos, Energy, DAO

# Personal vs Global Conflict Resolution
# Rule: Personal (Local Source Chain) ALWAYS wins over Global (Statistical Archetypes)
def _resolve_instruction_source(agent_id: str, personal_instruction: Optional[str], global_instruction: Optional[str]) -> str:
    """
    Implements the Holochain Philosophy:
    'Personal Tria (Source Chain) is immutable and sovereign.'
    If Personal instruction exists -> use it (even if Global says otherwise).
    Global Tria is just a statistical suggestion (archetype).
    """
    if personal_instruction:
        logger.info(f"HermesRouter: Personal Tria wins for {agent_id}")
        return personal_instruction
    
    if global_instruction:
        logger.info(f"HermesRouter: Global Tria fallback for {agent_id}")
        return global_instruction
    
    return "Default Tria instruction: Be helpful and responsive."

async def route_to_hermes(
    query: str,
    agent_type: str = AGENT_TYPE_CORE,
    user_id: str = "guest",
    context: Dict[str, Any] = None
) -> str:
    """
    Routes the query to the appropriate Hermes Agent using Mistral Small 4 (Latest).
    """
    if not settings.HERMES_API_KEY:
        return "[HermesRouter Error] HERMES_API_KEY not set"
    
    # 1. Determine System Instruction based on Agent Type
    # In a full implementation, this would fetch from MetaInstructionService
    # For now, we map types to behaviors
    type_instructions = {
        AGENT_TYPE_CORE: "You are HermesCore, the Meta-Agent of Tria. You monitor regressions and evolve instructions.",
        AGENT_TYPE_BEHAVIOR: "You are HermesBehavior. You track user gestures, clicks, and predict next actions (Markov Chain).",
        AGENT_TYPE_CONTEXT: "You are HermesContext. You know the project architecture, docs, and codebase (Holochain-style Source Chain).",
        AGENT_TYPE_MEMORY: "You are HermesMemory. You manage Enkephalon (WASM) and AstraDB (3072d embeddings).",
        AGENT_TYPE_WALLET: "You are HermesWallet. You calculate Obolos, energy costs, and manage the DAO economy."
    }
    
    system_instr = type_instructions.get(agent_type, type_instructions[AGENT_TYPE_CORE])
    
    # 2. Append context if available (from RAG / Global Tria)
    if context:
        rag_context = context.get("rag_context", "")
        if rag_context:
            system_instr += f"\n\nContext from Global Tria (AstraDB RAG):\n{rag_context}"
        
        personal_context = context.get("personal_context", "")
        if personal_context:
            system_instr += f"\n\nPersonal Tria Context (Source Chain):\n{personal_context}"
    
    # 3. Call Hermes LLM (Mistral Small Latest)
    try:
        logger.info(f"HermesRouter: Routing to {agent_type} for user {user_id}")
        response = await get_hermes_response(
            prompt=query,
            model="mistral-small-latest",  # As requested: Mistral Small 4 (Latest)
            system_instruction=system_instr
        )
        return response
    except Exception as e:
        logger.error(f"HermesRouter: Error routing to {agent_type}: {e}")
        return f"[HermesRouter Error] {str(e)}"

# Helper function to be called from tria_agents.py
async def get_hermes_agent_response(query: str, domain: str, user_id: str) -> str:
    """
    Maps the legacy 'domain' system to the new Hermes Family.
    """
    mapping = {
        "frontend": AGENT_TYPE_BEHAVIOR,
        "backend": AGENT_TYPE_CONTEXT,
        "debug": AGENT_TYPE_CORE,
        "architecture": AGENT_TYPE_CONTEXT,
        "protocol": AGENT_TYPE_MEMORY
    }
    agent_type = mapping.get(domain, AGENT_TYPE_CORE)
    return await route_to_hermes(query, agent_type=agent_type, user_id=user_id)
