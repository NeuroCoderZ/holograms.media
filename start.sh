#!/bin/bash

# Hermes Family (Tria Cortex v2.6) Startup Script
# Core, Behavior, Context, Memory, Wallet — Hyper-Agents for Personal/Local Tria

# 1. Start Hermes Agent (Local) — if HERMES_API_KEY is set
# Hermes Core runs on port 8642 (OpenAI-compatible API)
if [ -n "$HERMES_API_KEY" ]; then
    echo "--- Starting Hermes Agent (Tria Cortex) ---"
    # Hermes Agent is started externally (Mistral Small or local model)
    # Port 8642 is used for Hermes LLM
else
    echo "WARNING: HERMES_API_KEY not set. Hermes Agent unavailable."
fi

# 2. Start FastAPI Backend (Foreground Process)
echo "--- Starting FastAPI Backend ---"
# Use exec to replace shell with uvicorn process (better for signal handling)
exec uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 1