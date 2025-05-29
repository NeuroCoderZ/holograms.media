# ULTIMATE ROAD TO MVP (Strict Deadline: June 9th, 2025)

## Introduction

This document outlines the definitive plan to achieve the Minimum Viable Product (MVP) for "holograms.media" by June 9th, 2025. It supersedes previous MVP planning documents and incorporates detailed technical breakdowns, timelines, and critical considerations based on the Deep Research System Blueprint (DRSB) and strict project constraints.

**Core Constraint:** No reliance on services requiring credit card validation for their free tiers. This significantly impacts choices for backend hosting and advanced AI services. Firebase Cloud Functions (Python runtime) will be the primary backend architecture.

## I. Reconfirmed MVP Core Functionality Loop & "Definition of Done"

The MVP will enable a user to:

1.  **Authenticate:** Sign up and log in using Firebase Authentication. User data will be synced to a PostgreSQL database.
2.  **Upload Media:** Upload an audio/video file ("interaction chunk") to Firebase Storage.
3.  **Tria Interaction (Basic):**
    *   A Firebase Cloud Function is triggered by the new chunk in Firebase Storage (or by an HTTP request from frontend).
    *   A simplified Tria bot (Python module called by the Cloud Function) processes metadata.
    *   A basic response or acknowledgment is sent back to the user (e.g., via another Cloud Function callable by the frontend).
