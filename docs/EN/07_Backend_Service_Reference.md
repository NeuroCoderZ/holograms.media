# Volume 7: Backend Service Reference
**Version:** 1.0.0 (Koyeb Edition)
**Date:** March 29, 2026
**Status:** Backend Technical Specification

---

## 1. Server Architecture (FastAPI)
The backend is a high-performance asynchronous application built on **FastAPI 0.135.1**.

### 1.1. Lifespan
Upon server startup, the following are initialized:
*   **Astra DB Client:** Connection to the vector store.
*   **S3 Client (Boto3):** Link to Cloudflare R2 / Backblaze B2.
*   **Tria Orchestrator:** Initialization of the model supervisor.

## 2. API v1: Primary Endpoints

### 2.1. Intelligence and Chat
*   **`POST /api/v1/tria/prompt`**: Accepts a text request, returns Tria's response incorporating RAG context.
*   **`POST /api/v1/chat/users/me/chat_sessions/direct`**: Streamed response (SSE). Supports transmission of `thought_blocks` (internal reasoning).
*   **`WS /ws/v1/tria/live`**: Bi-directional audio streaming (PCM 16kHz) for the Multimodal Live API.

### 2.2. Gestures and Biometrics
*   **`POST /api/v1/gestures`**: Saves MediaPipe trajectories to AstraDB.
*   **`GET /api/v1/users/me/gestures`**: Retrieves the current user's list of personal gestures.
*   **`POST /api/v1/gesture-embedding`**: Generates a vector (3072d) via Gemini Embedding 2.

### 2.3. Economy (Wallet)
*   **`POST /api/v1/wallet/obolos/earn`**: Tokens accrual based on confirmed gestures.
*   **`GET /api/v1/wallet/obolos/balance`**: View current Utility Unit balance.

## 3. Database: AstraDB (Cassandra)
Utilizes **Data API v2.2** with support for high-dimensional vectors.
*   **Dimension:** 3072 (Gemini 2 standard).
*   **Metric:** `COSINE` (cosine similarity).
*   **Optimization:** Uses `DataAPIVector` binary encoding during search to save bandwidth.

## 4. Storage (R2 / B2)
*   All media chunks (audio/video) are saved in S3-compatible storage.
*   Access is provided via temporary **Presigned URLs**.

---
**"The backend is not just an API. It is the Swarm's distributed memory."**
_Approved by Backend DevOps Unit._
