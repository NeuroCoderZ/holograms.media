```markdown
# Roadmap and Future Research

This document outlines the horizons of our project. Here are the ideas and technologies we plan to explore and implement in the future. These are not promises, but vectors for our scientific and technical search.

## 1. Neuromorphic Computing: Transition to SNN

**Current state:** Our audio core `holocore` uses wavelet transform (CWT), which is a mathematical analogue of how the human ear works.

**Next step:** We plan to research and develop hybrid models where the output of CWT will serve as input for **Spiking Neural Networks (SNN)**.

**Ultimate goal:** To create a fully event-driven audio pipeline based on SNN. This will allow sound to be processed not in continuous chunks, but as asynchronous "events" (spikes), which is orders of magnitude more efficient and closer to biological processes in the brain.

## 2. Quantum Inspiration: QNN for Pattern Analysis

**Current state:** We use classical algorithms for data analysis.

**Research direction:** Study the principles of **Quantum Neural Networks (QNN)** for solving specific tasks such as:
*   **Recognition of complex, multilayered audio scenes:** Where multiple sound sources overlap.
*   **Intent analysis in language and gestures:** Searching for hidden patterns and correlations in multimodal data.

This is not about running code on real quantum computers, but about using quantum-inspired algorithms (Quantum-inspired computing) on classical hardware to improve analysis efficiency.

## 3. Multimodal "Neolang": Beyond Gestures

**Current state:** We process sound and are beginning to work with hand gestures.

**Future development:**
*   **Integration with biometrics:** Researching the possibility of connecting EEG (electroencephalography) and other neurointerfaces for direct control of holograms.
*   **Semantic gesture analysis:** Moving from recognizing simple commands ("select", "move") to understanding complex, meaningful sign language.
*   **Generative holograms:** Creating holograms not only from real data, but also generating them "from imagination" by the Tria AI at the user's request.

## 4. Decentralized "HoloGraph" Network

**Current state:** The foundation for P2P communication using WebRTC has been laid.

**Roadmap:**
*   **Phase 1: Federation.** Creating federated beacon servers for exchanging holograms between trusted nodes.
*   **Phase 2: Tokenomics.** Developing a token concept for "intellectual mining" — rewarding users for creating and processing valuable data (holograms).
*   **Phase 3: DAO.** Forming a decentralized autonomous organization (DAO) to manage the development of the HoloGraph network.

This document will be regularly updated as our research and development progress.

## 5. Full Decentralization: Eliminating Central Dependencies

**Current state:** Despite the P2P architecture, for initial connection (WebRTC signaling) and some API calls we use a centralized backend on Koyeb.

**Task:** Completely eliminate dependence on any centralized servers for key functions.

**Research plan:**
*   **Decentralized signaling:** Study and implement alternative signaling mechanisms that do not require a permanent server. Possible options:
    *   Using distributed hash tables (DHT), as in BitTorrent.
    *   Transmitting signaling messages via other P2P networks.
    *   Manual "copy-paste" of offers as an extreme but absolutely decentralized method.
*   **Distributed computation for Tria:** Develop mechanisms for executing LLM requests and other computations in a distributed manner, on users' own devices, within the concept of "Micro-power Rental".

The ultimate goal is an application that can be launched simply by opening `index.html` locally, and which can connect to the network without contacting any single server owned by the developers.

```
