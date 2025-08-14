<!-- TODO: REVIEW FOR DEPRECATION - This project structure report needs significant updates. The frontend/js/ section is highly conceptual and does not match the current module structure. Backend directory details (e.g., cloud_functions vs functions, api/v1/endpoints vs routers) need verification. Descriptions for holograph, nethologlyph, and tria-genkit-core are speculative. The docs/ directory structure is outdated. -->
```markdown
# Project Structure Report

## 1. Introduction

This report provides a detailed overview of the directory and file structure for the Holograms Media Project. Its purpose is to help developers understand the organization of the codebase, the roles of different components, and where to find specific pieces of functionality.

## 2. High-Level Overview

The project is composed of several key high-level components:

*   **Backend (`backend/`)**: A Python-based application, likely using FastAPI, responsible for core business logic, API services, database interactions, and managing Tria AI bot functionalities.
*   **Frontend (`frontend/`)**: A JavaScript-based web application (details to be confirmed, but typical for user interfaces) allowing users to interact with the platform.
*   **Cloud Functions (`backend/cloud_functions/` and potentially `tria-genkit-core/`)**: Serverless functions for specific tasks, likely deployed on Google Cloud. Firebase Functions are used, as indicated by `firebase.json` and `.firebaserc`. Genkit flows are also a form of serverless/managed functions.
*   **Blockchain/DAO (`holograph/`)**: Contains elements related to Holograph DAO, possibly smart contracts or related utilities for decentralized governance or operations.
*   **Nethologlyph (`nethologlyph/`)**: Likely implements the NetHoloGlyph protocol for real-time communication between client and server, handling holographic data, gestures, and Tria state updates. Contains client-side JS and potentially server-side components (server part not explicitly listed in recent file views but implied by protocol).
*   **Tria Genkit Core (`tria-genkit-core/`)**: Contains AI flows and tools built using Google's Genkit framework, likely for orchestrating AI/LLM functionalities for Tria.
*   **Documentation (`docs/`)**: Contains project documentation, including architecture, reports, and research.
*   **Scripts (`scripts/`)**: Utility scripts for development, deployment, or operational tasks.
*   **Tests (`tests/` or per-component `tests/`)**: Contains unit, integration, and possibly end-to-end tests for various parts of the project.

## 3. Detailed Structure

### Root Directory Files

The root directory contains key configuration and definition files:

-   **`.firebaserc`**: Configuration file for Firebase CLI, linking to Firebase projects (e.g., `holograms-media-mvp`).
-   **`firebase.json`**: Defines rules for Firebase services, including Firestore, Storage, Hosting, and Functions deployment.
-   **`package.json`**: Node.js project manifest, defining dependencies, scripts, and metadata, likely for frontend, Genkit, or Nethologlyph client.
-   **`package-lock.json`**: Records exact versions of Node.js dependencies.
-   **`requirements.txt`**: Python dependencies for the main backend application. (There are also per-function `requirements.txt`)
-   **`Dockerfile`**: Instructions for building a Docker container image, likely for the backend application or another component.
-   **`cloudbuild.yaml`**: Configuration for Google Cloud Build, defining CI/CD pipelines.
-   **`.gitignore`**: Specifies intentionally untracked files that Git should ignore.
-   **`README.md`**: Main project readme, providing an overview and setup instructions.
-   **`genkit.env`**: Environment variables for Genkit framework (potentially).
-   **`tsconfig.json`**: Configuration for TypeScript compiler, used for TypeScript projects (e.g., Genkit, potentially frontend or Nethologlyph).
-   **`.github/`**: Contains GitHub-specific files, typically for workflows (CI/CD), issue templates, etc.

### `backend/`

Main directory for the Python FastAPI backend application.

-   **`app.py`**: Main FastAPI application setup, including global configurations, middleware, and startup/shutdown event handlers. Initializes services like Firebase Admin SDK and R2 client.
-   **`main.py`**: Exports Google Cloud Functions defined in `backend/cloud_functions/` for Firebase CLI deployment.
-   **`api/`**: Contains API endpoint definitions.
    -   **`v1/`**: Version 1 of the API.
        -   **`__init__.py`**: Makes `v1` a Python package.
        -   **`endpoints/`**: Specific resource endpoints (e.g., `chunks.py`, `gesture_routes.py`, `interaction_chunks.py`, `public_holograms.py`, `tria_commands.py`).
            -   **`__init__.py`**: Makes `endpoints` a Python package.
-   **`auth/`**: Authentication-related logic.
    -   **`security.py`**: Handles Firebase authentication (token verification, user retrieval/creation).
-   **`core/`**: Core business logic, services, and utilities.
    -   **`__init__.py`**: Makes `core` a Python package.
    -   **`auth_service.py`**: Service for Firebase authentication operations.
    -   **`crud_operations.py`**: Functions for Create, Read, Update, Delete operations on the database.
    -   **`db/`**: Database interaction logic.
        -   **`pg_connector.py`**: Utility for connecting to the PostgreSQL database (Neon).
        -   `schema.sql` (Found in `backend/core/db/schema.sql` or `backend/db/schemas.sql`): SQL schema definition for the database.
    -   **`models/`**: Pydantic models for data structure, validation, and ORM compatibility (e.g., `base_models.py`, `user_models.py`, `multimodal_models.py`).
        -   **`__init__.py`**: Exports various Pydantic models.
    -   **`services/`**: Higher-level business logic services.
        -   **`llm_service.py`**: Service for interacting with LLMs (e.g., Mistral AI).
    -   **`tria_bots/`**: Modules for different Tria AI bot functionalities.
        -   **`ChatBot.py`**: Core conversational AI logic for Tria.
        -   **`ChunkProcessorBot.py`**: Handles processing of audiovisual/gestural chunks.
        -   `azr/` (Likely within `tria_bots/` or `core/tria_bots/`): Components for Absolute Zero Reasoning.
-   **`cloud_functions/`**: Source code for individual Google Cloud Functions managed by Firebase.
    -   **`auth_sync/`**: Cloud Function for synchronizing Firebase Auth users with the backend database.
        -   **`main.py`**: Handler logic for the `auth_sync` function.
        -   **`requirements.txt`**: Python dependencies for this specific function.
    -   **`hello_world/`**: Example/test Cloud Function.
    -   **`process_chunk/`**: Cloud Function triggered by storage events to process media chunks.
    -   **`tria_chat_handler/`**: Cloud Function to handle Tria chat interactions.
-   **`db/`**: (May be partially superseded by `core/db/`) Contains database-related files.
    -   `schemas.sql`: SQL schema definition.
-   **`functions/`**: (May be partially superseded by `cloud_functions/`) Contains serverless function code.
    -   **`auth_sync.py`**: Standalone Google Cloud Function for auth sync (might be an alternative or older version to the one in `cloud_functions/`).
-   **`llm/`**: Modules related to Large Language Model interactions.
    -   **`langchain_utils.py`**, **`mistral_llm.py`**: Utilities for specific LLM providers or frameworks.
-   **`models/`**: (May be partially superseded by `core/models/`) Pydantic models. This directory seems to be a more general collection compared to `core/models`.
-   **`routers/`**: FastAPI routers defining API endpoints (e.g., `auth.py`, `chat.py`, `holograms.py`). These appear to be legacy or a different style of routing compared to `api/v1/endpoints/`.
-   **`services/`**: (May be partially superseded by `core/services/`) Business logic services (e.g., `AuthService.py`, `NetHoloGlyphService.py`).
-   **`tests/`**: Unit and integration tests for the backend.
-   **`requirements.txt`**: Python dependencies for the main backend application.
-   **`config.py`**: Backend configuration settings.
-   **`db_utils.py`**: Database utility functions.

### `frontend/`

Contains the frontend application code (details inferred as specific file listing for `frontend/` was not part of recent tasks).

-   **`js/`**: JavaScript files for frontend logic. (Based on `MODULE_CATALOG.md`)
    -   `HologramPlayer.js`, `GestureInput.js`, `TriaInterface.js`, etc.
-   **`css/`**: CSS style sheets.
-   **`html/` or `index.html`**: HTML structure for the web application.
-   **`README.md`**: Frontend specific documentation.
-   Likely `package.json` if it's a Node.js based frontend framework (e.g. React, Vue, Angular).

### `docs/`

Project documentation.

-   **`01_ARCHITECTURE/`**: System architecture documents.
    -   **`SYSTEM_ARCHITECTURE.md`**: Main architecture document.
    -   **`MODULE_CATALOG.md`**: Catalog of frontend JavaScript modules.
    -   Other architecture-related diagrams or notes.
-   **`02_RESEARCH/`**: Research notes, experiments, and explorations.
-   **`03_PROTOTYPES_AND_POC/`**: Code and documentation for prototypes and proofs-of-concept.
-   **`04_REPORTS_AND_LOGS/`**: Generated reports, analysis, and logs.
    -   **`project_structure_report.md`**: This file.
-   **`05_STYLEGUIDES_AND_CONVENTIONS/`**: Coding style guides and conventions.

### `holograph/`

Contains code and resources related to the Holograph DAO (Decentralized Autonomous Organization).

-   **`contracts/`**: (Expected) Smart contracts for the DAO.
-   **`scripts/`**: Scripts for deploying or interacting with the smart contracts.
-   **`tests/`**: Tests for the smart contracts.
-   **`README.md`**: Documentation for the Holograph DAO component.

### `nethologlyph/`

Implements the NetHoloGlyph protocol for real-time client-server communication.

-   **`client/`**: Client-side implementation.
    -   **`nethologlyph_client.js`**: JavaScript client library for establishing WebSocket connections and handling protocol messages.
-   **`protocol/`**: Protocol definitions.
    -   `definitions.proto` (Expected): Protobuf file defining the structure of NetHoloGlyph messages.
    -   `serialization.py` or `serialization.js` (Expected): Code for serializing and deserializing protocol messages.
-   **`server/`**: (Expected, though not explicitly seen in recent file lists) Server-side implementation of the NetHoloGlyph protocol, possibly as part of the main backend or a separate service.
    -   `main.py` (Example): Server entry point.

### `tria-genkit-core/`

Core components for Tria AI functionalities built with Google's Genkit framework.

-   **`src/`**: Source files for Genkit flows and tools.
    -   **`index.ts`**: Main configuration and export point for Genkit plugins and flows.
-   **`flows/`**: Definitions of Genkit flows.
    -   **`process_chunk_flow.ts`**: A flow for processing interaction chunks.
    -   `generate_hologram_flow.ts`, `tria_learning_flow.ts`: Placeholder flows.
-   **`tools/`**: Custom Genkit tools.
    -   `llm_tools.ts`, `external_api_tools.ts`, `db_tools.ts`: Placeholder tools.
-   **`genkit.config.ts`**: Configuration file for Genkit, specifying plugins, logging, etc.
-   **`package.json`**: (Expected) Node.js dependencies for this Genkit module.

### `scripts/`

Utility and automation scripts for the project.

-   (Contents to be listed if known, e.g., `deploy_backend.sh`, `setup_dev_env.py`, `db_migrate.sh`)

### `tests/`

Global or top-level tests; specific components may have their own `tests/` subdirectories.

-   (Contents to be listed if known, e.g., end-to-end tests, load tests)

```
