#!/bin/bash

# 1. Start OpenClaw Agent (Background Process)
# We check if 'openclaw' command exists and if OPENCLAW_GATEWAY_TOKEN is set
if command -v openclaw &> /dev/null; then
    echo "--- Starting OpenClaw Agent ---"
    # Ensure a token exists for the gateway
    if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
        echo "WARNING: OPENCLAW_GATEWAY_TOKEN is not set. Generating a temporary token..."
        export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 16)
        echo "Generated Token: $OPENCLAW_GATEWAY_TOKEN"
    fi
    
    # Run OpenClaw in background on port 18789
    # Using 'serve' or 'start' depending on version (assuming 'serve' based on standard practice)
    # Redirect logs to stdout for Koyeb visibility
    openclaw serve --port 18789 --token "$OPENCLAW_GATEWAY_TOKEN" &
else
    echo "WARNING: OpenClaw command not found. Skipping agent startup."
fi

# 2. Start FastAPI Backend (Foreground Process)
echo "--- Starting FastAPI Backend ---"
# Use exec to replace shell with uvicorn process (better for signal handling)
exec uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 1
