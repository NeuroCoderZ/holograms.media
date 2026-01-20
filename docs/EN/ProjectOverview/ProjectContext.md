```markdown
# PROJECT_CONTEXT.MD - Project Context for "Holographic Media" (Version 31.2)

This document describes the current practical context and status of the "Holographic Media" project. It should be considered in light of the overall concept and philosophy outlined in `docs/EN/ProjectOverview/ConceptAndPhilosophy.md`.

## Current Project Status

The "Holographic Media" project is in the active MVP (Minimum Viable Product) development phase.
*Last update: 2024-07-31*

**Key components and their status:**
*   **Frontend:** Modular structure in pure JavaScript (ES6), hosted on **Cloudflare Pages**. Work is underway to stabilize the UI and hologram visualization (Three.js/WebGL, with CWT analyzer in Rust/WASM).
*   **Backend API and Computation:** The main backend API is implemented in **FastAPI (Python)** and deployed on **Koyeb**. This service handles core business logic, request processing, and interaction with other components.
*   **File Storage (Chunks):** **Cloudflare R2** is used to store media "chunks" (audio, video). File uploads to R2 are performed via the FastAPI backend on Koyeb.
*   **Data Storage:** User data (gestures, holograms) is stored and retrieved via **external Tria API (Cloudflare)**.
    *   **Authentication:** **Standard OAuth 2.0 protocol from Google** is integrated for user management and API protection.

*   **AI "Tria" (MVP):** Basic Tria response logic is being developed using LLM API (Mistral, Google Gemini), integrated into the backend infrastructure.

*Tasks and MVP goals are defined by current sprint plans and project documentation.*

## Current Iteration Goals (MVP Sprint)

**Main goals of the current iteration (adapted from overall MVP goals):**
1.  **Completion and demonstration of all main MVP functions:**
    *   User authentication (Google OAuth 2.0).
    *   Uploading media "chunks" (Cloudflare R2 via FastAPI on Koyeb).
    *   Basic chunk processing and Tria responses (mainly via FastAPI on Koyeb + LLM API).
    *   Audio-reactive hologram visualization on the frontend (Cloudflare Pages).
    *   Saving and basic extraction of user data and history via Tria API.
2.  **Stabilization and testing** of the entire MVP cycle, including interaction between FastAPI on Koyeb, Cloudflare R2, and Tria API.
3.  **Debugging and optimization** to ensure stable MVP operation.
4.  **Preparation of demo materials** and final version of `README.md`.
5.  **Verification of compliance** with all "Definition of Done" for MVP.

## Development and Deployment Environment

*   **Main IDE:** VS Code Insiders, Jules from Google.
*   **Local development/testing:** Local servers for development **are not used**. The developer (Neurocoder) performs all checks manually on the application deployed in the cloud.
*   **Remote repository:** GitHub (`github.com/NeuroCoderZ/holograms.media`).
*   **CI/CD:** GitHub Actions for automatic deployment to Cloudflare Pages and Koyeb.
*   **Production (MVP):**
    *   Frontend: Cloudflare Pages.
    *   Backend (API, main logic): FastAPI on Koyeb (Python).

    *   Database: AstraDB (Cassandra).
    *   Storage (chunks): Cloudflare R2.
    *   Authentication: Google OAuth 2.0.

## Team

*   **NeuroCoder (Alexander):** Project lead, main developer, system architect, task setter.
*   **AI assistants (Gemini, Claude, Copilot Chat, etc.):** Tools for code generation, analysis, refactoring, and documentation updates, used by NeuroCoder.


*Last update: 2025-09-25*
```
