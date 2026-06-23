# Volume 2: System Architecture v3.0
**Status:** Technical Standard (March 2026)

---

## 1. Conceptual Framework
The Holograms Media system is built on the **Distributed Cognitive Mesh** principle. It is a hybrid solution combining local computing on the user's NPU/GPU with cloud-based orchestration.

## 2. Frontend: Multimodal Core
The **EventBus** serves as the central message exchange hub.

### 2.1. Technology Stack
*   **Rendering:** Three.js (v0.165+). Priority renderer: **WebGPU** (with WebGL fallback).
*   **Intention Capture:** MediaPipe Hands (21 hand landmarks @ 60-120 Hz).
*   **Audio Analysis:** Pure WASM (C-core) + AudioWorklet. BasilaQ-256 spectrum analysis.
*   **Local AI:** ONNX Runtime Web with WebGPU support for instantaneous gesture resonance.

### 2.2. Data Flows
1.  **Audio Stream:** `MicrophoneManager` -> `AudioWorklet` -> `WASM CWT` -> `eventBus ('audio:spectralData')` -> `HologramRenderer`.
2.  **Gesture Stream:** `MediaPipe` -> `GestureManager` -> `GestureDNA` (biometrics) -> `eventBus ('gesture:intent')`.

## 3. Backend: Tria Orchestrator
The backend is deployed on **Koyeb** (Docker containers) and written in **FastAPI**.

### 3.1. Knowledge Base (RAG)
*   **Storage:** AstraDB (Vector Search).
*   **Embeddings:** `gemini-embedding-2` (Dimension: 3072).
*   **Synchronization:** The `sync_knowledge_base.py` script performs incremental base updates with each deployment.

### 3.2. LLM Orchestration
*   **Supervisor:** `gemini-3-flash-preview` (manages sessions and reasoning process).
*   **Sub-agents:** `gemini-3.1-flash-lite-preview` (background research, critic, code generation).

## 4. Infrastructure and P2P
*   **Signaling:** `dev.holograms.media` WebSocket server for WebRTC handshakes.
*   **P2P Protocol:** NetHoloGlyph. Exchange of 1-bit QJL quanta for swarm echo-location.
*   **Media Storage:** Cloudflare R2 (Soma blocks and hologram assets).

---
**"Architecture follows intention. Code is the geometry of resonance."**
_Approved by Architecture Review Board._

