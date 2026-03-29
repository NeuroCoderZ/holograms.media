# Volume 5: NetHoloGlyph P2P Protocol
**Version:** 3.0 (Quantum-Resistant)
**Date:** March 29, 2026
**Status:** Network Standard v21.2

---

## 1. Overview: Collective Resonance
**NetHoloGlyph** is a decentralized protocol for real-time intention exchange. It transforms individual Tria instances into a unified Swarm Intelligence, ensuring hologram synchronization without central server latency.

## 2. Transport Layer (WebRTC + Signaling)
*   **Signaling:** The WebSocket gateway `wss://dev.holograms.media/ws/signaling` is used only for the initial Handshake.
*   **DataChannel:** The entire intent stream flows through the **WebRTC Unreliable DataChannel** to minimize latency.
*   **Fallback:** In case of WebSocket failure, the protocol automatically switches to long-polling (5000ms interval).

## 3. Compression Math: QJL 1-bit Quantization
To transmit high-dimensional vectors (3072d) through narrow communication channels, **Quantized Johnson-Lindenstrauss (QJL)** transformation is used.

### 3.1. Intent Echo-location
Instead of transmitting the full embedding, a node broadcasts a 1-bit signature:
$$q = \text{sign}(M \cdot v)$$
where $M$ is a random sparse matrix. This allows for:
*   Compression of the vector by 16-32 times.
*   Swarm-wide similarity searches at speeds up to 10^6 comparisons per millisecond.
*   **TurboQuant Correction:** Addition of one correction bit to maintain cosine similarity accuracy $>99\%$.

## 4. Post-Quantum Cryptography (PQC)
 The NetHoloGlyph protocol officially complies with **NIST 2026** standards:
*   **ML-KEM (FIPS 203):** A key encapsulation mechanism to protect WebRTC sessions from being cracked by quantum computers.
*   **ML-DSA (FIPS 204):** A digital signature for "Proof-of-Gesture" verification (each gesture is signed with the user's private key).

## 5. Echo-Architecture
When a user performs a gesture, their Tria broadcasts a QJL quantum to the network. Nodes whose local experience (Soma) resonates with this quantum return an "Echo"—metadata that helps reconstruct the shared holographic scene (Earth_0).

---
**"A network is not cables. A network is attunement."**
_Approved by NetHoloGlyph Engineering Swarm._
