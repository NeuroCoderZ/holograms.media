# ULTIMATE ROAD TO MVP (Strict Deadline: June 9th, 2025)

## Introduction

This document outlines the definitive plan to achieve the Minimum Viable Product (MVP) for "holograms.media" by June 9th, 2025. It supersedes previous MVP planning documents and incorporates detailed technical breakdowns, timelines, and critical considerations based on the Deep Research System Blueprint (DRSB) and strict project constraints.

**Core Constraint:** No reliance on services requiring credit card validation for their free tiers. This significantly impacts choices for backend hosting and advanced AI services. Firebase Cloud Functions (Python runtime) will be the primary backend architecture.

## I. Reconfirmed MVP Core Functionality Loop & "Definition of Done"

The MVP will enable a user to:

1.  **Authenticate:** Sign up and log in using Firebase Authentication. User data will be synced to a **Neon.tech PostgreSQL** database.
2.  **Upload Media:** Upload an audio/video file ("interaction chunk") to Firebase Storage.
3.  **Tria Interaction (Basic):**
    *   A Firebase Cloud Function is triggered by the new chunk in Firebase Storage (or by an HTTP request from frontend).
    *   A simplified Tria bot (Python module within `backend/core/tria_bots/`, called by the Cloud Function) processes metadata.
    *   A basic response or acknowledgment is sent back to the user (e.g., via another Cloud Function callable by the frontend, like `tria_chat_handler`).
