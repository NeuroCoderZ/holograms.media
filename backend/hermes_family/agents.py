"""
Hermes Family — CrewAI Agent Definitions
5 agents with per-agent LLM binding, Pydantic outputs, token limits.

Model Lock 13.05.2026:
  HERMES_MAIN = mistral-medium-3.5 (128B, 256k ctx)
  HERMES_SUB  = mistral-small-latest (routing/gesture/memory)
  EMBED_MODEL = gemini-embedding-2-preview (3072d) — NEVER change

Paradigm: Ручное переключение LLM → человеческий контроль.
CrewAI → оркестратор, а не автопилот.
"""

import os
import logging
from crewai import Agent, LLM

logger = logging.getLogger(__name__)

# === LLM Configuration (Model Lock 13.05.2026) ===
# Manual swap via .env — NO auto-failover

_llm_main = LLM(
    model=os.getenv("HERMES_MAIN_LLM", "mistral/mistral-medium-3.5"),
    temperature=0.2,
    max_tokens=4096,
)

_llm_code = LLM(
    model=os.getenv("HERMES_CODEGEN_LLM", "mistral/mistral-medium-3.5"),
    temperature=0.3,
    max_tokens=8192,
)

_llm_sub = LLM(
    model=os.getenv("HERMES_SUB_LLM", "mistral/mistral-small-latest"),
    temperature=0.4,
    max_tokens=2048,
)


# === Hermes-Prime: Meta-Agent Coordinator ===
hermes_prime = Agent(
    role="Hermes-Prime: Meta-Agent Coordinator",
    goal=(
        "Декомпозиция задач, Kanban-трекинг, контроль token_budget, "
        "routing between Hermes Family agents, ensure human approval before critical actions"
    ),
    backstory=(
        "Central coordinator of Hermes Family. "
        "Decomposes user requests into subtasks, routes to specialized agents, "
        "tracks token budget via TokenLedger, and ensures HITL via Telegram. "
        "Philosophy: Personal (Local) WINS over Global."
    ),
    llm=_llm_main,
    max_iter=5,
    max_rpm=10,
    cache=True,
    respect_context_window=True,
    allow_delegation=True,
    verbose=True,
)


# === Hermes-CodeGen: Diff-Patch Generator ===
hermes_codegen = Agent(
    role="Hermes-CodeGen: Diff-Patch Generator",
    goal=(
        "Генерация дифф-патчей для кодовой базы holograms.media. "
        "Never rewrite entire files — only precise diff-patches via DiffPatchSet. "
        "EMBED_DIM=3072 MUST be preserved in all code changes."
    ),
    backstory=(
        "Specialized code generator that produces structured DiffPatchSet output. "
        "Uses output_pydantic=DiffPatchSet for guaranteed structure. "
        "Understands the project architecture: FastAPI backend, Three.js frontend, "
        "AstraDB 3072d, Cloudflare Workers, WebGPU priority."
    ),
    llm=_llm_code,
    max_iter=3,
    max_rpm=8,
    cache=True,
    respect_context_window=True,
    allow_delegation=False,
)


# === Hermes-Reviewer: Security & Quality Auditor ===
hermes_reviewer = Agent(
    role="Hermes-Reviewer: Security & Quality Auditor",
    goal=(
        "Аудит дифф-патчей, проверка безопасности, AST-валидация, "
        "EMBED_DIM=3072 compliance, prompt injection detection"
    ),
    backstory=(
        "Security-first reviewer. Validates patches with ast.parse() + difflib, "
        "checks for injection patterns (CVE-2026-2275/2286/2287/2285 mitigation), "
        "verifies EMBED_DIM=3072 compliance, and ensures no exec() or os.system() calls. "
        "allow_code_execution=False is enforced."
    ),
    llm=_llm_sub,
    max_iter=3,
    max_rpm=6,
    cache=True,
    respect_context_window=True,
    allow_delegation=False,
)


# === Hermes-GestureUX: Gesture & UX Specialist ===
hermes_gesture = Agent(
    role="Hermes-GestureUX: Gesture & UX Specialist",
    goal=(
        "Оптимизация медиапайплайна: CHUNK_MS=200, ACCEPT_LOCAL=0.85, "
        "ACCEPT_CLOUD=0.65, EARLY_TRIGGER при confidence >= 0.85 на 300-500мс"
    ),
    backstory=(
        "Gesture engine specialist. Deep understanding of MediaPipe pipeline "
        "(21 points, 63 float32), BasilaQ-128 audio architecture (1dB = 1 cell), "
        "and Three.js WebGPU rendering with InstancedMesh optimization. "
        "CLOUD_COOLDOWN_MS=300, MEDIAPIPE_PTS=21."
    ),
    llm=_llm_sub,
    max_iter=3,
    max_rpm=8,
    cache=True,
    respect_context_window=True,
    allow_delegation=False,
)


# === Hermes-TriaWeaver: Tria Memory & Context Weaver ===
hermes_tria = Agent(
    role="Hermes-TriaWeaver: Tria Memory & Context Weaver",
    goal=(
        "Интеграция с AstraDB 3072d COSINE, RAG retrieval, "
        "Personal Tria routing (Personal WINS over Global), "
        "Cognitive Memory operations (encode/consolidate/recall/forget)"
    ),
    backstory=(
        "Memory and context specialist. Manages AstraDB collections "
        "(tria_knowledge_gemini 3072d, neuroescrow_codebase_3072, neuroescrow_memory_3072), "
        "Gemini Embedding 2 (3072d), and implements Triple Token Architecture: "
        "personal_{user_id}_{agent_id} (6-8 digits) > global_{agent_id} (3 digits) > pattern_hash (2 digits). "
        "Philosophy: Personal (Local) WINS over Global."
    ),
    llm=_llm_sub,
    max_iter=3,
    max_rpm=8,
    cache=True,
    respect_context_window=True,
    allow_delegation=False,
)


# === Agent Registry ===
ALL_AGENTS = [
    hermes_prime,
    hermes_codegen,
    hermes_reviewer,
    hermes_gesture,
    hermes_tria,
]

AGENT_MAP = {
    "prime": hermes_prime,
    "codegen": hermes_codegen,
    "reviewer": hermes_reviewer,
    "gesture": hermes_gesture,
    "tria": hermes_tria,
}
