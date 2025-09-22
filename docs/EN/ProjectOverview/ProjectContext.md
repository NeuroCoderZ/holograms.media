```markdown
# PROJECT_CONTEXT.MD - Project Context for "Holographic Media" (Version 31.2)

This document describes the current practical context and status of the "Holographic Media" project. It should be considered in light of the overall concept and philosophy outlined in `docs/EN/ProjectOverview/ConceptAndPhilosophy.md`.

## Current Project Status

The "Holographic Media" project is in the active MVP (Minimum Viable Product) development phase.
*Last update: 2024-07-31*

**Key components and their status:**
*   **Frontend:** Modular structure in pure JavaScript (ES6), hosted on **Firebase Hosting**. Work is underway to stabilize the UI and hologram visualization (Three.js/WebGL, with CWT analyzer in Rust/WASM).
*   **Backend API and Computation:** The main backend API is implemented in **FastAPI (Python)** and deployed on **Koyeb**. This service handles core business logic, request processing, and interaction with other components.
*   **File Storage (Chunks):** **Cloudflare R2** is used to store media "chunks" (audio, video). File uploads to R2 are performed via the FastAPI backend on Koyeb.
*   **Data Storage:** User data (gestures, holograms) is stored and retrieved via **external Tria API (Cloudflare)**.
    *   **Authentication:** **Standard OAuth 2.0 protocol from Google** is integrated for user management and API protection.
    *   **Tria Server Logic and Auxiliary Tasks:** Some of the Tria AI logic, event processing, and other auxiliary tasks may be implemented using **Firebase Cloud Functions (Python)**, which are tightly integrated with Firebase Authentication and other Firebase services. FastAPI on Koyeb remains the main entry point for most API operations.
*   **AI "Tria" (MVP):** Basic Tria response logic is being developed using LLM API (Mistral, Google Gemini), orchestration is planned via Genkit, integrated into the backend infrastructure.

*Tasks and MVP goals are defined by current sprint plans and project documentation.*

## Current Iteration Goals (MVP Sprint)

**Main goals of the current iteration (adapted from overall MVP goals):**
1.  **Completion and demonstration of all main MVP functions:**
    *   User authentication (Firebase Authentication).
    *   Uploading media "chunks" (Cloudflare R2 via FastAPI on Koyeb).
    *   Basic chunk processing and Tria responses (mainly via FastAPI on Koyeb, with possible use of Firebase Cloud Functions for auxiliary operations + LLM API).
    *   Audio-reactive hologram visualization on the frontend (Firebase Hosting).
    *   Saving and basic extraction of user data and history via Tria API.
2.  **Stabilization and testing** of the entire MVP cycle, including interaction between FastAPI on Koyeb, Cloudflare R2, Firebase (Hosting, Auth, Functions), and Tria API.
3.  **Debugging and optimization** to ensure stable MVP operation.
4.  **Preparation of demo materials** and final version of `README.md`.
5.  **Verification of compliance** with all "Definition of Done" for MVP.

## Development and Deployment Environment

*   **Main IDE:** Firebase Studio (Project IDX) or VS Code.
*   **Local development/testing:** Firebase Local Emulator Suite (for Hosting, Auth, Functions), local FastAPI launch.
*   **Remote repository:** GitHub (`github.com/NeuroCoderZ/holograms.media`).
*   **CI/CD:** GitHub Actions for automatic deployment to Firebase Hosting and Koyeb.
*   **Production (MVP):**
    *   Frontend: Firebase Hosting.
    *   Backend (API, main logic): FastAPI on Koyeb (Python).
    *   Backend (auxiliary tasks/triggers for Firebase): Firebase Cloud Functions (Python).
    *   Database: Neon.tech PostgreSQL.
    *   Storage (chunks): Cloudflare R2.
    *   Authentication: Firebase Authentication.

## Team

*   **NeuroCoder (Alexander):** Project lead, main developer, system architect, task setter.
*   **AI assistants (Gemini, Claude, Copilot Chat, etc.):** Tools for code generation, analysis, refactoring, and documentation updates, used by NeuroCoder.
*   **(Possibly) Jules:** Audio subsystem consultant (conceptually, if his developments are used).

---

*Last update: 2024-07-31*
```
