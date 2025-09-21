# Architecture in Action

This document describes how system components interact during runtime.

## Core Data Flows

1. **User Interaction**:
   - Client devices send gestures via WebSocket
   - Gesture processing server interprets intents
   - Tria Orchestrator coordinates command execution

2. **Hologram Rendering**:
   - Three.js scene initializes on client
   - Web Workers handle heavy computations
   - WebGPU used for hardware acceleration
