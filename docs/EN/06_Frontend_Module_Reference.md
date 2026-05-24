# Volume 6: Frontend Module Reference
**Version:** 20.2 (Optimized)
**Date:** March 29, 2026
**Status:** Technical Documentation for Developers

---

## 1. Core

### 1.1. `js/core/init.js`
The central initialization hub.
*   **`initCore()` (async):** Starts the sequence: Scene -> Audio -> UI -> Tria.
*   **`state`:** Global state object containing instances of all managers.

### 1.2. `js/core/eventBus.js`
Event bus (Mediator Pattern).
*   **`emit(event, data)`:** Broadcasts events (e.g., `audio:spectralData`).
*   **`on(event, callback)`:** Subscribes to data streams.

---

## 2. 3D and Visualization

### 2.1. `js/3d/sceneSetup.js`
Graphic pipeline configuration.
*   **`initializeScene(state)`:** Initializes `WebGPURenderer` (r171+). If WebGPU is unavailable, it automatically falls back to WebGL 2.
*   **Parameters:** Configures an `OrthographicCamera` for the frontal view of the hologram.

### 2.2. `js/3d/hologramRenderer.js`
The BasilaQ-256 (128 per ear) rendering core.
*   **`updateVisuals(levels, pans)`:** Receives data from CWT.
    *   `levels`: Float32Array(256)—volume levels.
    *   `pans`: Float32Array(128)—phase panorama.
*   **Physics:** Implements discrete X-axis displacement (1.41° step).

---

## 3. Audio Processing

### 3.1. `js/services/AudioService.js`
Singleton for managing the audio context.
*   **`loadWasmModule()`:** Loads `cwt_analyzer.wasm`.
*   **`createWorkletNode()`:** Creates an `AudioWorkletNode` and passes a cloned WASM buffer (`slice(0)`).

### 3.2. `js/audio/waveletAnalyzer.js`
AudioWorklet processor.
*   Performs **Truncated CWT** (wavelet analysis) in a separate thread.
*   Sends results to the `eventBus` every 16ms (60 FPS).

---

## 4. Multimodal Input (MediaPipe)

### 4.1. `js/multimodal/handsTracking.js`
**MediaPipe Hand Landmarker Task (API3)** integration.
*   **`landmarks`:** Normalized coordinates (0.0 - 1.0).
*   **`worldLandmarks`:** Physical coordinates in meters for XR mapping.
*   **`GestureDNA`:** Analyzes the user's unique motor patterns.

---

## 5. Interface (UI)

### 5.1. `js/ai/chat.js`
Management of the Tria v3.1 chat.
*   **`streamThought()`:** Character-by-character output of the reasoning process.
*   **`stageLabels`:** `RESEARCH`, `THOUGHT` (💭), `SYNTHESIS`, and `CRITIC` markers.

### 5.2. `js/ui/GestureLiveStudio.js`
Gesture recording interface.
*   Enables mapping of trajectories to commands (`applyProgramEvent`).

---
**"Modularity is the freedom of evolution. Clean code is clear thinking."**
_Approved by Frontend Architecture Group._