4.  **Hologram Visualization & Audio Reactivity:**
    *   The user can see a placeholder or basic 3D representation (Three.js/WebGL).
    *   This visualization will react to microphone input (based on logic formerly in `script.js` and PR #40, now modularized in `frontend/js/audio/` and `frontend/js/3d/`).
5.  **View History (Placeholder):** Buttons for "My Gestures," "My Holograms," "Chat History" will be present and clickable. CRUD functionality will be stubbed or point to a basic list from **Neon.tech PostgreSQL** if time permits, callable via HTTP-triggered Cloud Functions.

**"Definition of Done" for MVP:**

*   All core functionalities (1-5 above) are demonstrable using the Firebase ecosystem.
*   Frontend is hosted on Firebase Hosting.
*   Backend logic is implemented as **Firebase Cloud Functions (Python runtime)**.
*   **Neon.tech PostgreSQL** database is structured and integrated for user data, chunk metadata, and Tria logs.
*   Firebase Storage is used for media chunks.
*   Basic Tria bot logic (Python modules within Cloud Functions, e.g., in `backend/core/tria_bots/` and `backend/core/services/`, using direct Mistral/Devstral/Gemini API calls) provides a response.
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
    *   `frontend/js/3d/hologramRenderer.js`: Core Three.js logic for rendering the hologram. Incorporates refined rendering loop, object creation, and update mechanisms (inspired by `script.js` legacy and PR #40).
    *   `frontend/js/3d/sceneSetup.js`: Handles scene, camera, and lighting setup.
    *   `frontend/js/audio/audioAnalyzer.js`: Manages microphone input and performs FFT analysis (based on logic from `script.js`/PR #40).
    *   `frontend/js/audio/audioVisualizer.js`: Connects audio analysis results from `audioAnalyzer.js` to visual parameters in `hologramRenderer.js`.
    *   `frontend/js/config/hologramConfig.js`: Stores default parameters and thresholds for audio reactivity.
    *   `frontend/js/main.js`: Orchestrates the initialization and interaction of frontend modules.
    *   `frontend/index.html`: Contains the canvas element for Three.js rendering.
*   **Logic to Implement (from `script.js` / PR #40 Refactoring into Modules):**
    *   **`hologramRenderer.js`**:
        *   Stable core rendering loop.
        *   Functions to create/update the primary visual object (e.g., `createHolographicSphere`, `updateHologramAppearance`).
        *   Shader material setup if custom shaders are used.
        *   Dynamic response to parameters (intensity, frequency) for modifying scale, color, deformation.
    *   **`audioAnalyzer.js`**:
        *   Encapsulated microphone access using `navigator.mediaDevices.getUserMedia`.
        *   Robust FFT implementation.
        *   Optional averaging/smoothing of FFT data.
    *   **`audioVisualizer.js`**:
        *   Logic to map frequency bands/intensity from `audioAnalyzer.js` to visual parameters in `hologramRenderer.js`, using settings from `hologramConfig.js`.
*   **Data Flow:**
    1.  User grants microphone permission.
    2.  `audioAnalyzer.js` captures audio, performs FFT.
    3.  `audioVisualizer.js` receives FFT data, consults `hologramConfig.js`.
    4.  `audioVisualizer.js` calls update functions in `hologramRenderer.js`.
    5.  `hologramRenderer.js` modifies the Three.js scene.
*   **Key Challenges/Considerations:**
    *   Ensuring stable integration of PR #40 concepts into the modular structure.
    *   Performance of client-side audio processing and rendering.
    *   Cross-browser compatibility and microphone permissions.
*   **Tasks & Sub-Tasks:**
    *   [M] Implement/stabilize `hologramRenderer.js` with core visualization logic - Day 7
    *   [M] Implement/stabilize `audioAnalyzer.js` with audio capture and FFT - Day 7
    *   [S] Develop and integrate `hologramConfig.js` with `audioVisualizer.js` - Day 7
    *   [S] Ensure `audioVisualizer.js` correctly maps audio to visual parameters - Day 7-8
    *   [M] Thoroughly test and debug audio-reactive visualization - Day 8

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
    *   `backend/cloud_functions/` (or `backend/main.py`): Directory/file for all Cloud Function definitions (e.g., `auth_sync_function`, `process_chunk_function`, `tria_chat_handler_function`). Each function will have its specific trigger (HTTP, Storage, etc.).
    *   `backend/core/`: Shared business logic, services, DB operations (with Neon.tech PostgreSQL), models (Pydantic), Tria bot modules.
        *   `backend/core/db/pg_connector.py`: For Neon.tech PostgreSQL connection.
        *   `backend/core/crud_operations.py`: For database interactions.
        *   `backend/core/services/llm_service.py`: For LLM API calls.
        *   `backend/core/tria_bots/`: Modules like `ChatBot.py`, `ChunkProcessorBot.py`.
    *   Firebase Functions configuration for environment variables (e.g., API keys, DB URL).
*   **Logic to Implement:**
    *   Develop individual, focused Cloud Functions for each backend operation (auth sync, chunk processing, Tria chat).
    *   These functions will import and use shared logic from `backend/core/`.
*   **Data Flow:**
    *   Functions triggered by HTTP requests from frontend (via `apiService.js`) or Firebase service events (Storage, Auth, Pub/Sub).
    *   Functions use shared core logic (`backend/core/`) to interact with Neon.tech PostgreSQL, LLM APIs, etc.
*   **Key Challenges/Considerations:**
    *   **Function Granularity:** Designing functions that are neither too small (leading to complex call chains) nor too large (monolithic).
    *   **Cold Starts:** Potential latency impact; optimize function code and manage dependencies.
    *   **Execution Time Limits:** Max execution time for Cloud Functions (default 60s, max 540s/9mins). Design for efficiency.
    *   **Dependencies:** Manage Python dependencies for Cloud Functions via `backend/requirements.txt`.
    *   **Local Development/Testing:** Firebase Local Emulator Suite is crucial for testing functions locally.
    *   **Networking & Security:** Securely connect Cloud Functions to Neon.tech PostgreSQL. Ensure IAM permissions and Firebase security rules are correctly configured.
*   **Tasks & Sub-Tasks:**
    *   [S] Setup Neon.tech PostgreSQL database and test connection from a local Python script with `pg_connector.py` - Day 1
    *   [M] Define specific Cloud Functions needed for MVP (e.g., `auth_sync_on_user_create`, `process_chunk_on_storage_finalize`, `tria_chat_http_handler`) - Day 1
    *   [M] Develop and deploy `auth_sync` Cloud Function (e.g., triggered by Firebase Auth user creation) - Day 2-4 (overlaps with sections A & D)
    *   [M] Develop and deploy `process_chunk` Cloud Function (Storage trigger) - Day 2-4 (overlaps with sections A & D)
    *   [M] Develop and deploy `tria_chat_handler` Cloud Function (HTTP trigger) - Day 5-6 (overlaps with section F)
    *   [M] Structure and implement shared business logic in `backend/core/` (services, DB operations, models) - Ongoing

---

### F. Backend - MVP Tria Bot Logic (Python modules in `backend/core/tria_bots/`)

*   **Files to Modify/Create:**
    *   `backend/core/tria_bots/ChatBot.py`: Module for handling chat logic.
    *   `backend/core/tria_bots/ChunkProcessorBot.py`: Module for processing uploaded chunks.
    *   `backend/core/services/llm_service.py`: Wrapper for LLM API calls (Mistral/Devstral, Google Gemini).
    *   Cloud Function files (e.g., `backend/cloud_functions/tria_chat_handler/main.py`, `backend/cloud_functions/process_chunk/main.py`) will import and use these modules.
*   **Logic to Implement:**
    *   **`llm_service.py`**: Standardized way to call different LLM APIs.
    *   **`ChunkProcessorBot.py`**:
        *   Called by the `process_chunk` Cloud Function.
        *   Logs chunk metadata to Neon.tech PostgreSQL.
        *   For MVP, may perform a very basic analysis or simply acknowledge processing.
    *   **`ChatBot.py`**:
        *   Called by the `tria_chat_handler` Cloud Function.
        *   Takes text input, uses `llm_service.py` for LLM interaction.
        *   May perform basic RAG using data from Neon.tech PostgreSQL.
    *   The respective Cloud Functions will:
        *   Handle incoming requests/triggers.
        *   Instantiate and call appropriate bot modules from `backend/core/tria_bots/`.
        *   Return responses.
        *   Log interactions to `tria_learning_log` table in Neon.tech PostgreSQL via `crud_operations.py`.
*   **Data Flow (Chat Example):**
    *   Frontend -> HTTP Request -> `tria_chat_handler` Cloud Function -> `ChatBot.py` (in `backend/core/tria_bots/`) -> `llm_service.py` -> LLM API -> Response -> `ChatBot.py` -> Cloud Function -> HTTP Response -> Frontend.
*   **Key Challenges/Considerations:**
    *   **LLM API Access:** Ensuring reliable access to Mistral/Devstral/Gemini APIs within free tier limits.
    *   **LLM Latency:** Managing potential delays from LLM API calls within Cloud Function execution limits.
    *   Structuring bot logic in `backend/core/` for clarity and testability.
*   **Tasks & Sub-Tasks:**
    *   [S] Confirm LLM API key availability and free tier usage conditions - Day 1
    *   [M] Implement `llm_service.py` in `backend/core/services/` for Mistral/Gemini - Day 4
    *   [M] Implement `ChunkProcessorBot.py` and `ChatBot.py` modules in `backend/core/tria_bots/` - Day 4-5
    *   [M] Ensure `tria_chat_handler` and `process_chunk` Cloud Functions correctly use these bot modules - Day 5
    *   [S] Implement logging of Tria interactions to Neon.tech PostgreSQL from Cloud Functions - Day 5

---

### G. Backend-Frontend Communication (HTTP for Cloud Functions)

*   **Files to Modify/Create:**
    *   `frontend/js/services/apiService.js`: To be updated with URLs for all HTTP-triggered Cloud Functions.
    *   WebSocket related files (e.g., `nethologlyphClient.js`, `NetHoloGlyphService.py`) are **deferred post-MVP**.
*   **Logic to Implement:**
    *   All primary frontend-backend communication for MVP will use HTTPS requests to trigger specific Firebase Cloud Functions.
        *   Auth-related calls (if custom sync beyond Firebase SDK is needed): e.g., `POST /auth_sync_function_url` (actual URL from Firebase).
        *   Tria Chat: e.g., `POST /tria_chat_handler_function_url`.
        *   Other MVP API calls as defined.
    *   Firebase SDK will be used on the client for direct interaction with Firebase Auth (login/signup) and Firebase Storage (file uploads).
*   **Data Flow:**
    *   Frontend uses Firebase SDK for Auth & Storage.
    *   Frontend makes HTTPS calls (via `apiService.js`) to specific Cloud Function URLs for other backend logic.
    *   Cloud Functions process requests and return JSON responses.
*   **Key Challenges/Considerations:**
    *   Managing Cloud Function URLs in frontend configuration.
    *   Ensuring consistent request/response formats between frontend and Cloud Functions.
    *   For MVP, real-time communication is limited to request/response model. True real-time features (e.g., via WebSockets or Firestore listeners for push updates) are post-MVP.
*   **Tasks & Sub-Tasks:**
    *   [S] Finalize list of all HTTP Cloud Function endpoints needed for MVP and document their expected request/response payloads - Day 2
    *   [S] Update `frontend/js/services/apiService.js` to correctly call deployed/emulated Cloud Function URLs - Day 2 (ongoing as functions are developed)
    *   [S] Confirm all WebSocket-related code is excluded from MVP build/deployment - Day 2

## III. Timeline & Prioritization for June 9th (Firebase Focused)

The transition to Firebase Cloud Functions simplifies deployment infrastructure but requires careful planning of function logic and interactions. The 10-day sprint remains ambitious.

**Phase 1: Foundation & Core Backend/Auth (Day 1-3)**

*   **MUST DO:**
    *   [S] Setup Neon.tech PostgreSQL database, configure connection string for Firebase.
    *   [S] Test Neon.tech connection from a local Python script using `pg_connector.py` from `backend/core/db/`.
    *   [S] Setup Firebase Project: Enable Authentication (Email/Password, Google), Storage, Cloud Functions (Python), Hosting. **Verify "no credit card required" for free tiers throughout.**
    *   [M] Implement Firebase Auth UI and logic in `frontend/js/core/auth.js`.
    *   [M] Develop `auth_sync` Firebase Cloud Function (Python, triggered by Firebase Auth user creation or custom HTTP call) to sync user data to Neon.tech PostgreSQL.
    *   [S] Define and create initial DB schemas in Neon.tech (users, audiovisual_gestural_chunks, tria_learning_log, basic user history tables like `user_chat_sessions`).
    *   [S] Basic HTML structure (`frontend/index.html`) and UI placeholders for all MVP buttons and panels.

**Phase 2: Chunk Handling & Basic Tria with Cloud Functions (Day 3-5)**

*   **MUST DO:**
    *   [M] Implement frontend direct upload to Firebase Storage using `frontend/js/services/firebaseStorageService.js`.
    *   [M] Develop `process_chunk` Firebase Cloud Function (Python, Storage trigger) for saving chunk metadata to Neon.tech PostgreSQL.
    *   [S] Obtain/Confirm Mistral/Devstral/Google Gemini API keys and ensure they can be used from Cloud Functions without card validation for free/dev tier.
    *   [M] Implement `llm_service.py` in `backend/core/services/` for interacting with chosen LLM APIs.
    *   [S] Implement `ChunkProcessorBot.py` module in `backend/core/tria_bots/`.
    *   [M] Develop `tria_chat_handler` Firebase Cloud Function (Python, HTTP trigger) integrating `ChatBot.py` from `backend/core/tria_bots/` for basic LLM chat & RAG.
    *   [S] Implement logging of Tria interactions to `tria_learning_log` table in Neon.tech PostgreSQL from relevant Cloud Functions.
    *   [M] Implement basic `chatUI.js` in frontend, connected to `tria_chat_handler` Cloud Function.
    *   [M] Ensure all MVP-critical UI buttons have basic interaction logic implemented in `frontend/js/ui/uiManager.js`.

**Phase 3: Frontend Visualization & UI Polish (Day 5-8)**

*   **MUST DO:**
    *   [M] Integrate and stabilize audio-reactive hologram rendering in `frontend/js/3d/hologramRenderer.js` (based on prior `script.js`/PR #40 logic).
    *   [M] Implement audio processing in `frontend/js/audio/audioAnalyzer.js`.
    *   [S] Connect audio analysis to visual parameters via `frontend/js/audio/audioVisualizer.js` and `frontend/js/config/hologramConfig.js`.
    *   [M] Test and debug audio-reactivity thoroughly on Firebase Hosting.
    *   [M] Refine UI interactions and panel management (`frontend/js/ui/uiManager.js`, `frontend/js/ui/panelManager.js`).

**Phase 4: Integration, Testing, Bug Fixing, Docs (Day 8-10)**

*   **MUST DO:**
    *   [M] End-to-end testing of the full MVP loop using Firebase deployed services (Auth, Hosting, Functions, Storage, Neon.tech DB).
    *   [L] Intensive bug fixing based on E2E testing.
    *   [S] Update `README.md` with final setup, Firebase deployment steps, and Cloud Function trigger information.
    *   [S] Document all necessary environment variables for Cloud Functions (e.g., in `.env.example` and for Firebase config).
    *   [S] Prepare a concise demo script for the MVP.

**Key Assumptions & Risks (Updated for Firebase):**

*   **Firebase/Neon.tech Free Tier & Card:** **CRITICAL BLOCKER IF FALSE.** Assumes Firebase free tier (Auth, Hosting, Storage, Cloud Functions Python) and Neon.tech free tier (PostgreSQL, pgvector) can be fully utilized for MVP development and initial operation without requiring credit card validation, or if billing is technically enabled on GCP, that free quotas are sufficient and no charges will be incurred.
*   **LLM API Access:** Assumes free/developer keys for Mistral/Devstral/Gemini can be obtained without card and offer sufficient limits for MVP development and demo.
*   **Cloud Function Limitations:**
    *   *Cold Starts:* May affect perceived latency. Plan for this in UX or optimize functions.
    *   *Execution Time:* Sufficient for MVP Tria logic (direct LLM calls are relatively quick).
    *   *Complexity & Dependencies:* Manageable for MVP scope.
*   **PR #40 Frontend Logic:** Assumes the visual/audio logic from PR #40 can be stably integrated into the modular frontend.
*   **Developer Availability & Focus:** Remains a constant factor.

## IV. Final Check & Polish (Internal Audit by Jules - Firebase Focus)

This checklist is for "Jules" (the AI agent) to use before submitting the final MVP.

*   **[ ] Constraint Compliance:**
    *   [ ] **Neon.tech PostgreSQL** used (verified no card required for free tier, pgvector assumed included & functional).
    *   [ ] Backend logic exclusively via **Firebase Cloud Functions (Python)**. Verified no credit card was required for deployment/operation within free tier limits.
    *   [ ] **Firebase Auth & Storage** used (verified no card needed for free tiers).
    *   [ ] Tria Bot LLM calls use Mistral/Devstral/Gemini with API keys not requiring a credit card for free/dev usage.
    *   [ ] No other services requiring credit card for free tier are used.
*   **[ ] Core Functionality Test (All on Firebase):**
    *   [ ] User can sign up and log in via Firebase Auth.
    *   [ ] User data (UID, email) synced to Neon.tech PostgreSQL via `auth_sync` (or equivalent) Cloud Function.
    *   [ ] User can upload a small audio/video chunk to Firebase Storage.
    *   [ ] `process_chunk` Cloud Function (Storage triggered) saves chunk metadata to Neon.tech PostgreSQL.
    *   [ ] Basic Tria bot (via `tria_chat_handler` Cloud Function) provides an LLM-generated acknowledgment/response visible in UI.
    *   [ ] Hologram visualization (basic shape) is displayed on Firebase Hosting.
    *   [ ] Hologram reacts to microphone input.
    *   [ ] All MVP-critical UI buttons (as per `SYSTEM_INSTRUCTION_CURRENT.md`) are clickable and trigger appropriate actions (e.g., calls to Cloud Functions, UI changes).
*   **[ ] Technical Checks (Firebase Specific):**
    *   [ ] Frontend deployed and accessible via Firebase Hosting URL.
    *   [ ] All required Firebase Cloud Functions are deployed and operational (check logs in Firebase Console / Google Cloud Logging).
    *   [ ] HTTP Triggers for Cloud Functions are correctly configured and callable from frontend. Storage Triggers are operational.
    *   [ ] Environment variables for Cloud Functions (DB connection string, LLM API keys) are correctly configured using `firebase functions:config:set` and accessible by functions.
    *   [ ] Basic error handling and logging are present in Cloud Functions.
    *   [ ] Code (frontend, `backend/core/`, `backend/cloud_functions/` or `backend/main.py`) is reasonably commented.
    *   [ ] Firebase Security Rules for Storage (and Firestore, if used) are configured for basic MVP security (e.g., authenticated users can write to their own paths).
*   **[ ] Documentation:**
    *   [ ] `README.md` has clear instructions for Firebase project setup, local emulation (`firebase emulators:start`), frontend deployment (`firebase deploy --only hosting`), and Cloud Function deployment (`firebase deploy --only functions`).
    *   [ ] Key environment variables for Cloud Functions are documented (e.g., in `.env.example` or a separate config note).
*   **[ ] MVP Scope Adherence:**
    *   [ ] Features are within the defined MVP scope as per `ULTIMATE_ROAD_TO_MVP_JUNE_9.md`. No scope creep.
    *   [ ] Complexity is managed; "keep it simple" principle applied, especially for Cloud Function logic and Tria MVP features.

This ULTIMATE plan provides a focused path to the June 9th MVP, emphasizing adherence to the critical "no credit card" constraint by leveraging Firebase Cloud Functions and Neon.tech. Success depends on diligent execution and proactive risk management.
