# Holographic Media Backend (FastAPI Application)

This directory contains the server-side application logic for the Holographic Media project, implemented as a **FastAPI (Python) application**. This application is designed to be containerized using Docker and deployed to platforms like Koyeb.

## Structure

-   **`app.py`:** The main FastAPI application instance is created and configured here. It includes routers, middleware, and global application state (like the R2 S3 client).
-   **`routers/`:** Contains APIRouter modules that group related endpoints (e.g., `auth.py`, `chat_sessions.py`, `holograms.py`). These are typically included in `app.py`.
-   **`api/v1/endpoints/`:** May contain additional specific endpoint modules, often organized by version.
-   **`core/`:** Houses shared business logic, services, and utilities.
    *   **`core/db/`:** Modules for interacting with Local/Cloud Databases (e.g., `astra_connector.py` for Astra DB, `schemas.sql` for structure reference).
    *   **`core/models/` (deprecated, see `models/`):** This might contain older Pydantic models. The primary location for Pydantic models is now the top-level `models/` directory within `backend/`.
    *   **`core/services/`:** Shared services, such as `llm_service.py` (if any direct LLM calls are made from backend).
    *   **`core/tria_agents/`:** Modules for specialized AI agents (Tria Agents), if their logic is directly invoked or managed by the FastAPI app.
    *   **`auth/` (at `backend/auth/`):** Contains authentication logic, including security dependencies for FastAPI using Firebase Admin SDK.
-   **`models/`:** Contains Pydantic models for data validation (incoming requests, database objects) and defining data structures used across the application.
-   **`requirements.txt`:** Lists all Python package dependencies required for the FastAPI application.
-   **`.env.example`:** Provides a template for environment variables needed for local development and production (e.g., database connection strings, API keys, R2 credentials).
-   **`Dockerfile` (in project root):** Used to build the Docker image for the backend application.

## Local Development & Testing

1.  **Python Virtual Environment:** It's highly recommended to use a Python virtual environment for managing dependencies.
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
2.  **Environment Variables:**
    *   Create a `.env` file by copying `.env.example`:
        ```bash
        cp .env.example .env
        ```
    *   Populate the `.env` file with your actual credentials for Astra DB (DataStax), Backblaze B2, Firebase Admin SDK (service account details, strictly for Auth), and any other required API keys.
3.  **Running the FastAPI Application:**
    *   Use Uvicorn to run the application locally:
        ```bash
        uvicorn backend.app:app --reload --port 8000
        ```
        The `--reload` flag enables auto-reloading on code changes. The backend will typically be available at `http://localhost:8000`.
4.  **Firebase Emulators (for Frontend and Auth Testing):**
    *   While the backend runs with Uvicorn, you might still use Firebase Emulators for testing frontend interactions with Firebase Authentication.
        ```bash
        firebase emulators:start
        ```
    *   Ensure your frontend application is configured to use the emulated Firebase services when running locally.

## Deployment

Deployment to Koyeb is handled via Docker:
*   The application is containerized using the `Dockerfile` located in the project root.
*   This Docker image is then deployed to Koyeb. This process can be automated through a CI/CD pipeline (e.g., using GitHub Actions) that builds the image, pushes it to a container registry, and triggers a new deployment on Koyeb. Alternatively, Koyeb can be configured to build directly from the repository.

## Dependencies

Python dependencies are managed in `backend/requirements.txt`. Ensure this file is updated when new packages are used. These dependencies are installed within the Docker container during the image build process.

## Configuration & Secrets

For deployed applications on Koyeb, environment variables (as listed in `.env.example`) must be securely configured in the Koyeb service settings. These include:
-   `ASTRA_DB_APPLICATION_TOKEN`, `ASTRA_DATABASE_URL`
-   `B2_ENDPOINT_URL`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`, `B2_BUCKET_NAME`
-   `GOOGLE_APPLICATION_CREDENTIALS` (path to service account key in the container) or `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 encoded JSON)
-   Any other API keys (e.g., `LLM_API_KEY`).

## Key Areas of Development & TODO

*   **Refine API Endpoints:** Ensure all API endpoints in `routers/` and `api/v1/endpoints/` are robust, well-documented, and secure.
*   **Tria Agent Integration:** Solidify how Tria agent logic (from `core/tria_agents/`) is invoked and managed by the FastAPI backend.
*   **Database Interactions:** Continue to ensure repositories are efficient and secure used Astra DB.
*   **Error Handling & Logging:** Implement comprehensive error handling and structured logging throughout the FastAPI application.
*   **Security:** Secure API endpoints using Firebase Authentication (via `backend.auth.security`). Review B2 bucket policies and CORS configurations.
*   **Testing:** Write unit tests for core logic and Pydantic models. Develop integration tests for API endpoints.
*   **Documentation:** Keep this README and API documentation (e.g., OpenAPI generated by FastAPI) up-to-date.

This FastAPI backend serves as the core API for the Holographic Media platform.
