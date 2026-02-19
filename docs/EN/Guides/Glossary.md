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

### **NeuroCoder / NeuroCoderZ**
Original development methodology and philosophy created by Alexander (NeuroCoderZ). Neurocoding is a practice where AI agents are full co-authors of the project, not just autocompletion tools. A NeuroCoder formulates architectural thinking, sets tasks, verifies logic, and takes responsibility for final decisions—in continuous tandem with neural networks. The "Holographic Media" project is created using the neurocoding method. The handle "NeuroCoderZ" is the author's personal identifier, adopted by necessity in 2024.

## Infrastructure and Deployment

### **Cloudflare Pages**
Cloudflare's service for hosting and deploying static sites and single-page applications (SPA), used for the project's frontend.

### **Koyeb**
Serverless platform for deploying applications, used for hosting the backend (compute services).

### **AstraDB (Cassandra-based)**
The project's sole distributed database, used for storing global data and managing system state. Provides high availability and scalability.

## Canonical Core (holocore)

### **holocore**
The central element of the project's audio pipeline, implemented in Rust and compiled to WebAssembly (WASM). Responsible for complex wavelet transform (CWT) calculations and Diaphora for the Enharmonon (3D sound panorama).

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

### **Diaphora**
The difference in phase between audio signals from different sources or spatial positions. A key parameter used to build the Enharmonon—a three-dimensional sound panorama.

### **Enharmonon**
Technology for creating a spatial sound effect based on Diaphora (phase difference), where sound sources are perceived as located in three-dimensional space around the listener. Named after the ancient Greek enharmonic mode—the finest instrument of spatial hearing.

## Specialized Technologies and Physics

### **BasilaQ-128**
A mathematical visualization model where 1dB equals 1 grid cell. Z-scale physics is defined as `128 + dB`. Luminance intensity (Z-Dimming) is always proportional to the column length.

### **Cochlear Cylinder**
A 3D visualization based on toroidal geometry, mimicking the structure of the cochlear apparatus. Used as the primary XR fallback for an immersive experience.

### **Q-Factor Dome**
An interactive sound modulation element in XR mode. Allows changing the Q-factor of filters via pinch gestures.

### **Bathymetry**
A depth visualization technique for audio frequencies based on the BasilaQ-128 model, providing 128-step quantized brightness. The higher the amplitude in a cell, the "closer" and brighter it is displayed. Analogous to an ocean bathymetric map where depth is color-coded.

### **Hermaion**
Integration of Base/x402 (Coinbase) protocols, allowing the Tria AI assistant to independently perform microtransactions and manage resources within HoloGraph. Named after the "gift of Hermes"—the god of mediators.

### **Palinodes**
A Tria component for real-time restoration of missing audio spectrum fragments using cached DFT tables. The name comes from the Greek "singing again"—Palínodēs literally "fills in" the spectrum where data is missing.

### **Mnesis / Pause Mnesis**
Mnesis is the continuous background process of recording and forming Tria's memory based on user interactions. Active by default. The user can pause it via the "Pause Mnesis" UI element for privacy or resource saving.

## Tria Cortex: Memory Architecture

### **Enkephalon**
The neural core of Tria, implemented in Rust and compiled to WebAssembly. Contains Hebbian-associative memory: a matrix for projecting gestures and a matrix for associating them with intentions. Runs on the client side.

### **Lethe**
The weight decay mechanism of the Enkephalon neural network: `W *= (1 − λ)`. Knowledge that is not used gradually loses strength—"drowns in Lethe." The cycle runs every 24 hours.

### **Obolos**
The unit of utility in the HoloCoin system (Proof-of-Utility). An active, used gesture equals a weighty Obolos. A neglected gesture is erased by Lethe.

### **Soma / Pneuma / Sarx**
The three layers of a Tria memory block:
- **Soma** (Body)—the complete data block, a living structure.
- **Pneuma** (Spirit)—the immutable core of the block (raw data, hash link). That which "was."
- **Sarx** (Flesh)—the mutable envelope (interpretation, utility). That which "means."

### **HoloCoin**
The internal cryptocurrency of the ecosystem, used for rewarding "Intellectual Mining" based on Obolos.

### **Phonon**
The basic visual and computational quantum of a hologram, a quantum of sound energy. An analog of a pixel; BasilaQ-128 columns are built from phonons.

---
*This glossary will be updated as the project evolves.*
