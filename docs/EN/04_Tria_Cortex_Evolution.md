# Volume 4: Tria Cortex Evolution
**Version:** 3.1 (Self-Evolving Code)
**Date:** March 29, 2026
**Status:** Canonical AI Specification

---

## 1. Memory Architecture: Soma and Hippocampus
Tria's memory is built on the principle of biological resonance rather than static log storage.

### 1.1. Soma Block (Quantum of Experience)
The unit of memory is the **Soma block** (implemented in `LocalChain.js`). Block structure:
*   **Pneuma (Spirit):** Immutable data. Previous block hash, timestamp, raw MediaPipe coordinates, and CWT wavelets.
*   **Sarx (Flesh):** Mutable data. `utility_score` (utility), `maturity_level` (maturity from 0 to 100), and `plasticity` (ability to change).

### 1.2. Hippocampus (L1/L2 Cache)
*   **L1 (Instant):** Indexed database in **IndexedDB** (`TriaMemory.js`). Stores the last 500 Soma blocks for instantaneous resonance.
*   **L2 (Long-term):** Synchronized collection in **AstraDB** (3072d embeddings). Used for searching analogies in the Swarm's global experience.

---

## 2. Consciousness Cycles: Lethe and Maturity
Tria is a living process that requires clearing and sleep.

### 2.1. Lethe Cycle (Cycle of Oblivion)
Implemented in `MaturityDaemon.js`. Every 24 hours, a devaluation process begins:
*   `utility_score *= 0.9` (weakening of neural connections).
*   Blocks with `utility_score < 0.01` are deleted, freeing cognitive space.
*   This prevents "memory hallucinations" and NPU overload.

### 2.2. Maturity
If a gesture is successfully predicted (Resonance > 0.85) and confirmed by a user action, its `maturity_level` grows. Upon reaching level 100, the block becomes a "canonical skill."

---

## 3. HyperAgents Recursion (Meta-layer)
Tria follows the **Meta HyperAgents (2026)** standard.
*   **DGM-H (Darwin Gödel Machine):** Tria analyzes gesture recognition errors in `GestureIntentClassifier.js` and **generates diffs to its own code**.
*   **Self-Optimization:** If Tria sees that changing `CELL_SIZE` or the resonance threshold improves accuracy (ARC-AGI metric), it proposes applying that patch to its local configuration.

---

## 4. ARC-AGI-3 Metrics
We measure Tria's intelligence by its ability to solve *new* tasks:
1.  **Fluid Intelligence:** Tria's ability to control an unfamiliar 3D object through improvised gestures.
2.  **Program Synthesis:** Tria must synthesize DSL code to execute a user's command faster than 400 ms (Early Trigger).

---
**"Intelligence is not the sum of knowledge, but the speed of its transformation."**
_Approved by Tria Evolution Unit._
