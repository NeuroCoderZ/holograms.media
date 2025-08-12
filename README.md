# Holograms.media

Welcome to the open-source project "Holograms.media"!

This ambitious initiative aims to create a multimodal immersive platform for generating and managing dynamic 3D audiovisualizations (referred to as "holograms"). At its core is "Tria," an AI assistant designed to facilitate human-AI co-creation and interaction within this holographic space. The project is currently focused on delivering an MVP (Minimum Viable Product) leveraging the Google Cloud/Firebase ecosystem.

## 🌟 Vision

Our vision is to build a platform where users can intuitively create, manipulate, and experience immersive holographic content through natural interfaces (voice, gesture, thought) powered by advanced AI. We aim to explore the frontiers of human-computer interaction in 3D environments, moving beyond traditional screens, by building a scalable and robust application on modern cloud infrastructure.

## ✨ MVP Goals (Target: June 9th, 2025)

The current focus is on delivering an MVP with the following core functionalities:
1.  **User Authentication:** Sign up/log in via Firebase Authentication.
2.  **Media Upload:** Upload audio/video "interaction chunks" to Firebase Storage.
3.  **Basic Tria Interaction:** Firebase Cloud Function (Python) triggered by uploads or HTTP requests, performing simple Tria bot processing (direct LLM calls) and responding to the user.
4.  **Hologram Visualization:** Audio-reactive 3D visualization (Three.js/WebGL) hosted on Firebase Hosting.
5.  **Data Persistence:** User data and metadata stored in Neon.tech PostgreSQL.