4.  **Hologram Visualization & Audio Reactivity:**
    *   The user can see a placeholder or basic 3D representation.
    *   This visualization will react to microphone input (based on PR #40 and `script.js` logic).
5.  **View History (Placeholder):** Buttons for "My Gestures," "My Holograms," "Chat History" will be present and clickable. CRUD functionality will be stubbed or point to a basic list from PostgreSQL if time permits, callable via HTTP-triggered Cloud Functions.

**"Definition of Done" for MVP:**

*   All core functionalities (1-5 above) are demonstrable.
*   Frontend is hosted on Firebase Hosting.
*   Backend logic is implemented as **Firebase Cloud Functions (Python runtime)**.
*   PostgreSQL database (**Neon.tech**) is structured and integrated.
*   Firebase Storage is used for media chunks.
*   Basic Tria bot logic (Python modules within Cloud Functions using direct Mistral/Devstral API calls) provides a response.
*   Code is reasonably clean, with comments for key sections.
*   A `README.md` provides basic setup and launch instructions.
*   All critical "no credit card" constraints are met for services used.

## II. Detailed Technical Breakdown

This section details the technical components, files, logic, data flow, challenges, and tasks.

---

### A. User Authentication (Firebase Auth + PostgreSQL Sync)

*   **Files to Modify/Create:**
    *   `frontend/js/core/auth.js`: Firebase Web SDK integration.
    *   `backend/cloud_functions/auth_sync/main.py` (New): Firebase Cloud Function (HTTP trigger) to handle user creation/sync post-Firebase auth.
    *   `backend/core/auth_service.py` (New or refactor from `backend/services/AuthService.py`): Logic for JWT decoding, user data extraction, used by the Cloud Function.
    *   `backend/core/crud_operations.py` (Refactor from `backend/db/crud_operations.py`): Database interaction logic, callable by Cloud Functions.
    *   `backend/core/models/user_models.py` (Refactor from `backend/models/user_models.py`): Pydantic models.
    *   `backend/core/db/schemas.sql` (As before): `users` table schema.
*   **Logic to Implement:**
    *   **Frontend:**
        *   Firebase UI for login/signup.
        *   On successful Firebase auth, get JWT token.
        *   Send JWT to the `auth_sync` Cloud Function.
    *   **Backend (Firebase Cloud Function `auth_sync`):**
        *   HTTP triggered. Receives JWT.
        *   Uses `auth_service.py` to verify JWT and extract user info (UID, email).
        *   Uses `crud_operations.py` to check if user exists in PostgreSQL; if not, create.
        *   Returns success/failure to frontend.
*   **Data Flow:**
    1.  User interacts with Firebase Auth UI (frontend).
    2.  Firebase authenticates, returns JWT to frontend.
    3.  Frontend sends JWT to `auth_sync` Cloud Function (HTTP).
    4.  `auth_sync` Cloud Function uses `auth_service.py` and `crud_operations.py` to write/update user in PostgreSQL `users` table.
*   **Key Challenges/Considerations:**
    *   **Firebase Auth:** Free tier is generous and meets "no card" constraint.
    *   **Firebase Cloud Functions (Python):**
        *   Free tier includes 2M invocations/month, 400,000 GB-seconds, 200,000 CPU-seconds. Sufficient for MVP.
        *   Python runtime is suitable.
        *   No credit card needed for Firebase free tier itself *if the associated Google Cloud Project does not enable billing*. Projects created via Firebase console often start without billing enabled. **Crucial to ensure billing is NOT enabled on the underlying GCP project, or that a card is not required if it is.**
    *   **PostgreSQL Choice:**
        *   **Neon.tech:** Confirmed as primary. Free tier (0.5GB, 10 projects, 190 compute hours) with **explicit "no credit card required" policy**. This includes standard PostgreSQL features, and pgvector is expected to function within this free tier.
    *   Secure JWT handling. Cold starts for Cloud Functions.
*   **Tasks & Sub-Tasks:**
    *   [S] Setup Firebase Authentication - Day 1
    *   [M] Implement Firebase Auth UI (frontend) - Day 1-2
    *   [M] Develop `auth_sync` Firebase Cloud Function (`backend/cloud_functions/auth_sync/main.py`, `backend/core/auth_service.py`) - Day 2
    *   [S] Define user schema & Pydantic models - Day 2
    *   [M] Integrate `crud_operations.py` with `auth_sync` function - Day 2-3
    *   [S] Test auth flow with Cloud Function - Day 3

---

### B. Frontend - Core Hologram Visualization & Audio Reactivity

*   **Files to Modify/Create:**
    *   `frontend/js/3d/hologramRenderer.js`: (As before) Core Three.js logic. **This module will incorporate the refined rendering loop, object creation (e.g., the "sphere" or custom geometry), and update mechanisms previously in `script.js` and PR #40.**
    *   `frontend/js/3d/sceneSetup.js`: (As before) Scene, camera, lights.
    *   `frontend/js/audio/audioAnalyzer.js`: (As before) Microphone input, FFT. **This module will house the audio processing logic (Web Audio API, `getMicrophoneInput`, FFT implementation) from `script.js`/PR #40.**
    *   `frontend/js/audio/audioVisualizer.js`: (As before) Connects audio to visuals. **This acts as the bridge, translating FFT output from `audioAnalyzer.js` into parameters for `hologramRenderer.js`, similar to how `script.js` updated hologram properties.**
    *   `frontend/js/config/hologramConfig.js` (New or from `script.js`): Store default parameters, thresholds for audio reactivity, potentially different visualizer modes.
    *   `frontend/js/main.js`: Orchestrate.
    *   `frontend/index.html`: Canvas element.
*   **Logic to Implement (`script.js` / PR #40 Refactoring):**
    *   **`hologramRenderer.js`**:
        *   Perfect the core rendering loop.
        *   Functions to create and update the primary visual object (e.g., `createHolographicSphere`, `updateHologramAppearance`).
        *   Shader material setup if custom shaders from PR #40 are used.
        *   Response to parameters like `intensity`, `frequencyBin`, etc., to modify scale, color, deformation.
    *   **`audioAnalyzer.js`**:
        *   Encapsulate `navigator.mediaDevices.getUserMedia` for microphone access.
        *   Robust FFT implementation (e.g., from a library or optimized custom code from `script.js`).
        *   Averaging/smoothing of FFT data if needed.
    *   **`audioVisualizer.js`**:
        *   Logic to map specific frequency bands or overall intensity from `audioAnalyzer.js` to specific visual parameters in `hologramRenderer.js`. This is where the "reactivity" is defined.
        *   Use `hologramConfig.js` for sensitivity settings.
*   **Data Flow:** (As before, but emphasizing `hologramConfig.js`)
    1.  User grants microphone permission.
    2.  `audioAnalyzer.js` captures audio, performs FFT.
    3.  `audioVisualizer.js` receives data, uses `hologramConfig.js` to determine response.
    4.  `audioVisualizer.js` calls update functions in `hologramRenderer.js`.
    5.  `hologramRenderer.js` modifies scene.
*   **Key Challenges/Considerations:**
    *   (As before) PR #40 integration, performance, cross-browser compatibility, permissions.
    *   Modularizing `script.js` logic effectively into the new structure.
*   **Tasks & Sub-Tasks:**
    *   [M] Refactor/Implement `hologramRenderer.js` with core visualization logic from `script.js`/PR #40 - Day 7
    *   [M] Refactor/Implement `audioAnalyzer.js` with audio capture and FFT from `script.js`/PR #40 - Day 7
    *   [S] Create `hologramConfig.js` and integrate with `audioVisualizer.js` - Day 7
    *   [S] Connect audio analysis to visual parameters via `audioVisualizer.js` - Day 7-8
    *   [M] Test and debug audio-reactive visualization thoroughly - Day 8

---

### C. Frontend - UI for MVP (Buttons, Panels, Basic Interactions)

*   **Files to Modify/Create:** (Largely as before)
    *   `frontend/index.html`: Structure for all specified buttons.
    *   `frontend/style.css`: Basic styling.
    *   `frontend/js/ui/uiManager.js`: Manage UI elements, event listeners for ALL buttons.
    *   `frontend/js/ui/panelManager.js`: Logic for panels.
    *   `frontend/js/ui/chatUI.js`: Chat display and input field.
    *   `frontend/js/main.js`: Initialize.
*   **Logic to Implement:**
    *   **`uiManager.js`**:
        *   Event listeners for ALL buttons: "Load Audio," "Play," "Pause," "Stop," "Mic," "Fullscreen," "XR," "Gesture Record," "Hologram List," "Scan," "Bluetooth," "Tria (Chat Input)," "Telegram," "GitHub," "Install PWA."
        *   **MVP Critical Buttons:**
            *   "Mic": Toggle `audioAnalyzer.js` activity.
            *   "Tria (Chat Input)": Send message to Tria backend (Cloud Function).
            *   "My Gestures," "My Holograms," "Chat History": Open respective panels (can be placeholder content for MVP, or basic lists if backend functions are ready).
        *   Other buttons: Clickable, can log to console or show "Not Implemented" for MVP.
        *   File input for chunk upload.
*   **Data Flow:** (As before)
*   **Key Challenges/Considerations:**
    *   Making all buttons clickable and providing feedback for non-MVP features.
    *   Chat input field and send button functionality.
*   **Tasks & Sub-Tasks:**
    *   [S] Design HTML for all listed buttons (`index.html`) - Day 1
    *   [S] Basic styling for all buttons - Day 1-2
    *   [M] Implement `uiManager.js` listeners for all buttons. Critical buttons get basic interaction logic (Mic toggle, Tria chat send, panel opening). Other buttons log to console. - Day 2-3, ongoing
    *   [M] Implement chat input field and send mechanism in `chatUI.js` - Day 4-5
    *   [S] Placeholder panels for Gestures, Holograms, Chat History - Day 5-6

---

### D. "Interaction Chunk" Pipeline (Frontend to Firebase Storage to Cloud Function)

*   **Files to Modify/Create:**
    *   `frontend/js/services/firebaseStorageService.js` (New): Logic to upload file directly to Firebase Storage from frontend.
    *   `frontend/js/ui/uiManager.js`: Handle file selection, trigger upload via `firebaseStorageService.js`.
    *   `backend/cloud_functions/process_chunk/main.py` (New): Firebase Cloud Function triggered by new file in Firebase Storage.
    *   `backend/core/crud_operations.py`: (As before) Save chunk metadata.
    *   `backend/core/models/multimodal_models.py`: (As before) Pydantic model.
    *   `backend/core/db/schemas.sql`: (As before) Schema.
*   **Logic to Implement:**
    *   **Frontend:**
        *   User selects file.
        *   `firebaseStorageService.js` uploads file directly to a specific path in Firebase Storage (e.g., `user_uploads/<user_id>/<chunk_id>`). Metadata like original filename, type, client timestamp can be stored as Firebase Storage object metadata.
    *   **Backend (`process_chunk` Cloud Function):**
        *   **Trigger:** Firebase Storage trigger (on new object creation in the designated path).
        *   Receives event data about the new file (path, name, metadata from storage object).
        *   Extracts user ID from path or metadata.
        *   Uses `crud_operations.py` to save metadata (storage path, user ID, Firebase Storage object metadata, server timestamp) to `audiovisual_gestural_chunks` table in PostgreSQL.
        *   (Optional for MVP) Can then trigger a simple Tria bot logic (e.g. `ChunkProcessorBot.py` module) within the same function or by placing a message on a Pub/Sub topic for another function.
*   **Data Flow:**
    1.  Frontend: User selects file.
    2.  Frontend: `firebaseStorageService.js` uploads file directly to Firebase Storage, including user ID in path and relevant metadata.
    3.  Firebase Storage: Triggers `process_chunk` Cloud Function on successful upload.
    4.  Cloud Function: Reads file metadata from trigger event.
    5.  Cloud Function: Uses `crud_operations.py` to save metadata to PostgreSQL.
    6.  (Optional) Cloud Function: Invokes simple Tria processing.
*   **Key Challenges/Considerations:**
    *   **Firebase Storage:** (As before) Free tier suitable.
    *   **Firebase Cloud Function Trigger:** Configuring Storage triggers correctly.
    *   **Permissions:** Ensuring Cloud Function has necessary permissions to read from Storage (usually default within same project) and write to Neon.tech PostgreSQL (requires proper network config and credentials).
    *   **Error Handling:** What if the Cloud Function fails after storage upload? Retry mechanisms (Pub/Sub dead-letter queue is advanced, for MVP log errors).
*   **Tasks & Sub-Tasks:**
    *   [S] Define `audiovisual_gestural_chunks` schema - Day 3
    *   [M] Implement frontend direct upload to Firebase Storage (`firebaseStorageService.js`) - Day 3
    *   [M] Develop `process_chunk` Cloud Function with Storage trigger, using `crud_operations.py` to save metadata - Day 3-4
    *   [S] Test chunk upload and Cloud Function processing - Day 4

---

### E. Backend - Core Logic in Firebase Cloud Functions (Python)

*   **Files to Modify/Create:**
    *   `backend/cloud_functions/`: Directory for all Cloud Functions (e.g., `auth_sync/`, `process_chunk/`, `tria_chat_handler/`). Each will have `main.py`, `requirements.txt`.
    *   `backend/core/`: Shared business logic, services, DB operations, models (e.g., `crud_operations.py`, `llm_service.py`, `tria_bots/`).
    *   `backend/core/db/pg_connector.py`: For Neon.tech.
    *   `.env` (for local simulation if using Firebase emulator) / Cloud Function environment variable configuration.
*   **Logic to Implement:**
    *   Refactor FastAPI routers and service logic into individual, focused Cloud Functions.
        *   `auth.py` router logic -> `auth_sync/main.py` (HTTP trigger).
        *   `chunks.py` router logic -> `process_chunk/main.py` (Storage trigger), and potentially an HTTP-triggered function if direct calls are needed.
        *   `tria.py` router logic -> `tria_chat_handler/main.py` (HTTP trigger).
    *   Shared logic like `crud_operations.py`, `llm_service.py`, Tria bot modules will reside in `backend/core/` and be imported by the Cloud Functions.
*   **Data Flow:**
    *   Functions triggered by HTTP requests from frontend, or by Firebase events (Storage, Pub/Sub).
    *   Functions use shared core logic to interact with DB (Neon.tech via `pg_connector.py`), LLMs, etc.
*   **Key Challenges/Considerations:**
    *   **Refactoring from Monolith (FastAPI) to Serverless (Cloud Functions):** Requires careful thought on function granularity, shared code management, and state handling (if any).
    *   **Cold Starts:** Can impact perceived latency for HTTP-triggered functions.
    *   **Execution Time Limits:** Cloud Functions have max execution times (default 60s, max 9 mins). Long-running Tria processes might need to be asynchronous or broken down.
    *   **Dependencies:** Managing dependencies for each Cloud Function (`requirements.txt`). The user will manually create `backend/requirements.txt` for shared `core` dependencies. Individual function `requirements.txt` should be minimal or empty if all deps are in the shared `backend/requirements.txt` and deployed together.
    *   **Local Development/Testing:** Firebase Emulator Suite is essential.
    *   **Networking:** Cloud Functions need to be configured to access Neon.tech (e.g., VPC connector if Neon DB is in a VPC, or allow public IPs if Neon DB is public - ensure security). For MVP, public connection to Neon with strong credentials might be simpler if allowed by Neon's free tier.
*   **Tasks & Sub-Tasks:**
    *   [S] Setup Neon.tech PostgreSQL database - Day 1
    *   [S] Configure `pg_connector.py` for Neon.tech and test connection from a local Python script - Day 1
    *   [M] Plan refactoring of FastAPI routes to individual Cloud Functions - Day 1
    *   [M] Develop and deploy `auth_sync` (HTTP) and `process_chunk` (Storage trigger) Cloud Functions - Day 2-4 (overlaps with sections A & D)
    *   [M] Develop and deploy `tria_chat_handler` (HTTP) Cloud Function - Day 5-6 (overlaps with section F)
    *   [M] Structure shared code in `backend/core/` - Ongoing

---

### F. Backend - MVP Tria Bot Logic (Python modules in Cloud Functions)

*   **Files to Modify/Create:**
    *   `backend/core/tria_bots/TriaBotBase.py` (As before, but now in `core`).
    *   `backend/core/tria_bots/ChunkProcessorBot.py` (As before, in `core`).
    *   `backend/core/tria_bots/ChatBot.py` (As before, in `core`).
    *   `backend/cloud_functions/tria_chat_handler/main.py` (New): HTTP-triggered Cloud Function to handle chat.
    *   `backend/cloud_functions/tria_process_chunk_result_handler/main.py` (Optional, if async processing of chunk by Tria is needed, possibly Pub/Sub triggered).
    *   `backend/core/services/llm_service.py` (Refactor from `backend/services/LLMService.py`).
    *   `backend/core/config.py` (Or use Cloud Function environment variables for API keys).
*   **Logic to Implement:**
    *   **`llm_service.py`**: (As before) Wrapper for Mistral/Devstral API.
    *   **`ChunkProcessorBot.py` (module):**
        *   Called by `process_chunk` Cloud Function (or a dedicated Tria processing function).
        *   Logs chunk metadata.
    *   **`ChatBot.py` (module):**
        *   Called by `tria_chat_handler` Cloud Function.
        *   Takes text input, uses `llm_service.py` for Mistral/Devstral. Basic static RAG.
    *   **`tria_chat_handler/main.py` (Cloud Function):**
        *   HTTP triggered. Receives user text.
        *   Instantiates/calls `ChatBot.py` logic.
        *   Returns LLM response.
        *   Logs interaction to `tria_learning_log` via `crud_operations.py`.
*   **Data Flow:** (Similar to before, but mediated by Cloud Functions)
    *   **Chat:** Frontend -> HTTP -> `tria_chat_handler` CF -> `ChatBot.py` -> `llm_service.py` -> Mistral/Devstral -> Response -> Frontend.
*   **Key Challenges/Considerations:**
    *   **Mistral/Devstral API Access:** Re-confirm no card needed for dev/free keys and understand rate limits. This is critical.
    *   **LLM Latency:** API calls can be slow; Cloud Function execution time includes this.
    *   Packaging Tria bot logic and dependencies for Cloud Functions.
*   **Tasks & Sub-Tasks:**
    *   [S] Re-confirm Mistral/Devstral API key situation (no card, free tier limits) - Day 1
    *   [M] Refactor `LLMService.py` into `backend/core/services/` - Day 4
    *   [S] Adapt `ChunkProcessorBot.py` and `ChatBot.py` as modules in `backend/core/tria_bots/` - Day 4-5
    *   [M] Implement `tria_chat_handler` Cloud Function - Day 5
    *   [S] Ensure Tria interactions are logged to PostgreSQL via `crud_operations.py` from Cloud Functions - Day 5

---

### G. Backend-Frontend Communication (HTTP for Cloud Functions)

*   **Files to Modify/Create:**
    *   `frontend/js/services/apiService.js`: Updated with URLs for HTTP-triggered Cloud Functions.
    *   (WebSocket related files like `nethologlyphClient.js` and `NetHoloGlyphService.py` are now DEFERRED/REMOVED for MVP due to Cloud Functions primary model).
*   **Logic to Implement:**
    *   All frontend-backend communication will use HTTPS requests to trigger specific Cloud Functions.
        *   Auth: `POST /auth_sync_user_function_url`
        *   Chunk Metadata (if needed beyond storage trigger): `POST /manual_chunk_process_function_url`
        *   Tria Chat: `POST /tria_chat_handler_function_url`
    *   Firebase SDK handles direct upload to Storage for chunks.
*   **Data Flow:**
    *   Frontend makes HTTPS calls to specific Cloud Function URLs.
    *   Cloud Functions process and return JSON responses.
*   **Key Challenges/Considerations:**
    *   **Simplicity:** This is simpler than managing WebSockets alongside Cloud Functions for MVP.
    *   **Real-time:** True real-time push from backend to frontend is harder with a pure Cloud Function HTTP model. For MVP, chat responses will be request/response. If Tria processing is long, frontend might need to poll a "get_result" Cloud Function (less ideal) or this part of UX is simplified for MVP (e.g., "Tria is processing, check back later"). For MVP, direct response from chat function is expected.
    *   Discovering Cloud Function URLs and managing them in frontend config.
*   **Tasks & Sub-Tasks:**
    *   [S] Update `apiService.js` with Cloud Function HTTP trigger URLs - Day 2 (ongoing as functions are developed)
    *   [S] Remove/Defer WebSocket client-side code for MVP - Day 2

## III. Timeline & Prioritization for June 9th

Refactoring to Firebase Cloud Functions might shift some backend effort but simplifies deployment infrastructure. The 10-day sprint remains.

**Phase 1: Foundation & Core Backend/Auth (Day 1-3)**

*   **MUST DO:**
    *   [S] Setup Neon.tech PostgreSQL.
    *   [S] Configure `pg_connector.py` for Neon.tech, test connection.
    *   [S] Setup Firebase Project (Auth, Storage, Cloud Functions). Ensure NO billing enabled on GCP project or confirm no card needed for free tier.
    *   [M] Implement Firebase Auth UI (frontend).
    *   [M] Develop `auth_sync` Firebase Cloud Function (Python) & integrate with frontend.
    *   [S] Define initial DB schemas (users, chunks, tria_log, basic history tables).
    *   [S] Basic HTML structure and UI placeholders for ALL buttons.

**Phase 2: Chunk Handling & Basic Tria with Cloud Functions (Day 3-5)**

*   **MUST DO:**
    *   [M] Implement frontend direct upload to Firebase Storage.
    *   [M] Develop `process_chunk` Cloud Function (Storage trigger) for metadata saving.
    *   [S] Obtain/Confirm Mistral/Devstral API keys (no card, usable free/dev tier).
    *   [M] Develop `llm_service.py` in `backend/core/`.
    *   [S] Adapt `ChunkProcessorBot.py` module.
    *   [M] Develop `tria_chat_handler` Cloud Function with `ChatBot.py` module for basic LLM chat.
    *   [S] Implement logging to `tria_learning_log` from Cloud Functions.
    *   [M] Basic `chatUI.js` (input field + display) connected to `tria_chat_handler` CF.
    *   [M] Make all UI buttons clickable; implement basic logic for MVP-critical ones.

**Phase 3: Frontend Visualization & UI Polish (Day 5-8)**

*   **MUST DO:** (Largely same)
    *   [M] Integrate/stabilize hologram rendering (`hologramRenderer.js` from `script.js`/PR #40).
    *   [M] Implement audio processing (`audioAnalyzer.js` from `script.js`/PR #40).
    *   [S] Connect audio to visuals (`audioVisualizer.js`, `hologramConfig.js`).
    *   [M] Test audio-reactivity.
    *   [M] Refine UI interactions (`uiManager.js`, `panelManager.js`).

**Phase 4: Integration, Testing, Bug Fixing, Docs (Day 8-10)**

*   **MUST DO:** (Largely same)
    *   [M] End-to-end testing of the full MVP loop with Cloud Functions.
    *   [L] Bug fixing.
    *   [S] Update `README.md` (setup, Firebase deployment, Function triggers).
    *   [S] Document environment variables for Cloud Functions.
    *   [S] Prepare for demo.

**Key Assumptions & Risks (Updated):**

*   **Firebase Cloud Functions Free Tier & Card:** Critical assumption that Firebase free tier (including Python Cloud Functions) can be used without enabling billing on the underlying GCP project, or that if billing is enabled, no card is immediately required for free tier usage. If a card becomes mandatory for deployment/operation, this is a **BLOCKER**.
*   **Neon.tech Free Tier for pgvector:** Assumed that pgvector extension is usable within Neon.tech's free tier without a card. If not, basic RAG is impossible, and an alternative PostgreSQL host without this limitation would be needed (major risk).
*   **Mistral/Devstral API:** (As before) Free/developer keys without card and with sufficient limits.
*   **Cloud Function Limitations:**
    *   *Cold Starts:* May affect latency of HTTP-triggered functions.
    *   *Execution Time:* Max 9 mins. Complex Tria tasks might need to be simplified or made async (post-MVP). For MVP, Tria logic within functions will be simple.
    *   *Complexity:* Managing dependencies and shared code across multiple functions.
*   **Refactoring Effort:** Adapting FastAPI logic to a serverless Cloud Functions model might have unforeseen complexities.
*   **PR #40 Stability:** (As before).
*   **Developer Availability & Focus:** (As before).

## IV. Final Check & Polish (Internal Audit by Jules)

This checklist is for "Jules" (the AI agent) to use before submitting the final MVP.

*   **[ ] Constraint Compliance:**
    *   [ ] PostgreSQL hosted on Neon.tech (verified no card required for free tier, pgvector assumed included).
    *   [ ] Backend logic implemented as Firebase Cloud Functions (Python). **Crucially verify no credit card was required for deployment/operation of these functions within their free tier.**
    *   [ ] Firebase Auth & Storage used (no card needed for these specific services' free tiers).
    *   [ ] Tria Bot LLM calls use Mistral/Devstral with API keys not requiring a credit card for free/dev usage (verify this assumption holds).
    *   [ ] No other services requiring credit card for free tier are used.
*   **[ ] Core Functionality Test:**
    *   [ ] User can sign up and log in.
    *   [ ] User data (UID, email) synced to PostgreSQL via `auth_sync` Cloud Function.
    *   [ ] User can upload a small audio/video chunk to Firebase Storage.
    *   [ ] `process_chunk` Cloud Function (Storage triggered) saves chunk metadata to PostgreSQL.
    *   [ ] Basic Tria bot (via `tria_chat_handler` Cloud Function) provides an acknowledgment/response visible in UI.
    *   [ ] Hologram visualization (basic shape) is displayed.
    *   [ ] Hologram reacts to microphone input.
    *   [ ] All UI buttons (Load Audio, Play, Pause, Stop, Mic, Fullscreen, XR, Gesture Record, Hologram List, Scan, Bluetooth, Tria, Telegram, GitHub, Install PWA) are clickable.
    *   [ ] MVP-critical buttons ("My Gestures," "My Holograms," "Chat/Tria input," Mic) have basic interaction logic.
*   **[ ] Technical Checks:**
    *   [ ] Frontend hosted on Firebase Hosting.
    *   [ ] Firebase Cloud Functions are deployed and operational.
    *   [ ] HTTP Triggers for Cloud Functions are correctly configured and callable. Storage Triggers are operational.
    *   [ ] Environment variables for Cloud Functions (DB credentials, API keys) are correctly configured.
    *   [ ] Basic error handling in Cloud Functions.
    *   [ ] Code (frontend and `backend/core/`, `backend/cloud_functions/`) is reasonably commented.
*   **[ ] Documentation:**
    *   [ ] `README.md` has clear instructions for Firebase project setup, frontend deployment, and Cloud Function deployment/configuration.
    *   [ ] Key environment variables needed for Cloud Functions are listed.
*   **[ ] MVP Scope Adherence:**
    *   [ ] Features are within the defined MVP scope. No scope creep.
    *   [ ] Complexity is managed; "keep it simple" principle applied, especially for Cloud Function logic.

This ULTIMATE plan provides a focused path to the June 9th MVP, emphasizing adherence to the critical "no credit card" constraint by leveraging Firebase Cloud Functions and Neon.tech. Success depends on diligent execution and proactive risk management.
