"""
FastAPI Router for Hermes Family CrewAI
/api/v1/hermes/* endpoints with health check and telemetry.

B6 Phase
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from backend.hermes_family.token_ledger import get_token_ledger
from backend.hermes_family.security import PromptSanitizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/hermes", tags=["Hermes Family"])


# === Request/Response Models ===

class HermesRequest(BaseModel):
    """Incoming request to Hermes Family"""
    message: str = Field(..., min_length=1, max_length=10000, description="User request")
    user_id: str = Field("anonymous", description="User identifier")
    session_id: str = Field("default", description="Session identifier")
    intent_override: Optional[str] = Field(None, description="Override auto-classified intent")


class HermesResponse(BaseModel):
    """Response from Hermes Family"""
    result: str
    intent: str
    deploy_status: str
    hitl_required: bool
    tokens_used: int = 0
    elapsed_ms: int = 0


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    embedding_model: str
    embedding_dim: int
    token_ledger: dict
    crewai_available: bool


# === Endpoints ===

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Hermes Family health check with token ledger status"""
    ledger = get_token_ledger()

    # Check if CrewAI is importable
    try:
        from crewai import Agent, Crew, Task
        crewai_available = True
    except ImportError:
        crewai_available = False

    return HealthResponse(
        status="healthy" if crewai_available else "degraded",
        service="hermes-family-crewai",
        version="2.0.0",
        embedding_model="gemini-embedding-2-preview",
        embedding_dim=3072,
        token_ledger=ledger.get_status(),
        crewai_available=crewai_available,
    )


@router.post("/request", response_model=HermesResponse)
async def process_request(request: HermesRequest, background_tasks: BackgroundTasks):
    """
    Process a request through Hermes Family Flow.
    Input is sanitized before entering the DAG.
    """
    start_time = time.time()

    # Security: sanitize input
    sanitized, is_safe = PromptSanitizer.sanitize(request.message)
    if not is_safe:
        logger.warning(f"Flagged input from user {request.user_id}: content filtered")
        # Continue with sanitized version — don't reject entirely

    # Token ledger check
    ledger = get_token_ledger()
    ledger_status = ledger.get_status()

    # Import flow lazily (heavy import)
    try:
        from backend.hermes_family.flow import HermesFamilyFlow
        from backend.hermes_family.agents import ALL_AGENTS
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"CrewAI not available: {e}"
        )

    # Create flow and set state
    flow = HermesFamilyFlow()
    flow.state.user_request = sanitized
    flow.state["user_id"] = request.user_id
    flow.state["session_id"] = request.session_id

    if request.intent_override:
        flow.state.intent = request.intent_override

    # Execute flow
    try:
        result = flow.kickoff()

        elapsed_ms = int((time.time() - start_time) * 1000)

        return HermesResponse(
            result=str(result),
            intent=flow.state.intent,
            deploy_status=flow.state.get("deploy_status", "unknown"),
            hitl_required=flow.state.get("hitl_required", False),
            tokens_used=0,  # Updated by token_ledger callbacks
            elapsed_ms=elapsed_ms,
        )

    except Exception as e:
        logger.error(f"Hermes Flow execution failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Flow execution error: {str(e)}"
        )


@router.get("/token-ledger")
async def get_token_status():
    """Get current token ledger status"""
    ledger = get_token_ledger()
    return ledger.get_status()


@router.get("/agents")
async def list_agents():
    """List available Hermes Family agents"""
    try:
        from backend.hermes_family.agents import AGENT_MAP
        return {
            "agents": [
                {
                    "name": name,
                    "role": agent.role,
                    "llm": str(agent.llm),
                    "max_iter": agent.max_iter,
                    "max_rpm": getattr(agent, 'max_rpm', None),
                }
                for name, agent in AGENT_MAP.items()
            ]
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="CrewAI not available")
