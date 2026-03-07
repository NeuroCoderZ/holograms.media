```markdown
# Roadmap and Future Research

**Last Updated:** 2026-03-07 (v0.19.050 Sovereign Audit)

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

## 4. Decentralized "HoloGraph" Network (Native L1 Blockchain)

**Current state:** The foundation for P2P communication using WebRTC has been laid. Signaling via FastAPI on Koyeb. Plan: migrate to Cloudflare Workers (Free Tier).

**Roadmap:**
*   **Phase 1: Native L1 Blockchain (HoloGraph Ledger).** Own blockchain for spatial consensus (Spatial Ledger). Lightweight nodes on Workers + WASM. No dependency on expensive Top-100 tokens.
*   **Phase 2: Tokenomics (HoloCoin/Obolos).** Rewards for intellectual mining and computing contributions.
*   **Phase 3: DAO.** Decentralized governance for the HoloGraph network.

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
