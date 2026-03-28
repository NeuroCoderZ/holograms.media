"""
backend/tria_agents/skill_router.py
Динамическая маршрутизация навыков для субагента Триа.
"""
from typing import List, Dict

SKILL_MAP = {
    "basilaq": [
        "Physics: 1dB = 1 grid cell (Z-scale = 128 + dB).",
        "Z-Dimming: Intensity proportional to column height.",
        "X-Offset (Pan): Discrete (Math.round), limited by (128 - column_width)."
    ],
    "threejs": [
        "Use InstancedMesh for performance.",
        "Reuse dummy objects to avoid GC thrashing.",
        "Keep vertex shaders simple for low-end devices."
    ],
    "wasm": [
        "AudioWorklet: Pure WASM (no wasm-bindgen).",
        "CWT convolution: Truncated for CPU efficiency."
    ],
    "holograms": [
        "Each hologram has a unique spectral signature.",
        "Interaction via gestures (MediaPipe)."
    ]
}

def get_relevant_skills(query: str) -> str:
    query_lower = query.lower()
    active_skills = []
    
    for key, instructions in SKILL_MAP.items():
        if key in query_lower:
            active_skills.extend(instructions)
    
    if not active_skills:
        return ""
    
    return "\n### Specialized Skills Context:\n" + "\n".join(f"- {s}" for s in active_skills)
