```markdown
# Glossary for the "Holographic Media" Project

## Core Project Concepts

### **Holographic Media**
An open-source platform for multimodal communication via 3D audiovisualizations (holograms) and the Tria AI. The project's goal is to create "Neolang" and "HoloGraph".

### **Neolang**
A universal language for interacting with data and artificial intelligence, enabling users to intuitively control complex systems.

### **HoloGraph**
A decentralized economic system integrated into the platform, providing value exchange and interaction between participants.

### **Tria AI**
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

### **`waveletAnalyzer.js`**
Module implementing the `AudioWorkletProcessor` ('cwt-processor'), which loads and manages the WASM `holocore` for audio processing.

### **`AudioWorkletProcessor` ('cwt-processor')**
Specialized object in `AudioWorklet` that performs actual audio data processing using the `holocore` WASM module.

### **`microphoneManager.js`**
Module managing user microphone access and streaming audio for processing in `waveletAnalyzer`.

### **`audioFilePlayer.js`**
Module responsible for playing audio files and streaming them to `waveletAnalyzer` for analysis.

### **`hologramRenderer.js`**
Frontend visualization core. Receives processed audio data (volume levels, panorama) from `AudioWorklet` and updates the 3D scene, displaying holograms.

### **`gestureIntentClient.js`**
Module managing the WebSocket connection to the backend for sending user gesture intents.

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

*This glossary will be updated as the project evolves.*
```
