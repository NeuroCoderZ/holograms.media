```markdown
# Glossary for the "Holographic Media" Project

**Last Updated:** September 26, 2025

## Core Project Concepts

### **Holographic Media**
An open-source platform for multimodal communication via 3D audiovisualizations (holograms) and the Tria AI. The project's goal is to create "Neolang" and "HoloGraph".

### **Neolang**
A universal language for interacting with data and artificial intelligence, enabling users to intuitively control complex systems.

### **HoloGraph**
A decentralized economic system integrated into the platform, providing value exchange and interaction between participants.

### **Tria**
Artificial intelligence that is the central element of the platform, enabling multimodal interaction and data processing.

### **Multimodal Communication**
Interaction using multiple channels or modalities (e.g., sound, visualization, gestures) to transmit information.

### **3D Audiovisualizations (Holograms)**
Three-dimensional visual representations generated from audio data and other inputs, creating a sense of presence.

### **Neurocoding**
A development methodology combining human intelligence and AI capabilities to create software.

## Infrastructure and Deployment

### **Cloudflare Pages**
Cloudflare's service for hosting and deploying static sites and single-page applications (SPA), used for the project's frontend.

### **Koyeb**
Serverless platform for deploying applications, used for hosting the backend (compute services).

### **AstraDB (Cassandra-based)**
Distributed NoSQL database used for project data storage, providing high availability and scalability.

### **Backblaze B2**
Cloud object storage used for storing project files and media content.

### **Cloudflare Workers**
Cloudflare's serverless compute platform for running code at the network edge to process requests and execute logic.

### **Cloudflare R2**
Cloudflare's object storage compatible with the S3 API, used for storing data without egress fees.

## Canonical Core (holocore)

### **holocore**
The central element of the project's audio pipeline, implemented in Rust and compiled to WebAssembly (WASM). Responsible for complex wavelet transform (CWT) calculations and phase difference for 3D sound panorama.

### **Rust**
Programming language used for developing `holocore` due to its performance, safety, and low-level capabilities.

### **WebAssembly (WASM)**
Binary instruction format for execution in web browsers. Allows `holocore` to run with near-native performance directly in the frontend.

### **AudioWorklet**
Web Audio API for running JavaScript code to process audio in a separate thread, providing high performance and accuracy. Loads and runs the WASM `holocore` module.

### **CWT (Complex Wavelet Transform)**
Complex wavelet transform, a mathematical method for signal analysis, used in `holocore` to extract time-frequency characteristics from audio.

### **Morlet Wavelet**
A specific type of wavelet used in CWT for audio analysis, optimal for detecting local sound features.

### **Phase Difference**
The difference in phase between audio signals from different sources or "ears", used to create a 3D sound panorama effect.

### **3D Sound Panorama**
Technology for creating a spatial sound effect, where sound sources are perceived as located in three-dimensional space around the listener.

## Frontend (JS/Three.js/Vite)

### **JavaScript (JS)**
Main programming language for developing the user interface and frontend logic.

### **Three.js**
JavaScript library for creating and displaying interactive 3D graphics in the browser, used for hologram rendering.

### **Vite**
Fast build tool for frontend projects, used for developing and optimizing the "Holographic Media" frontend.

### **`main.js`**
Main frontend file that initializes the application and loads other modules, including `init.js`.

### **`init.js`**
Initialization module responsible for launching `holocore`, the user interface, and various managers.

### **`cwt-processor.js`**
Module implementing the `AudioWorkletProcessor` ('cwt-processor'), which loads and manages the WASM `holocore` for audio processing.

### **`AudioWorkletProcessor` ('cwt-processor')**
Specialized object in `AudioWorklet` that performs actual audio data processing using the `holocore` WASM module.

### **`audioSourceManager.js`**
Module managing audio sources, combining the functionality of `microphoneManager.js` and `audioFilePlayer.js`.

### **`hologramRenderer.js`**
Frontend visualization core. Receives processed audio data (volume levels, panorama) from `AudioWorklet` and updates the 3D scene, displaying holograms.

### **`GestureManager.js`**
Module responsible for managing gesture recognition and processing.

### **`InteractionManager.js`**
Module handling user interactions, potentially including WebSocket connections for gesture intents.



## Backend (FastAPI/Python on Koyeb)

### **FastAPI**
Modern, fast (high-performance) web framework for building APIs in Python, used for the project's backend.

### **Python**
Main programming language for backend logic, data processing, and interaction with databases and external services.

### **`app.py`**
Backend application entry point, where FastAPI is initialized and API routers are connected.

### **REST API (`/api/v1/*`)**
Set of endpoints providing functionality for managing holograms, chat, Tria commands, and other services via standard HTTP requests.

### **WebSocket**
Protocol for bidirectional communication over a single TCP connection, used for real-time data exchange between client and server.

### **`/ws/v1/gesture-intent`**
Backend WebSocket endpoint that receives user gesture intents in real time. Requires authentication.

### **`/ws/signaling`**
WebSocket endpoint used for WebRTC signaling (NetHoloGlyph), coordinating P2P connection establishment.

### **JWT (JSON Web Token)**
Standard for creating access tokens used for secure authentication and authorization of users in a session after validating the Google token.

## Tria AI Agents

### **Tria Agent**
General term for an AI component within the Tria system, responsible for specific tasks like gesture analysis, audio processing, or memory management.

### **LearningAgent**
An AI agent responsible for analyzing accumulated data, evaluating model configurations, and driving the evolutionary cycle of Tria's learning.

### **GestureAgent**
An AI agent specialized in analyzing and interpreting user gesture data.

### **AudioAgent**
An AI agent focused on processing and understanding audio input.

### **MemoryAgent**
An AI agent that performs semantic search and retrieval from the knowledge store (AstraDB) to provide relevant context to Tria.

## Network Interaction (NetHoloGlyph 2.0)

### **NetHoloGlyph 2.0**
Concept of a "Digital Vector Cauldron" for exchanging multimodal data between participants, using WebRTC and WebSocket.

### **WebRTC (Web Real-Time Communication)**
Technology enabling real-time peer-to-peer (P2P) communication directly between browsers or devices, bypassing the server.

### **Data Channels (WebRTC Data Channels)**
WebRTC feature for transmitting arbitrary data (not just audio/video) between peers in real time.

### **Peer-to-Peer (P2P) Communication**
Direct connection between two devices without an intermediate server, providing low latency and high bandwidth.

### **WebSocket Fallback**
Mechanism where, if direct P2P connection via WebRTC cannot be established, communication is performed via the WebSocket server.

## Authentication

### **Google OAuth 2.0**
Standard authorization protocol used for authenticating users via their Google accounts.

### **Google Token Validation**
Process of verifying the authenticity and integrity of the token received from Google OAuth 2.0 on the backend to confirm user identity.

## Additional Terms

### **DataStax**
Company providing Astra Database.

### **Apache Cassandra**
Open-source distributed NoSQL database on which AstraDB is based.

### **CQL (Cassandra Query Language)**
Query language for Cassandra.

### **S3-compatible API**
API compatible with Amazon S3.

### **B2 bucket**
Container for storing objects in Backblaze B2.

### **keyID**
API key identifier for Backblaze B2.

### **applicationKey**
Application key for Backblaze B2 API.

### **user_chunks**
Prefix for user media chunks in B2.

### **hologram_data**
Prefix for hologram data in B2.

### **unique_filename_with_uuid**
Unique filename with UUID to prevent collisions.

### **secure_connect_bundle**
Bundle for secure connection to Astra Database.

### **PlainTextAuthProvider**
Authentication provider for Cassandra.

### **uvicorn**
ASGI web server for Python.

### **Node.js**
JavaScript runtime environment.

### **npm/yarn**
Package managers for Node.js.

### **_headers**
Cloudflare Pages configuration file for HTTP headers.

### **_redirects**
Cloudflare Pages configuration file for redirects.

### **Koyeb Dashboard**
Koyeb's management panel.

### **Cloudflare Analytics**
Cloudflare's traffic and performance analytics.

### **Astra Dashboard**
Astra Database's management panel.

### **Backblaze Dashboard**
Backblaze's storage statistics.

### **FFT (Fast Fourier Transform)**
Traditional algorithm for signal analysis, often contrasted with CWT.

### **OMEGA0**
A key parameter for the Morlet wavelet.

### **rustfft**
Rust library for Fourier transforms.

### **Volume Levels (dB)**
Audio amplitude converted to decibels.

### **Panorama Angles**
Angles representing the spatial position of sound.

### **HoloAnalyzer**
The core audio analysis class on the Rust side.

### **holographic_core.js**
JavaScript binding for the WASM `HoloAnalyzer`.

### **Audio Input Module**
Module responsible for capturing audio data.

### **Audio Analysis Module**
Module performing CWT on audio data.

### **Visualization Module**
Module that renders 3D holograms based on CWT analysis.

### **Gesture Control Module**
Module recognizing hand gestures to control visualization.

### **Web Audio API**
API for processing and synthesizing audio in the browser.

### **fingerpose**
Library for hand gesture recognition.

### **target_frequencies**
Target frequencies for CWT analysis.

### **sample_rate**
Audio sampling rate.

### **Stereo audio data**
Audio data with two channels (left and right).

### **IFFT (Inverse Fast Fourier Transform)**
Algorithm for quickly computing the inverse discrete Fourier transform.

### **CWT coefficients**
Results of the continuous wavelet transform.

### **API endpoint**
An access point to an API.

### **Multipart upload**
Mechanism for uploading files in parts.

### **Presigned POST URL**
A pre-signed URL for direct file uploads to storage.

### **MIME type**
Media file type.

### **Legacy endpoint**
An outdated endpoint.

### **Tria AI assistant**
The Tria AI assistant.

### **WebSocket endpoint**
A WebSocket access point.

### **WebRTC signaling**
The process of exchanging information to establish a WebRTC connection.

### **CDN (Content Delivery Network)**
A network for delivering content.

### **HTTP status codes**
Standard HTTP status codes.

### **backend/routers/interaction_chunks.py**
FastAPI module for chunk uploads.

### **backend/core/database.py**
Module for database connection setup.

### **backend/repositories/chunk_repository.py**
Module for working with the chunk repository.

### **backend/services/storage_service.py**
Module for working with the storage service.

### **backend/routers/health.py**
Module for health checks.

### **asyncio**
Python module for asynchronous programming.

### **lru_cache**
Decorator for caching function results.

### **Pagination**
Dividing data into pages.

### **Interaction Chunk**
A unit of user interaction data (audio, video, gestures) uploaded to the backend.

### **ChatAgent**
An AI agent responsible for processing chat interactions.

### **LLMService**
A service that interacts with large language models (LLMs).

### **tria_learning_log**
A database table in AstraDB for logging Tria's learning interactions.

### **Tria Orchestrator**
A component that coordinates the execution of Tria AI commands.

### **NetHoloGlyph Protocol**
Protocol for exchanging "quanta" of multimodal data.

### **Quanta**
Atomic units of information describing changes in the state of an audio hologram.

### **NetHoloGlyphClient**
Client-side component of the NetHoloGlyph protocol.

### **NetHoloGlyphService**
Server-side component of the NetHoloGlyph protocol.

### **Protobuf (Protocol Buffers)**
Language-neutral, platform-neutral, extensible mechanism for serializing structured data.

### **GestureDelta**
Message describing a change initiated by a user gesture.

### **EmbeddingDelta**
Message describing a change in a semantic embedding.

### **WaveletFrame**
Message containing wavelet analysis data for the current audio frame.

### **NetHoloGlyphQuantum**
The primary NetHoloGlyph quantum message, combining gesture, embedding, and audiovisual data.

### **LZ4**
Lossless data compression algorithm.

### **WebAudioEngine**
Local engine used to produce `WaveletFrame` data.

### **Optimistic updates**
Immediately applying local changes for instant feedback, with subsequent reconciliation with the authoritative state.

### **Reconciliation**
The process of resolving discrepancies between local and authoritative states.

### **CRDTs (Conflict-free Replicated Data Types)**
Data structures that can be replicated across multiple computers, allowing concurrent updates and merging without conflicts.

### **Yjs**
A CRDT framework.

### **XR Adaptation**
Integration with extended reality (XR) devices.

### **ndk::webrtc**
Native WebRTC client libraries for Android NDK.

### **flatcc**
C++ Protobuf or FlatBuffers library.

### **End-to-End (E2E) Testing**
Testing that verifies the entire application flow from start to finish.

### **DataStax Studio**
A tool for querying AstraDB (Cassandra).

### **cqlsh**
Cassandra Query Language shell, a command-line interface for Cassandra.

### **Vector Search**
A search function based on vector embeddings.

### **Google UID**
Unique user identifier from Google.

### **audiovisual_gestural_chunks**
A table in AstraDB for storing audiovisual and gestural chunks.

### **micButton**
UI button for microphone control.

### **active**
CSS class indicating an active element state.

### **httpx**
Asynchronous HTTP client for Python.

### **ASGITransport**
Transport for ASGI applications.

### **TestClient**
Client for testing FastAPI applications.

### **keyspace**
A namespace in Cassandra, similar to a database.

### **TRUNCATE TABLE**
SQL command to delete all rows from a table.

### **Postman**
A tool for API testing.

### **curl**
Command-line utility for transferring data to or from a server.

### **CRUD (Create, Read, Update, Delete)**
Basic data operations.

### **top_k**
The number of most relevant results in a vector search.

### **distance**
A similarity metric in vector search.

### **Neuromorphic Computing**
A computing paradigm inspired by the structure and function of the human brain.

### **Spiking Neural Networks (SNN)**
A type of neural network that mimics biological neurons by transmitting information as discrete "spikes" or events.

### **Quantum Neural Networks (QNN)**
Neural networks that use quantum mechanics principles for computation.

### **Quantum-inspired computing**
Algorithms that use quantum principles but run on classical hardware.

### **EEG (Electroencephalography)**
A method for recording the electrical activity of the brain.

### **Neurointerfaces**
Devices or systems that provide a direct connection between the brain and external devices.

### **Semantic gesture analysis**
Analysis of gestures to understand their meaning and intent.

### **Generative holograms**
Holograms created by AI from imagination or request, not just from real data.

### **Federated beacon servers**
Servers that facilitate communication and exchange between trusted nodes in a federated network.

### **Tokenomics**
The economics of a cryptocurrency or token, including its creation, distribution, and governance.

### **Intellectual mining**
A concept of rewarding users for creating and processing valuable data (holograms).

### **DAO (Decentralized Autonomous Organization)**
An organization represented by rules encoded as a computer program that is transparent, controlled by the organization's members, and not influenced by a central government.

### **Decentralized signaling**
Alternative signaling mechanisms for WebRTC that do not require a permanent central server.

### **Distributed Hash Tables (DHT)**
A decentralized distributed system that provides a lookup service similar to a hash table.

### **Micro-power Rental**
A concept where users voluntarily contribute a small portion of their device's computing resources to a distributed network.

### **РЖЯ (Русский Жестовый Язык)**
Russian Sign Language, mentioned as an R&D direction.

### **Light Field Displays**
Light field displays capable of reproducing 3D images without special glasses.

### **Emotiv Insight**
A neurointerface mentioned for integration.

### **Нейроморфные чипы**
Chips that mimic the structure and operation of the human brain.

### **HoloComm**
The concept of holographic communication for metaverses.

### **Квантовые процессоры**
Processors that use quantum mechanics principles for computation.

### **DAO 2.0**
An advanced version of decentralized autonomous organizations.

### **Квантово-устойчивые контракты**
Contracts resistant to attacks using quantum computers.

### **MVP (Minimum Viable Product)**
A product with just enough features to satisfy early customers and provide feedback for future product development.

### **LLM API**
API for interacting with large language models.

### **Cloudflare NLWeb**
Cloudflare service for AI orchestration.

### **GitHub Issues**
A system for tracking tasks and bugs in GitHub.

### **GitHub Projects**
A project management tool in GitHub.

### **pgvector**
A PostgreSQL extension for storing and querying vector embeddings.

### **VS Code Insiders**
The insider's version of Visual Studio Code.

### **Jules from Google**
A tool from Google (presumably for audio).

### **Gemini CLI**
Command-line interface for Gemini.

### **GitHub Actions**
GitHub's CI/CD platform.

### **CI/CD**
Continuous Integration/Continuous Delivery.

### **ID for report**
Identifier for a report.

### **SPA (Single Page Application)**
A web application that loads a single HTML page and dynamically updates that page as the user interacts with the app.

### **backend/ directory**
The directory containing the backend code.

### **app.py**
The main FastAPI application file.

### **api/v1/**
API endpoints for version 1.

### **core/**
The core application modules.

### **services/**
Business logic modules.

### **models/**
Data models.

### **routers/**
API routes.

### **tria_agents/**
AI agents.

### **requirements.txt**
Python dependencies file.

### **Docker**
A platform for developing, shipping, and running applications in containers.

### **Docker image**
A Docker image.

### **koyeb services update**
Koyeb CLI command to update a service.

### **your-registry/holograms-backend:latest**
Example Docker image name.

### **ASTRA_DB_APPLICATION_TOKEN**
Astra Database application token.

### **ASTRA_DB_ID**
Astra Database ID.

### **ASTRA_DB_REGION**
Astra Database region.

### **BACKBLAZE_ACCESS_KEY**
Backblaze B2 access key.

### **BACKBLAZE_SECRET_KEY**
Backblaze B2 secret key.

### **BACKBLAZE_BUCKET_NAME**
Backblaze B2 bucket name.

### **MISTRAL_API_KEY**
Mistral API key.

### **OPENAI_API_KEY**
OpenAI API key.

### **VITE_API_BASE_URL**
Base API URL for Vite.

### **VITE_WS_URL**
WebSocket URL for Vite.

### **CORS settings**
Cross-Origin Resource Sharing settings.

### **Secret keys**
Secret keys.

### **Horizontal scaling**
Adding more instances to handle increased load.

### **Vertical scaling**
Increasing the resources of a single instance.

*This glossary will be updated as the project evolves.*
```
