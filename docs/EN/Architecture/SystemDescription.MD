```markdown
# Data Flows and Interaction Architecture — "Holographic Media"

## 1. Introduction

This document describes the high-level architecture, key components, and data flows of the "Holographic Media" project (holograms.media). The project aims to build an innovative multimodal platform for human–AI interaction through dynamic 3D audio-visualizations ("holograms") and an evolving AI assistant called "Tria".

## 2. Technology Stack and Key Components

- **Frontend:** Single Page Application (SPA) written in plain JavaScript (ES6 modules).
  - **Rendering:** Three.js with WebGL for high-performance 3D graphics.
  - **Hosting:** Cloudflare Pages (site builds on Cloudflare Pages).
- **Backend:** FastAPI (Python).
  - **Hosting:** Koyeb (Docker deployment).
  - **Authentication:** OAuth 2.0 with Google Sign-In.
  - **Versioning:** Support for **Hot-Swap** (viewing commit code via `srcdoc` and embedded **Monaco Editor**).
- **Knowledge Store (RAG):** Astra Database (Cassandra) accessed via Tria API for storing and performing semantic search across project data.
- **File Storage:** Cloudflare R2 for storing interaction "chunks" (audio, video files).

- **AI Orchestration:** Future plans include using Mistral LLM flows orchestrated within the FastAPI backend.

## 3. Data Flow Architecture

### 3.1. Frontend Initialization

1. **Load & DOM:** `main.js` begins initialization after `DOMContentLoaded`.
2. **Consent:** `initializeConsentManager()` requests user consent.
3. **Core Initialization (`initCore`):**
   - Creates the global `state` object.
   - **WebGL initialization:** `initializeScene()` in `3d/sceneSetup.js` asynchronously configures a `THREE.WebGLRenderer`. If WebGL or the device is unsupported, initialization stops and an error is shown to the user.
   - Creates and stores instances of key managers in `state`: `HologramRenderer`, `MicrophoneManager`, `AudioFilePlayer`, `PanelManager`, etc.
4. **UI Initialization:** `initializeMainUI()` in `ui/uiManager.js` caches references to major DOM elements in `state.uiElements`.
5. **Platform Detection:** `detectPlatform()` determines the running platform (`desktop`, `mobile`, `xr`) and dynamically loads platform-specific layout and input modules (`DesktopLayout`, `DesktopInput`, etc.).
6. **Await User Action:** The app waits for user actions (e.g., clicking "Start Session") to initialize multimedia.

### 3.2. Scenario: Interacting with a Hologram and Tria

This scenario describes the full cycle from a user action to the system response.

Step 1 — Local input and processing (Frontend):

- **Real-time audio visualization:**
  1. Microphone stream (`MicrophoneManager`) or a file (`AudioFilePlayer`) is routed to `audioProcessing.js`.
  2. `audioProcessing.js` uses an `AudioWorklet` (`waveletAnalyzer.js`) which offloads heavy processing to a WASM module compiled from Rust.
  3. The WASM module performs CWT (Continuous Wavelet Transform) and returns frequency-level magnitudes and panorama angles.
  4. These values are stored in `state` and consumed by `HologramRenderer` each frame to update the 3D visualization.
- **Preparing a chunk for backend upload:**
  1. `handsTracking.js` uses MediaPipe to capture keypoints for gestures.
  2. The user may record or upload audio/video.
  3. The frontend constructs a "chunk" object with metadata (`timestamp`, Google OAuth 2.0 `user_id`) and prepares the media file for upload.

Step 2 — Sending data to the backend (Frontend -> Backend):

1. The client (via `services/apiService.js`) sends a request to a FastAPI endpoint (e.g., `/api/v1/interactions/upload`) containing metadata and the chunk file.
2. Requests to FastAPI are authenticated. The client attaches a Google OAuth 2.0-issued JWT token in the `Authorization` header.

Step 3 — Backend processing (FastAPI on Koyeb):

1. **Authentication:** The endpoint verifies the JWT issued by Google and identifies the user.
2. **Validation:** Pydantic models validate incoming payloads.
3. **File Storage:** FastAPI stores the media file in Cloudflare R2.
4. **Knowledge Store:** Chunk metadata (including `user_id` and R2 file links) and any extracted content are indexed via Tria API into Astra Database (Cassandra).
5. **Tria orchestration:** Tria orchestrates downstream processing using agents (`tria_agents`), such as `GestureAgent`, `AudioAgent`, and `MemoryAgent`.
   - `MemoryAgent` performs semantic search in the knowledge store via Tria API to retrieve relevant context.
   - Tria may call external LLMs (e.g., Google Gemini) as needed.
6. **Response assembly:** FastAPI composes a structured response (e.g., chat text, UI/hologram update commands).

Step 4 — Client reaction (Backend -> Frontend):

1. FastAPI returns an HTTP response to the frontend.
2. The frontend processes the response:
   - `panels/chatMessages.js` displays textual replies in the chat UI.
   - `3d/hologramRenderer.js` executes commands to update the 3D scene.
   - `audio/audioFilePlayer.js` plays any returned audio attachments.

### 3.3. Scenario: Training Tria

1. **Data collection:** All chunks and user feedback (explicit and implicit) are stored in Cloudflare R2 (files) and indexed in Astra Database (Cassandra).
2. **LearningAgent:** A backend background process (or periodic Mistral flow) executes `LearningAgent` that analyzes accumulated data and evaluates model configurations.
3. **Evolution cycle:** `LearningAgent` may mutate model parameters, generate new configurations, or update the knowledge store to gradually improve system behavior.

## 4. High-level Flow Diagram

```mermaid
graph LR
    A[User] -->|Gestures, Voice, Files, Text| B(Frontend on Cloudflare Pages)

    subgraph Backend on Koyeb
        FASTAPI[FastAPI (Main API + Tria orchestration)]
    end

    subgraph Data Stores
        R2[Cloudflare R2 (Files)]
        RAG[Astra DB (Cassandra) (Tria API)]
    end

    LLM_API[External LLM APIs (Gemini, Mistral)]

    B -- 1. Authenticate (Google OAuth 2.0) --> FASTAPI

    B -- 3. Authenticated request (HTTPS) --> FASTAPI

    FASTAPI -- 5. Upload file --> R2
    FASTAPI -- 6. Index chunk --> RAG
    FASTAPI -- 7. Call LLM --> LLM_API
    FASTAPI -- 8. Response --> B

    B -- 9. UI / Hologram update --> A
    B -- 10. Hot-Swap (v0.19.050) --> GitHub_CDN[GitHub static assets via jsdelivr]
    B -- 11. Code Audit --> MonacoEditor[Monaco Editor CDN]

    Cloudflare Workers[Cloudflare Workers (auxiliary tasks)]
    Cloudflare Workers -- triggers --> FASTAPI

```
