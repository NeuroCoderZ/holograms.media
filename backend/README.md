# Holographic Media Backend (Firebase Cloud Functions)

This directory contains the server-side application logic for the Holographic Media project, implemented using **Firebase Cloud Functions (Python runtime)**. This serverless architecture allows for scalable and event-driven backend operations.

## Structure

The `backend/` directory is typically configured as the source for Firebase Cloud Functions in `firebase.json` (e.g., by setting `functions.source` to "backend").

-   **`main.py`:**
    *   This is the primary file where Firebase Cloud Functions are defined or imported. Functions can be triggered by HTTP requests, Firebase Storage events, Firebase Authentication events, Pub/Sub messages, etc.
    *   For better organization, complex functions or groups of related functions might be defined in separate files under `backend/cloud_functions/` and then imported into `main.py`.
-   **`cloud_functions/` (Optional Subdirectory):**
    *   If used, this directory can contain individual Python files for different Cloud Functions or groups of related functions (e.g., `auth_triggers.py`, `storage_triggers.py`, `tria_handlers.py`).
-   **`core/`:** This directory houses shared business logic, services, and utilities imported by the Cloud Functions to promote modularity and code reuse.
    *   **`core/db/`:** Modules for interacting with the Neon.tech PostgreSQL database (e.g., `pg_connector.py` for connection management using `asyncpg`, `crud_operations.py` for data operations, `schema.sql` for DB structure reference).
    *   **`core/models/`:** Pydantic models for data validation (incoming requests, database objects) and defining data structures.
    *   **`core/services/`:** Shared services, such as `llm_service.py` for interacting with LLM APIs (Google Gemini, Mistral).
    *   **`core/tria_bots/`:** Modules for each specialized AI bot in the Tria network (e.g., `ChatBot.py`, `ChunkProcessorBot.py`, `MemoryBot.py`). These are called by Cloud Functions.
    *   **`core/auth/`:** May contain utility functions related to custom token validation or user data handling if extending Firebase Authentication, often using `firebase_admin.auth`.
-   **`requirements.txt`:** Lists all Python package dependencies required for the Cloud Functions. These are installed by Firebase during deployment.
-   **`.env.example`:** Provides a template for environment variables needed for local development (e.g., database connection strings for local PostgreSQL if used with the emulator, API keys for external services). For deployed functions, secrets are managed via `firebase functions:config:set` or Google Secret Manager.

**Obsolete Files/Concepts (from previous FastAPI architecture):**
-   `app.py` (as a FastAPI entry point): No longer the primary deployment target for cloud. May be repurposed for local emulation of HTTP triggers if desired, but the Firebase Local Emulator Suite is the standard.
-   `routers/` (FastAPI routers): Replaced by individual HTTP-triggered Cloud Functions defined in `main.py` or under `cloud_functions/`.

## Local Development & Testing

1.  **Firebase Local Emulator Suite:** This is the primary tool for local development and testing. It allows you to emulate Cloud Functions, Firebase Hosting, Authentication, Storage, etc., on your local machine.
    *   Start the emulators (ensure you have `firebase-tools` installed and are logged in via `firebase login`):
        ```bash
        firebase emulators:start --only functions,hosting,auth,storage
        # Add other services like firestore if used.
        ```
    *   The Emulator UI (usually `http://localhost:4000`) provides an interface to view function logs, triggered events, and service states.
2.  **Python Virtual Environment:** It's highly recommended to use a Python virtual environment for managing dependencies within the `backend/` (or functions source) directory.
    ```bash
    cd backend # or your functions source directory
    python3 -m venv .venv
    source .venv/bin/activate # Linux/macOS
    # .\.venv\Scripts\activate # Windows
    pip install -r requirements.txt
    ```
3.  **Environment Variables for Emulation:**
    *   Functions running in the local emulator can access environment variables set for them. For secrets, you can create a `.env` file that your local functions can load using `python-dotenv` if you are not using the emulator's built-in config emulation, or set runtime variables via the emulator's configuration. Refer to the `.env.example` in the root for variables used.

## Deployment

Deployment of Cloud Functions is handled via the Firebase CLI:
```bash
# Deploy all functions defined in the Firebase project (typically from source in backend/)
firebase deploy --only functions

# Deploy a specific function (or group if using function names/groups)
# firebase deploy --only functions:yourFunctionName
# or firebase deploy --only functions:yourCodebaseName:yourFunctionName
```

## Dependencies

Python dependencies are managed in `backend/requirements.txt`. Ensure this file is updated when new packages are used. Firebase installs these dependencies when deploying your functions.

## Configuration & Secrets

For deployed functions, sensitive information like API keys or database connection strings should be set using Firebase Functions configuration or Google Secret Manager:
```bash
# Using Firebase Functions Configuration
firebase functions:config:set yourservice.key="YOUR_API_KEY" yourservice.url="YOUR_URL"
# Example for Neon.tech connection string:
firebase functions:config:set db.url="postgresql://user:pass@host:port/dbname"
firebase functions:config:set llm.mistral_api_key="your_mistral_key"

# Access in Python (see SYSTEM_INSTRUCTION_CURRENT.md, Section VIII for details)
# import os
# api_key = os.environ.get('YOURSERVICE_KEY') # Firebase auto-uppercases and adds group prefix
```

## Key Areas of Development & TODO (MVP Focus)

*   **Implement Core Cloud Functions:** Develop and test all Cloud Functions required for MVP features (user auth sync, chunk processing, Tria chat handler).
*   **Refine Tria Bot Logic:** Implement basic functionality in `ChatBot.py` and `ChunkProcessorBot.py` for MVP responses and data logging.
*   **Database Integration:** Ensure robust `crud_operations.py` for Neon.tech PostgreSQL, including pgvector usage if part of MVP RAG.
*   **Error Handling & Logging:** Implement comprehensive error handling and structured logging (to Google Cloud Logging) in all Cloud Functions.
*   **Security:** Secure Cloud Function endpoints using Firebase Authentication. Configure appropriate Firebase Storage security rules.
*   **Testing:** Write unit tests for `backend/core/` modules and integration tests for Cloud Functions using the Firebase Local Emulator Suite.
*   **Documentation:** Keep this README and related architectural documents up-to-date.
*   **Genkit Exploration (Post-MVP):** Plan for future migration of complex AI flows to Genkit.

This backend is designed to be the serverless foundation for the Holographic Media platform, evolving with Tria's capabilities.
