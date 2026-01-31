```markdown
# Frontend Module Catalog (JavaScript)

This document describes the structure and interrelationships of JavaScript modules in the frontend part of the holograms.media project.

## Directory Structure Overview

- `/js/`
    - `/3d/` - Modules for 3D scene handling (Three.js).
        - `hologramRenderer.js`
        - `rendering.js`
        - `sceneSetup.js`
        - `/webgpu/hologram_shader_webgpu.js` — WebGPU shaders for holograms
        - `/webgpu/README.md`
        - `/webgpu/webgpu_renderer.js` — WebGPU renderer
    - `/ai/` - Modules related to AI integration (Tria, chat).
        - `chat.js` — Chat integration with the Tria AI assistant via Cloudflare AutoRAG and ModernChatInterface.
        - `models.js`
        - `prompts.js`
        - `tria.js`
        - `tria_mode.js`
        - `magentaService.js`
        - `gestureIntentClassifier.js`
    - `/audio/` - Audio-related modules.
        - `audioFilePlayer.js`
        - `audioProcessing.js`
        - `microphoneManager.js`
        - `speechInput.js`
        - `waveletAnalyzer.js`
        - `audioVisualizer.js`
        - `cwt_analyzer.js`
        - `cwt.cpp`
        - `cwtAudioWorklet.js`
        - `processing.js`
        - `cwtAudioWorklet.js`
        - `processing.js`
        - `webAudioEngine.js` (Legacy — replaced by AudioService)
    - `/config/` - Configuration modules.
        - `hologramConfig.js`, `hologramConstants.js`
    - `/core/` - Core application modules.
        - `appStatePersistence.js`
        - `consentManager.js`
        - `diagnostics.js`
        - `eventBus.js`
        - `gestures.js` — (MediaPipe Hands, GestureIntentClassifier)
        - `init.js` — Main core initialization file.
        - `mediaInitializer.js`
        - `platformDetector.js`
        - `pwaInstall.js`
        - `resizeHandler.js`
        - `resizeHandler.test.js`
        - `SQLiteEmbeddingService.js`
        - `threeImports.js`
        - `TriaBiosService.js`
        - `TriaDBClient.js`
        - `TriaOrchestrator.js`
        - `ui.js`
        - `/3d/audioVisualizer.js`
        - `/audio/audioPlayer.js`
        - `/multimodal/handsTracking.js`
        - `/multimodal/speechInput.js`
        - `/multimodal/webRTC.js`
        - `/services/apiService.js`
        - `/ui/chatUI.js`
        - `/ui/panelManager.js`
        - `/ui/uiManager.js`
        - `stateManager.js`
    - `/gestures/` - Modules for hand gesture recognition and processing.
        - `AtomicGestureClassifier.js`
        - `GestureSequencer.js`
        - `detection.js`
    - `/multimodal/` - Modules for multimodal data processing.
        - `handsTracking.js` — Hand tracking (MediaPipe)
        - `voice_input.js` — Voice input handling
    - `/panels/` - UI panel management modules.
        - `chatMessages.js`
        - `rightPanelManager.js`
        - `hologramPanelManager.js`
    - `/platforms/` - Platform-specific code.
        - `/desktop/`, `/mobile/`, `/xr/`
    - `/services/` - Backend interaction and global services.
        - `AudioService.js` # Singleton for AudioContext and AudioWorklet management.
        - `apiService.js`
        - `CloudGestureStorage.js`
        - `hologlyphService.js`
        - `netHoloGlyphClient.js`
        - `websocketService.js`
        - `gestureIntentClient.js`
    - `/ui/` - Common UI modules.
        - `layoutManager.js`
        - `mainUI.js`
        - `panelManager.js`
        - `uiManager.js`
        - `fileEditor.js`
        - `gestureAreaManager.js`
        - `gestureAreaVisualization.js`
        - `GesturesListDisplay.js`
        - `GestureUIManager.js`
        - `MyGesturesPanel.js`
        - `promptManager.js`
        - `versionManager.js`
        - `VersionTimelinePanel.js`
    - `/utils/` - Utility helpers.
        - `fullscreen.js`
        - `helpers.js`
        - `storage.js`
    - `/wasm/` - WebAssembly modules and wrappers.
        - `/fastcwt/` — Prebuilt WASM CWT module and JS bindings.
    - `/xr/` - WebXR modules.
        - `webxr_session_manager.js`
        - `cameraManager.js` — Camera manager for XR
        - `xr_input_handler.js` — XR input handler
    - `main.js` — Main entry point.
    - `legacy-bridge.js` — Compatibility bridge for legacy code (temporary).
    - `SmartHologram.js` — Smart hologram with extended capabilities
    - `/agents/` — AI agents for various tasks.
        - `AudioAgent.js`
        - `BaseAgent.js`
        - `MemoryAgent.js`
        - `OrchestrationAgent.js`
        - `SynthesisAgent.js`
        - `VisualAgent.js`
    - `/managers/` — Managers for different application aspects.
        - `GestureManager.js`
        - `GestureRecordingManager.js`
        - `HologramManager.js`
        - `InteractionManager.js`
        - `RightPanelManager.js`
    - `/workers/` — Web Workers for background processing.
        - `tria_db_worker.js`

## Key Modules and Relationships

### `main.js`
- **Purpose:** Application entry point.
- **Logic:**
    1. Initializes `ConsentManager` to obtain user consent.
    2. Calls `initCore()` to set up the 3D scene and application state.
    3. Calls `initializeMainUI()` to cache DOM elements.
    4. Calls `startFullApplication()`, which detects the platform (`desktop`, `mobile`, `xr`) and dynamically loads platform-specific layout and input modules.
    5. Starts the main animation loop.
    6. Calls `initializeTriaChat()` to set up the Tria AI chat.
- **Related Files:** `core/init.js`, `ui/uiManager.js`, `core/platformDetector.js`, `3d/rendering.js`, `core/consentManager.js`, `ai/chat.js`, dynamic imports from `platforms/*`.

---

### `/core/init.js`
- **Purpose:** Initializes application core and exports the global `state` object.
- **Exports:** `state`, `initCore`.
- **`initCore()` Logic:**
    1. Calls `initializeScene()` to set up the WebGPU renderer and scene and handles initialization errors.
    2. Creates and stores in `state` instances of key managers: `HologramRenderer`, `XRSessionManager`, `MicrophoneManager`, `AudioFilePlayer`.
    3. **Does not create** the legacy `AudioAnalyzer`.
- **Related Files:** `3d/sceneSetup.js`, `audio/microphoneManager.js`, `audio/audioFilePlayer.js`, `3d/hologramRenderer.js`, `xr/webxr_session_manager.js`, `ui/panelManager.js`.

---

### `/3d/sceneSetup.js`
- **Purpose:** Initializes the 3D scene, camera, and WebGPU renderer.
- **Exports:** `initializeScene`.
- **Logic:**
    1. Checks WebGPU support (`if (!navigator.gpu)`).
    2. Asynchronously initializes `THREE.WebGPURenderer`, requesting adapter and device.
    3. Calls `renderer.init()` to finalize setup.
    4. Configures an orthographic camera, scene, and basic lighting.
    5. On error (WebGPU unsupported or initialization failure), logs a critical error, shows a `webgl-error-modal`, and returns `null` for scene, renderer, and camera.
- **Related Libraries:** `three.js`.

---

### `/3d/rendering.js`
- **Purpose:** Manages the render loop (animation).
- **Exports:** `startAnimationLoop`.
- **Logic:**
    1. Starts the animation loop via `renderer.setAnimationLoop()`.
    2. Updates TWEEN animations and renders the scene each frame (`renderer.render()`).
    3. Calls `hologramRenderer.updateVisuals()` which now receives data from the `MicrophoneManager` (via the WASM module) for dynamic visualization updates.
- **Related Files:** `three.js`, `@tweenjs/tween.js`, `3d/hologramRenderer.js`, `audio/microphoneManager.js`.

---

### `/ai/chat.js`
- **Purpose:** Manages chat logic with the Tria AI assistant using Cloudflare AutoRAG and ModernChatInterface.
- **Exports:** `initializeTriaChat`.
- **`initializeTriaChat()` Logic:**
    1. Imports `ModernChatInterface` from the Cloudflare worker script (`fp-chat-interface-snippet.js`).
    2. Locates chat DOM elements: `#chatMessages`, `#chatInput`, `#submitChatMessage`, and `#loadingIndicator`.
    3. Creates and configures a `ModernChatInterface` instance with those elements.
    4. Sets `selectedSite` to the worker URL used by our project.
    5. Calls `createNewChat()` to initialize a new chat session.
    6. Overrides default handlers for the submit button and input field to call `triaInterface.sendMessage(message)`.
    7. Adds automatic resizing for the input field.
---
