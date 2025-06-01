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

3.  **Login to Firebase:**
    Authenticate your CLI with your Firebase account:
    ```bash
    firebase login
    ```

4.  **Set up Firebase Project:**
    *   Initialize Firebase in your local project directory (if not already done). When prompted, select **Functions**, **Hosting**, **Storage**, and **Emulators**. Follow the prompts to set up your project.
        ```bash
        firebase init
        ```
    *   Ensure your local project is linked to the correct Firebase project:
        ```bash
        firebase use <your-firebase-project-id>
        ```
        (Replace `<your-firebase-project-id>` with your actual Firebase project ID, e.g., `holograms-media`).

5.  **Install Backend Dependencies (Python for Cloud Functions):**
    Each Python Cloud Function (`backend/cloud_functions/*`) has its own `requirements.txt`. You will need to install dependencies for each function that you plan to deploy or emulate.
    
    Navigate to each function's directory and install dependencies:
    ```bash
    cd backend/cloud_functions/auth_sync
    pip install -r requirements.txt
    cd ../process_chunk
    pip install -r requirements.txt
    cd ../tria_chat_handler
    pip install -r requirements.txt
    # ... repeat for any other Python functions
    ```
    *Self-correction:* For local development and to avoid conflicts, it's often better to manage a single virtual environment at the `backend/` level and ensure all `requirements.txt` are compatible, or to use `pip install -r backend/requirements.txt` if a consolidated one exists. However, for Firebase Functions, individual `requirements.txt` are common for isolated deployments as per our [Deployment Strategy documentation](docs/01_ARCHITECTURE/DEPLOYMENT_STRATEGY.md).

6.  **Install Frontend Dependencies (if any build step is involved):**
    This project uses native HTML/CSS/JS, so typically no `npm install` is needed for the frontend. If future tooling (e.g., Vite for bundling) is introduced, this step would become relevant.
    ```bash
    # cd frontend
    # npm install (if package.json exists for frontend tools/bundling)
    ```

7.  **Configure Environment Variables (for Cloud Functions & Local Emulation):**
    *   **For Deployed Functions:** Use the Firebase CLI to set environment variables (secrets or config). These are essential for connecting to external services like Neon.tech PostgreSQL and LLM APIs.
        ```bash
        # Example for an LLM API key (replace YOUR_API_KEY with your actual key)
        firebase functions:config:set llm.api_key="YOUR_API_KEY"
        
        # Example for Neon.tech PostgreSQL connection string
        # Ensure this is securely handled, possibly as a secret if sensitive.
        firebase functions:config:set db.url="postgresql://user:pass@host:port/dbname"
        ```
        *Note:* For highly sensitive data, consider using Firebase Secret Manager.
    *   **For Local Emulation:** You might need to set up a `.env` file within your functions directory (`backend/.env`) that `python-dotenv` can load, or use the Firebase Emulator's configuration options. Refer to `backend/.env.example` for expected variables during local development.

8.  **Run with Firebase Local Emulator Suite:**
    To run the frontend, backend Cloud Functions, authentication, and storage locally:
    ```bash
    firebase emulators:start --only functions,hosting,auth,storage
    ```
    This command will typically serve the frontend on `http://localhost:5000` and Cloud Functions on `http://localhost:5001`. The Firebase Emulator UI, which provides a dashboard for all emulated services and logs, is usually accessible at `http://localhost:4000`.

9.  **Deploying to Firebase (Production):**
    *   **Deploy Frontend (Hosting):**
        ```bash
        firebase deploy --only hosting
        ```
    *   **Deploy Cloud Functions:**
        As per our [Deployment Strategy](docs/01_ARCHITECTURE/DEPLOYMENT_STRATEGY.md), Cloud Functions are deployed individually.
        ```bash
        firebase deploy --only functions
        ```
        This will deploy all functions defined in your `firebase.json`'s `functions.source` directory.

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

