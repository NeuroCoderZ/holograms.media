"""
Hermes Family Pydantic Models
Structured output for CrewAI agents — guaranteed type safety
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class DiffPatch(BaseModel):
    """Single diff-patch for code modification"""
    file_path: str = Field(..., description="Absolute path to file")
    old_string: str = Field(..., description="Exact string to replace")
    new_string: str = Field(..., description="Replacement string")
    description: str = Field(..., description="Brief description of change")
    embed_dim_check: bool = Field(True, description="EMBED_DIM=3072 compliant?")


class DiffPatchSet(BaseModel):
    """Structured output from Hermes-CodeGen agent"""
    patches: List[DiffPatch]
    deploy_required: bool = Field(True, description="Deploy needed after applying?")
    version_bump: Optional[str] = Field(None, description="Version number after patch")
    risk_level: str = Field("low", description="Risk assessment: low/medium/high")


class ReviewResult(BaseModel):
    """Structured output from Hermes-Reviewer agent"""
    approved: bool = Field(..., description="Patch approved for application?")
    security_issues: List[str] = Field(default_factory=list, description="Security concerns found")
    quality_score: float = Field(0.0, ge=0.0, le=1.0, description="Quality score 0-1")
    ast_valid: bool = Field(True, description="AST parse check passed?")
    embed_dim_compliant: bool = Field(True, description="EMBED_DIM=3072 check passed?")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class GestureAnalysis(BaseModel):
    """Structured output from Hermes-GestureUX agent"""
    chunk_ms: int = Field(200, description="CHUNK_MS parameter")
    accept_local: float = Field(0.85, description="Local confidence threshold")
    accept_cloud: float = Field(0.65, description="Cloud confidence threshold")
    early_trigger_ms: int = Field(300, description="Early trigger threshold in ms")
    mediapipe_points: int = Field(21, description="MediaPipe landmark count")
    recommendations: List[str] = Field(default_factory=list)


class MemoryResult(BaseModel):
    """Structured output from Hermes-TriaWeaver agent"""
    collection_used: str = Field(..., description="AstraDB collection name")
    embed_dim: int = Field(3072, description="Embedding dimension (MUST be 3072)")
    documents_found: int = Field(0, description="Number of relevant documents")
    similarity_threshold: float = Field(0.7, description="Min similarity score")
    context_provided: bool = Field(False, description="Context was provided to caller?")