For a detailed breakdown of the MVP, see the [ULTIMATE ROAD TO MVP JUNE 9 Document](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md).
For project tasks and progress, see [GitHub Issues](https://github.com/NeuroCoderZ/holograms.media/issues) and [Projects](https://github.com/NeuroCoderZ/holograms.media/projects).

## 🛠 Technology Stack

### Frontend:

*   **HTML, CSS, JavaScript (ES6 Modules):** Clean, native web technologies.
*   **Three.js (WebGL):** For 3D rendering in the MVP.
*   **MediaPipe Hands:** For client-side real-time hand tracking and gesture input.
*   **Web Audio API:** For audio processing and visualization.
*   **WebXR & WebGPU:** Future R&D for enhanced immersion and performance.

### Backend & AI:

*   **FastAPI (Python) on Koyeb:** Core of the backend, handling all server-side logic.
*   **Neon.tech PostgreSQL + pgvector:** Primary database for user data, metadata, and AI knowledge (embeddings).
*   **Firebase Authentication:** For user sign-up, login, and security.
*   **Backblaze B2:** For storing user-uploaded media "chunks" and other assets.
*   **LLM APIs (Mistral/Devstral, Google Gemini):** Direct calls from the FastAPI backend for Tria's AI logic in MVP.
*   **Genkit (Target Framework):** Planned for orchestrating Tria's AI bots and flows post-MVP.
*   **LangChain:** Potential use for RAG and AI agent development.

### Development & Deployment:

*   **Firebase Studio (Project IDX):** Main Integrated Development Environment (IDE).
*   **Docker:** For containerizing the backend for development and deployment.
*   **Firebase Local Emulator Suite:** For local development and testing of Firebase Authentication (primarily for frontend) and Firebase Hosting.
*   **GitHub Actions:** For CI/CD, automating deployments to Firebase Hosting (frontend) and Koyeb (backend).
*   **Git & GitHub:** Version control and project management.

## 🚀 Getting Started

To get the project up and running, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/NeuroCoderZ/holograms.media.git
    cd holograms.media
    ```

2.  **Install Firebase CLI:**
    If you haven't already, install the Firebase CLI globally:
    ```bash
    npm install -g firebase-tools
    ```
    Follow the official instructions: [Firebase CLI Setup](https://firebase.google.com/docs/cli#setup_the_firebase_cli)

3.  **Login to Firebase (for Frontend Hosting & Auth):**
    Authenticate your CLI with your Firebase account:
    ```bash
    firebase login
    ```

4.  **Set up Firebase Project (for Frontend Hosting & Auth):**
    *   Initialize Firebase in your local project directory if you intend to use Firebase Hosting or Auth emulators. When prompted, select **Hosting** and **Emulators**.
        ```bash
        firebase init hosting
        firebase init emulators
        ```
    *   Ensure your local project is linked to the correct Firebase project for hosting:
        ```bash
        firebase use <your-firebase-project-id>
        ```
        (Replace `<your-firebase-project-id>` with your actual Firebase project ID, e.g., `holograms-media`).

5.  **Set up Backend (FastAPI on Koyeb):**
    *   Navigate to the `backend/` directory:
        ```bash
        cd backend
        ```
    *   Create and activate a Python virtual environment:
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows: venv\Scripts\activate
        ```
    *   Install backend dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    *   Create a `.env` file by copying `backend/.env.example`:
        ```bash
        cp .env.example .env
        ```
    *   Populate the `.env` file with your credentials for Neon.tech PostgreSQL, Backblaze B2, and Firebase Admin SDK (service account details).
    *   Run the FastAPI application locally:
        ```bash
        uvicorn backend.app:app --reload
        ```
        The backend will be available at `http://localhost:8000` (default FastAPI port).

6.  **Install Frontend Dependencies (if any build step is involved):**
    This project uses native HTML/CSS/JS, so typically no `npm install` is needed for the frontend. If future tooling (e.g., Vite for bundling) is introduced, this step would become relevant.

7.  **Configure Environment Variables (for Backend):**
    Environment variables for the backend (Neon.tech, B2, Firebase Admin, LLM APIs) are managed via the `.env` file for local development (loaded by `python-dotenv` in `backend/app.py`). For production on Koyeb, these variables must be set in the Koyeb service configuration. Refer to `backend/.env.example` for the list of required variables.

8.  **Running Frontend and Emulated Services:**
    *   **Backend:** Run the FastAPI backend separately using `uvicorn backend.app:app --reload` as described above.
    *   **Frontend & Firebase Emulators:** If you need to test Firebase Authentication or host the frontend locally using Firebase tools:
        ```bash
        firebase emulators:start --only hosting,auth
        ```
        This command will typically serve the frontend (from your `public` or `frontend` directory specified in `firebase.json`) on `http://localhost:5000`. The Firebase Authentication emulator will also run. The actual backend logic is handled by your separate `uvicorn` process.

9.  **Deploying to Production:**
    *   **Backend (FastAPI on Koyeb):**
        The backend is deployed as a Docker container to Koyeb. This is typically handled by CI/CD (e.g., GitHub Actions) pushing a built Docker image to a registry and triggering Koyeb, or by Koyeb building from the repository directly using the `Dockerfile` at the root of the project.
    *   **Frontend (Firebase Hosting):**
        ```bash
        firebase deploy --only hosting
        ```

## 📚 Key Project Documents
*   **System Instruction:** [docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md](docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md) (This document - detailed project overview and AI guidelines)
*   **System Architecture:** [docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md](docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md) (Data flows and component interactions)
*   **Deployment Strategy:** [docs/01_ARCHITECTURE/DEPLOYMENT_STRATEGY.md](docs/01_ARCHITECTURE/DEPLOYMENT_STRATEGY.md) (Detailed strategy for Cloud Functions deployment)
*   **MVP Plan:** [docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md) (Current MVP goals and tasks)
*   **Roadmap:** [docs/00_OVERVIEW_AND_CONTEXT/ROADMAP.md](docs/00_OVERVIEW_AND_CONTEXT/ROADMAP.md) (Long-term development plan)

## 💡 Contribution

We welcome contributions from the community! Feel free to open issues, submit pull requests, or join discussions. Please review our contribution guidelines (to be created - link to `CONTRIBUTING.md` eventually).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

