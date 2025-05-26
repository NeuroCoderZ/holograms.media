# Holograms.media

Welcome to the open-source project "Holograms.media"!

This ambitious initiative aims to create a multimodal immersive platform for generating and managing dynamic 3D audiovisualizations (referred to as "holograms"). At its core is "Tria," an AI assistant designed to facilitate human-AI co-creation and interaction within this holographic space.

## 🌟 Vision

Our vision is to build a platform where users can intuitively create, manipulate, and experience immersive holographic content through natural interfaces (voice, gesture, thought) powered by advanced AI. We aim to explore the frontiers of human-computer interaction in 3D environments, moving beyond traditional screens.

## ✨ Features (Current & Planned)

### Current Working Components:

*   Backend is fully functional for user authentication, chat with Tria, and chat history saving (migrated from MongoDB to PostgreSQL with `pgvector`).
*   Frontend loads, basic UI (panels, some buttons) partially works.
*   Panel hide/show button works.

### Immediate Goals (Priorities):

1.  **CRITICAL:** Fix `TypeError: Assignment to constant variable` in `script.js`.
2.  **REFACTOR `script.js`:** Continue moving UI logic to `uiManager.js` and Three.js logic to `sceneSetup.js`.
3.  Restore "Chat" button functionality.
4.  Correct "Tria" button logic and `/tria/invoke` URL.
5.  Reduce excessive `console.log` output.

Full task list: [GitHub Issues](https://github.com/NeuroCoderZ/holograms.media/issues) and [Projects](https://github.com/NeuroCoderZ/holograms.media/projects).

## 🛠 Technology Stack (Key)

### Frontend:

*   **HTML, CSS, Pure JavaScript:** Emphasis on clean, native web technologies.
*   **Three.js:** For 3D rendering and scene management.
*   **MediaPipe:** For real-time hand tracking and gesture recognition.
*   **Web Audio API:** For advanced audio processing and visualization.
*   **WebXR:** For immersive experiences (future integration).
*   **WebGPU:** For high-performance 3D graphics (future integration).

### Backend:

*   **Python:** Main language.
*   **FastAPI:** High-performance web framework for API.
*   **PostgreSQL with pgvector:** Robust relational database with vector similarity search for knowledge graph and memory features.
*   **Pydantic:** Data validation and settings management.
*   **LangChain:** Framework for developing applications powered by language models.
*   **Mistral AI / Codestral:** LLM integration for "Tria" AI assistant (via API).
*   **Gradio:** For rapid prototyping and demoing of LLM interactions.

### Other Tools & Concepts:

*   **Docker:** For containerization and consistent deployment across environments (Hugging Face Spaces, Google Cloud Run).
*   **GitHub Actions:** For CI/CD automation.
*   **Firebase Hosting:** For static frontend deployment.
*   **Nix / NixOS:** For reproducible development environments.
*   **Hugging Face Spaces:** For quick AI demo deployment.
*   **Google Cloud Platform (GCP):** Future target for scalable deployment (Cloud Run, Cloud SQL).

## 🚀 Getting Started (Development)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/NeuroCoderZ/holograms.media.git
    cd holograms.media
    ```
2.  **Install Frontend Dependencies (if using npm/yarn for dev):**
    ```bash
    # If package.json is used for frontend build steps
    # npm install
    ```
3.  **Setup Backend (Python & PostgreSQL):**
    *   **Python Virtual Environment:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate # On Windows: .env\Scripts\activate
        pip install -r backend/requirements.txt
        ```
    *   **PostgreSQL:** Ensure PostgreSQL is running locally (e.g., via Docker, Homebrew, or native install).
    *   **Database Setup:** Connect to your PostgreSQL instance and create the database (`holograms_db`) and user (`holograms_user`) as specified in `backend/db/schema.sql` and `backend/db/pg_connector.py`.
    *   **Environment Variables:** Create a `.env` file in the `backend/` directory based on `backend/.env.example` and fill in your database credentials and API keys.

4.  **Run the Backend (FastAPI):**
    ```bash
    cd backend
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
    ```
    (Ensure `uvicorn` is installed via `pip install "uvicorn[standard]"`)

5.  **Serve the Frontend:**
    *   Open `frontend/index.html` directly in your browser, or use a local web server (e.g., Python's `http.server` or Firebase Emulators).

## 💡 Contribution

We welcome contributions from the community! Feel free to open issues, submit pull requests, or join discussions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

Refer to [ROADMAP.md](ROADMAP.md) for a detailed plan of future development and milestones.

---

