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

## 🛠 Technology Stack (Firebase Ecosystem Focus)

### Frontend:

*   **HTML, CSS, JavaScript (ES6 Modules):** Clean, native web technologies.
*   **Three.js (WebGL):** For 3D rendering in the MVP.
*   **MediaPipe Hands:** For client-side real-time hand tracking and gesture input.
*   **Web Audio API:** For audio processing and visualization.
*   **WebXR & WebGPU:** Future R&D for enhanced immersion and performance.

### Backend & AI:

*   **Firebase Cloud Functions (Python):** Core of the backend, handling all server-side logic.
*   **Neon.tech PostgreSQL + pgvector:** Primary database for user data, metadata, and AI knowledge (embeddings).
*   **Firebase Authentication:** For user sign-up, login, and security.
*   **Firebase Storage:** For storing user-uploaded media "chunks".
*   **LLM APIs (Mistral/Devstral, Google Gemini):** Direct calls from Cloud Functions for Tria's AI logic in MVP.
*   **Genkit (Target Framework):** Planned for orchestrating Tria's AI bots and flows post-MVP, integrating with Firebase AI (Vertex AI) and Google Gemini.
*   **LangChain:** Potential use for RAG and AI agent development.

### Development & Deployment:

*   **Firebase Studio (Project IDX):** Main Integrated Development Environment (IDE).
*   **Firebase Local Emulator Suite:** For local development and testing of Firebase services.
*   **GitHub Actions:** For CI/CD, automating deployments to Firebase Hosting and Cloud Functions.
*   **Git & GitHub:** Version control and project management.
*   **Docker:** For auxiliary development tasks or containerizing specific tools if needed (not for primary backend deployment).

## 🚀 Getting Started (Development with Firebase)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/NeuroCoderZ/holograms.media.git
    cd holograms.media
    ```
2.  **Install Firebase CLI:**
    Follow the official instructions: [Firebase CLI Setup](https://firebase.google.com/docs/cli#setup_the_firebase_cli)
3.  **Login to Firebase:**
    ```bash
    firebase login
    ```
4.  **Set up Project:**
    *   Initialize Firebase in your local project directory (if not already done):
        ```bash
        firebase init
        ```
        (Select Functions, Hosting, Storage, Emulators. Follow prompts.)
    *   Ensure your project is connected to the correct Firebase project:
        ```bash
        firebase use <your-firebase-project-id>
        ```
5.  **Install Backend Dependencies (Python for Cloud Functions):**
    *   Navigate to your functions directory (e.g., `backend/` or as configured in `firebase.json`):
        ```bash
        # Example: cd backend
        # Create/activate a Python virtual environment
        python3 -m venv .venv
        source .venv/bin/activate # On Windows: .\.venv\Scripts\activate
        pip install -r requirements.txt
        ```
6.  **Install Frontend Dependencies (if any build step is involved):**
    ```bash
    # cd frontend
    # npm install (if package.json exists for frontend tools/bundling)
    ```
7.  **Configure Environment Variables (for Cloud Functions & Local Emulation):**
    *   For deployed functions, use Firebase CLI to set secrets/config:
        ```bash
        firebase functions:config:set someservice.key="YOUR_API_KEY"
        # Example for Neon.tech connection string:
        firebase functions:config:set db.url="postgresql://user:pass@host:port/dbname"
        ```
    *   For local emulation, you might need to set up a `.env` file within your functions directory that `python-dotenv` can load, or configure runtime variables for the emulator. Refer to `backend/.env.example`.
8.  **Run with Firebase Local Emulator Suite:**
    ```bash
    firebase emulators:start --only functions,hosting,auth,storage
    ```
    This will typically serve the frontend on `http://localhost:5000` and functions on `http://localhost:5001`. Check the Emulator UI (usually `http://localhost:4000`) for specific ports.

## 📚 Key Project Documents
*   **System Instruction:** [docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md](docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md) (This document - detailed project overview and AI guidelines)
*   **System Architecture:** [docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md](docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md) (Data flows and component interactions)
*   **MVP Plan:** [docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md) (Current MVP goals and tasks)
*   **Roadmap:** [docs/00_OVERVIEW_AND_CONTEXT/ROADMAP.md](docs/00_OVERVIEW_AND_CONTEXT/ROADMAP.md) (Long-term development plan)

## 💡 Contribution

We welcome contributions from the community! Feel free to open issues, submit pull requests, or join discussions. Please review our contribution guidelines (to be created - link to `CONTRIBUTING.md` eventually).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

