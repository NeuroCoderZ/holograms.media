# Glossary for the "Holographic Media" Project

**Last Updated:** February 14, 2026

## Core Project Concepts

### **Holographic Media**
An open-source platform for multimodal communication via 3D audiovisualizations (holograms) and the Tria AI. The project's goal is to create "Neolang" and "HoloGraph".

### **Neolang**
A universal multimodal language for interacting with data and artificial intelligence, enabling users to intuitively control complex systems.

### **HoloGraph**
A decentralized economic and data management system integrated into the platform, providing value exchange and interaction between participants.

### **Tria**
The central AI assistant of the platform, enabling multimodal interaction, semantic search, and autonomous data processing.

### **Multimodal Communication**
Interaction using multiple channels or modalities (e.g., sound, visualization, gestures) for transmitting information.

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
The programming language used for `holocore` development due to its performance, safety, and low-level control.

### **WebAssembly (WASM)**
Binary instruction format for execution in web browsers. Allows `holocore` to run with near-native performance directly in the frontend.

### **AudioWorklet**
Web Audio API for running code to process audio in a separate thread, providing high performance. Loads and runs the WASM `holocore` module.

### **CWT (Complex Wavelet Transform)**
Complex wavelet transform, a mathematical method for signal analysis, used in `holocore` to extract time-frequency characteristics from audio.

### **Morlet Wavelet**
A specific type of wavelet used in CWT for audio analysis, optimal for detecting local sound features.

### **Phase Difference**
The difference in phase between audio signals from different sources or "ears", used to create a 3D sound panorama effect.

### **3D Sound Panorama**
Technology for creating a spatial sound effect, where sound sources are perceived as located in three-dimensional space around the listener.

## Specialized Technologies and Physics

### **BasilaQ-127 / BasilaQ-128**
A mathematical visualization model where 1dB equals 1 grid cell. Z-scale physics is defined as `128 + dB`. Luminance intensity (Z-Dimming) is always proportional to the column length.

### **Cochlear Cylinder**
A 3D visualization based on toroidal geometry, mimicking the structure of the cochlear apparatus. Used as the primary XR fallback for an immersive experience.

### **Q-Factor Dome**
An interactive sound modulation element in XR mode. Allows changing the Q-factor of filters via pinch gestures.

### **Z-Depth Visualization**
A depth visualization technique for audio frequencies, providing 128-step quantized brightness. The higher the volume in a cell, the closer and brighter it is displayed.

### **Agentic Wallets**
Integration of Base/x402 (Coinbase) protocols, allowing the Tria AI assistant to independently perform microtransactions and manage resources within HoloGraph.

### **Spectral Inpainter**
A Tria component for real-time restoration of missing audio spectrum fragments using cached DFT tables.

### **HoloCoin**
The internal cryptocurrency of the Holographic Media ecosystem, rewarding users for "Intellectual Mining" and content creation.

### **Proof of Creation**
The consensus mechanism used in HoloGraph to validate the creation of original holographic content.

### **GoloGlyph (Hologlyph)**
An atomic unit of multimodal data (quanta) exchanged via the NetHoloGlyph protocol.

### **Sound Pixel (Audio Pixel)**
The basic visual building block of a hologram, representing a specific frequency and amplitude at a given moment.

---
*This glossary will be updated as the project evolves.*
