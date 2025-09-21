```markdown
# Module Interfaces

This document describes public APIs and key dependencies for JavaScript modules.

## `js/core/init.js`

* **Purpose:** Central module that defines and initializes the global `state` object and coordinates the startup of the application's main services and managers.
* **Exported API:**
  * `state` (object): The global application state object.
  * `initCore()` (async function): Main core initialization function (3D scene, audio, XR, UI panels and managers).
  * `initializeState()` (function): Function to initialize or log initial state.
* **Key dependencies:**
  * `../config/hologramConfig.js` (for `semitones`)
  * `../3d/sceneSetup.js` (for `initializeScene`)
  * `../audio/microphoneManager.js` (for `MicrophoneManager` class)
  * `../audio/audioFilePlayer.js` (for `AudioFilePlayer` class)
  * `../3d/hologramRenderer.js` (for `HologramRenderer` class)
  * `../xr/webxr_session_manager.js` (for `XRSessionManager` class)
  * `../ui/panelManager.js` (for `PanelManager` class)
  * `../audio/audioProcessing.js` (dynamic import of `setupAudioProcessing`)
* **Interaction with `state`:** Defines, exports and actively populates the global `state` object with components, configurations and manager instances.

## `js/core/platformDetector.js`

* **Purpose:** Detects the platform type (XR, mobile, desktop) where the app runs.
* **Exported API:**
  * `detectPlatform()` (function): Returns the string `'xr'`, `'mobile'`, or `'desktop'`.
* **Key dependencies:** None within the project.
* **Interaction with `state`:** None.


## `js/core/mediaInitializer.js`

* **Purpose:** Initializes multimedia components by requesting camera and microphone access. Sets up the microphone and video stream used for hand tracking.
* **Exported API:**
  * `initializeMultimedia(appState)` (async function): Calls `getUserMedia`, initializes `MicrophoneManager` and `handsTracking` with the obtained `MediaStream`. Accepts the application state object (`appState`).
* **Key dependencies:**
  * `../audio/microphoneManager.js` (for `MicrophoneManager` class)
  * `../multimodal/handsTracking.js` (for `startVideoStream`)
* **Interaction with `state` (passed as `appState`):**
  * Reads: `appState.audio.audioContext`, `appState.microphoneManagerInstance`, `appState.multimodal.videoElementForHands`, `appState.multimodal.handsInstance`.
  * Writes: `appState.multimodal.currentStream`, `appState.audio.audioContext`, `appState.audio.microphoneAnalysers`, `appState.audio.activeSource`.


## `js/core/appStatePersistence.js`

* **Purpose:** Provides saving and loading of application state, specifically UI panel visibility, using `localStorage`.
* **Exported API:**
  * `loadPanelsHiddenState()` (function): Loads panels visibility state from `localStorage`.
  * `savePanelsHiddenState(isHidden)` (function): Saves panels visibility state to `localStorage`.
* **Key dependencies:** None within the project.
* **Interaction with `state`:** Operates on state persisted in `localStorage`, not directly on the global `state` from `core/init.js`.

## `js/core/diagnostics.js`

* **Purpose:** Provides functions for diagnosing frontend application state by collecting and logging information about global objects, DOM elements, key components from `state` and the environment.
* **Exported API:**
  * `runFrontendDiagnostics()` (function): Main diagnostics function. Returns an object with diagnostics results.
* **Key dependencies:**
  * `./init.js` (for `state`)
* **Interaction with `state`:** Reads various properties from `state` to verify initialization (e.g., `state.scene`, `state.camera`, `state.renderer`, `state.audioContext`, `state.xrMode`).

## `js/core/domEventHandlers.js`

* **Purpose:** Contains logic for handling prompts (including invoking Tria mode and sending requests to `/generate`), executing generated code and creating new versions. Also sets up a `MutationObserver` for gesture UI elements. Much of the file- and general DOM-related functionality has been moved to other modules (e.g., `DesktopInput.js`).
* **Exported API:**
  * `setupDOMEventHandlers()` (function): Sets up a `MutationObserver` for gesture UI; many button and file-editor related functions are deprecated or moved.
  * `applyPrompt(prompt, model)` (async function): Processes a prompt. Called from `DesktopInput.js`. Tries `applyPromptWithTriaMode` first (if Tria mode is active). If Tria mode is not active or does not handle the prompt, sends the prompt to `/generate` to obtain generated code, runs it in the Three.js scene context, and then sends the scene state to `/branches` to create a new version. The `model` parameter for `/generate` is taken from the `#modelSelect` selector.
* **Key dependencies:**
  * `./init.js` (for `state`)
  * `../ai/tria_mode.js` (for `applyPromptWithTriaMode`)
  * `axios`
  * `three`
* **Interaction with `state`:**
  * Reads: `state.scene`, `state.mainSequencerGroup` (for executing generated code), `state.uiElements.inputs.topPromptInput`, `state.uiElements.inputs.modelSelect`, `state.currentBranch`, `state.hologramVersions`, `state.currentVersion`, `state.uiElements.containers.versionFrames`.
  * Writes: `state.uiElements.inputs.topPromptInput.value`, `state.currentVersion`, `state.hologramVersions` (on new version creation).

## `js/core/events.js`

* **Purpose:** Manages `MutationObserver` for specific UI elements (gesture panel, chat messages, audio player) and sets listeners for the chat input field. Most input-specific handlers have been moved to platform-dependent modules (`DesktopInput.js`, `MobileInput.js`).
* **Exported API:**
  * `setupDOMEventHandlers()` (function): Sets up a `MutationObserver` for attribute or child changes on the gesture panel, chat messages container and audio player container.
  * `setupEventListeners()` (function): Main initialization function that calls `setupChatTextInputListeners` and `setupDOMEventHandlers`.
* **Key dependencies:**
  * `../ui/uiManager.js` (for `uiElements`)
* **Interaction with `state`:** No direct interaction with the global `state` from `core/init.js`.


## `js/core/gestures.js`

* **Purpose:** Sets up and manages touch gestures (pan, pinch) for interacting with the 3D hologram using `MediaPipe Hands` and `GestureIntentClassifier`.
* **Exported API:**
  * `initializeGestures(passedState)` (function): Initializes `MediaPipe Hands` and `GestureIntentClassifier` on the renderer DOM element and registers gesture handlers. Accepts the application state object (`passedState`).
* **Key dependencies:**
  * `three` (imported directly)
  * `@mediapipe/hands`
  * `../ai/gestureIntentClassifier.js`
  * `TWEEN.js` (global via `window.TWEEN`)
* **Interaction with `state` (passed as `passedState`):**
  * Reads: `passedState.renderer.domElement`, `passedState.isXRMode`, `passedState.hologramRendererInstance`, `passedState.camera`.
  * Modifies: rotation and scale of `hologramPivot` (via `passedState.hologramRendererInstance`). Rotates `passedState.camera` in XR mode.

## `js/core/pwaInstall.js`

* **Purpose:** Manages Progressive Web App (PWA) installation logic.
* **Exported API:**
  * `initializePwaInstall()` (function): Sets up `beforeinstallprompt` and `appinstalled` listeners and a click listener for the PWA install button.
* **Key dependencies:** None within the project.
* **Interaction with `state`:** None.

## `js/core/resizeHandler.js`

* **Purpose:** Handles window resize events to adapt UI layout and the 3D scene.
* **Exported API:**
  * `getPanelWidths()` (function): Returns the combined width of left and right panels.
  * `getLeftPanelWidth()` (function): Returns the left panel width.
  * `initializeResizeHandler(passedState)` (function): Attaches a debounced `resize` listener to `window`. Accepts the application state object (`passedState`).
* **Key dependencies:**
  * `three` (imported directly)
  * `../ui/layoutManager.js` (for `updateHologramLayout`)
  * `../utils/helpers.js` (for `debounce`)
* **Interaction with `state` (passed as `passedState`):**
  * Reads: `passedState.uiElements.leftPanel`, `passedState.uiElements.rightPanel`, `passedState.uiElements.gridContainer`, `passedState.uiElements.gestureArea`, `passedState.renderer`, `passedState.activeCamera`.
  * Modifies: `passedState.renderer` (size) and `passedState.activeCamera` (projection matrix, FOV, aspect, orthographic volume).

## `js/core/ui.js`

* **Purpose:** Manages the user interface, including collecting DOM element references, toggling panel visibility, gesture area and chat mode.
* **Exported API:**
  * `ui` (object): Structured object containing references to UI DOM elements.
  * `setupUI()` (function): Populates `ui` by querying DOM elements and calls `initializePanelState`.
  * `toggleGestureArea(show)` (function): Shows or hides the gesture area.
  * `initializePanelState()` (function): Initializes panel visibility state from `localStorage`.
  * `togglePanels()` (function): Toggles left/right panel visibility and saves the state.
  * `toggleChatMode()` (function): Switches UI between chat mode and main prompt input mode.
* **Key dependencies:** None direct.
* **Interaction with `state`:**
  * Exports and defines the `ui` object that holds DOM references. `setupUI()` fills this object.
  * `initializePanelState` and `togglePanels` use `localStorage` rather than modifying `state` directly.

## `js/core/consentManager.js`

* **Purpose:** Manages requesting and storing user consent using a modal and `localStorage`.
* **Exported API:**
  * `ConsentManager` (class):
    * `constructor(state)`: Accepts the global `state` object to access UI elements.
    * `initialize()` (async function): Initializes consent logic. Returns a Promise that resolves when the user gives consent. Checks `localStorage` for prior consent.
* **Key dependencies:** None direct; uses DOM APIs and `localStorage`.
* **Interaction with `state`:**
  * Receives `state` in the constructor.
  * Reads: `state.uiElements.modals.startSessionModal`, `state.uiElements.buttons.startSessionButton`.
  * Does not modify `state` directly, but uses it to access UI elements.

## `js/core/3d/audioVisualizer.js`

* **Purpose:** Intended to hold common or core 3D audio visualization logic. **The file is implemented and contains functionality.**
* **Exported API:** None.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/core/audio/audioPlayer.js`

* **Purpose:** Intended to encapsulate core audio playback logic. **The file is implemented and contains functionality.**
* **Exported API:** None.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/core/multimodal/handsTracking.js`

* **Purpose:** Proposed place for main hand-tracking logic using MediaPipe. **Currently the file only contains imports and is a stub; the functional implementation resides in `js/multimodal/handsTracking.js`.**
* **Exported API:** None.
* **Key dependencies:**
  * `@mediapipe/hands`
  * `@mediapipe/camera_utils`
* **Interaction with `state`:** None in current form.

## `js/core/multimodal/speechInput.js`

* **Purpose:** Intended to hold core speech-input handling logic. **The file is implemented and contains functionality.** Functional implementations are present in `js/audio/speechInput.js` and `js/multimodal/voice_input.js`.
* **Exported API:** None.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/core/multimodal/webRTC.js`

* **Purpose:** Intended to implement core WebRTC logic for peer-to-peer communication. **The file is implemented and contains functionality.**
* **Exported API:** None.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/core/services/apiService.js`

* **Purpose:** Provides functions for interacting with backend APIs (deployed on Koyeb), such as user auth synchronization (`/auth_sync`) and sending chat messages (`/tria_chat_handler`).
* **Exported API:**
  * `syncUserAuth(idToken)` (async function): Sends Firebase ID token to backend to synchronize user. Uses `fetch`.
  * `sendChatMessage(messageText, idToken)` (async function): Sends chat message and ID token to backend. Uses `fetch`.
* **Key dependencies:** No direct project dependencies, uses native `fetch`.
* **Interaction with `state`:** None.

## `js/core/services/nethologlyphClient.js`

* **Purpose:** Intended to implement a client for interaction with the `NetHoloGlyph` server. **The file is implemented and contains functionality.**
* **Exported API:** None.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/core/ui/chatUI.js`

* **Purpose:** Manages chat UI, including displaying messages and sending messages to the backend (Cloud Function).
* **Exported API:**
  * `initChatUI()` (function): Initializes chat DOM references and event listeners for sending messages.
* **Key dependencies:**
  * `../firebaseInit.js` (for `auth` — getting the current user).
* **Interaction with `state`:** None. Uses `auth.currentUser` to obtain the user ID.

## `js/core/ui/panelManager.js`

* **Purpose:** Defines `PanelManager` class to manage UI panels. **Contains a minimal implementation with a constructor and basic functionality.** More feature-rich panel managers exist at `js/ui/panelManager.js` (panel content) and `js/panels/rightPanelManager.js` (right-panel control).
* **Exported API:**
  * `PanelManager` (class, default export).
* **Key dependencies:** None.
* **Interaction with `state`:** None in current form.

## `js/core/ui/uiManager.js`

* **Purpose:** Defines `UIManager` class for overall UI management. **Currently a minimal stub that only stores a constructor reference to `PanelManager` from `state`.** The main UI collection and initialization module is `js/ui/uiManager.js`.
* **Exported API:**
  * `UIManager` (class, default export).
* **Key dependencies:**
  * `../init.js` (for `state`).
* **Interaction with `state`:** Reads `state.panelManager` during instantiation.

## `js/3d/hologramRenderer.js`

* **Purpose:** Defines `HologramRenderer` class for creating and managing the 3D audio-hologram visualization within a provided Three.js scene. It creates and updates a mesh structure that represents audio data with columns reacting to audio levels.
* **Exported API:**
  * `HologramRenderer` (class):
    * `constructor(scene: THREE.Scene)`: Accepts a Three.js scene object.
    * `updateVisuals(dbLevels: Float32Array, panAngles: Float32Array)`: Updates visualization based on audio data (levels and pan angles). If data is `null` or invalid, resets the visualization.
    * `getHologramPivot(): THREE.Group`: Returns the main hologram node (group) that can be added to the scene.
* **Key dependencies:**
  * `three` (imported directly)
  * `three/addons/lines/Line2.js`
  * `three/addons/lines/LineMaterial.js`
  * `three/addons/lines/LineGeometry.js`
  * `three/addons/loaders/GLTFLoader.js`
  * `three/addons/loaders/KTX2Loader.js`
  * `three/addons/libs/meshopt_decoder.module.js`
  * `../config/hologramConfig.js` (for `semitones`, `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`)
  * `../core/eventBus.js` (for subscribing to CWT results)
* **Interaction with `state`:** Does not directly interact with the global `state` from `core/init.js` for internal operations. Works with the provided `THREE.Scene`. An instance is stored in `state.hologramRendererInstance`. Subscribes to `cwtResult` events via `eventBus`.

## `js/3d/rendering.js`

* **Purpose:** Responsible for the main animation loop (`renderer.setAnimationLoop`) and rendering the 3D scene. Updates TWEEN animations and calls `updateVisuals` on the `hologramRendererInstance`.
* **Exported API:**
  * `startAnimationLoop(appState)` (function): Starts the main render loop with the application state (`appState`).
  * `updateHologramMesh()` (function): Placeholder for potential hologram mesh updates (currently unused).
* **Key dependencies:**
  * `@tweenjs/tween.js` (imported directly)
  * `three` (imported directly)
  * `../3d/hologramRenderer.js`
  * `../audio/microphoneManager.js`
* **Interaction with `state` (passed as `appState`):**
  * Reads: `appState.renderer`, `appState.scene`, `appState.activeCamera`, `appState.hologramRendererInstance`, `appState.audio.currentDbLevels`, `appState.audio.currentPanAngles`.
  * Does not modify `state` directly but uses its properties for rendering and updating visualization.

## `js/3d/sceneSetup.js`

* **Purpose:** Initializes the basic Three.js scene, WebGPU renderer, orthographic camera and primary lighting. Handles WebGPU initialization errors.
* **Exported API:**
  * `initializeScene(state)` (async function): Initializes scene components (scene, renderer, camera, lighting) and writes them into the provided `state` object. Returns an object with initialized `scene`, `renderer`, `camera` or `null` on critical WebGPU failure.
* **Key dependencies:**
  * `three` (imported directly).
* **Interaction with `state`:** Writes `state.scene`, `state.renderer`, `state.camera`, `state.activeCamera`, `state.ambientLight`, `state.directionalLight`.

## `js/3d/webgpu/hologram_shader_webgpu.js`

* **Purpose:** Contains placeholders for WGSL (WebGPU Shading Language) vertex and fragment shaders for rendering holograms using WebGPU. **Currently exports are commented out and the file is a conceptual placeholder.**
* **Exported API:** None (planned exports: `HOLOGRAM_VERTEX_SHADER_WGSL`, `HOLOGRAM_FRAGMENT_SHADER_WGSL`).
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/3d/webgpu/webgpu_renderer.js`

* **Purpose:** Defines `WebGPURenderer` class to encapsulate WebGPU rendering logic. Includes adapter and device initialization and context setup. **Currently contains a basic structure and stubs; export is commented out.**
* **Exported API:** None (planned export: `WebGPURenderer` class with `init`, `renderFrame` methods).
* **Key dependencies:** None direct; uses WebGPU API.
* **Interaction with `state`:** None.

## `js/audio/audioAnalyzer.js`

* **Purpose:** Defines `AudioAnalyzer` class. **This module is deprecated and not used**, as audio analysis is now performed by an AudioWorklet with WASM. Contains backward compatibility stubs.
* **Exported API:**
  * `AudioAnalyzer` (class):
    * `constructor()`
    * `getSemitoneLevels()`: Returns an empty array (stub).
    * `setAnalyserNode(newNode)`: No-op (stub).
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/audio/audioFilePlayer.js`

* **Purpose:** Defines `AudioFilePlayer` class for loading and playing audio files. Manages switching active audio source (microphone/file) and corresponding analysers.
* **Exported API:**
  * `AudioFilePlayer` (class):
    * `constructor(audioContext, globalState)`: Accepts `AudioContext` and the global state object `globalState`.
    * `initializeAudioPlayerControls()`: Initializes player control DOM elements and attaches event listeners.
    * `loadAudioFile(event)` (async): File input change handler. Loads and decodes the audio file, switches active source to file and disables microphone tracks.
    * `playAudio()`: Starts or resumes playback of the loaded file. Connects the source to the audio processing chain (`setupAudioProcessing`) and sets relevant analysers.
    * `pauseAudio()`: Pauses playback.
    * `stopAudio()`: Stops playback, resets player state and switches active source back to microphone, re-enabling mic tracks.
* **Key dependencies:**
  * `../core/init.js` (for `state`)
  * `./audioProcessing.js` (for `getAudioContext`, `setupAudioProcessing`)
* **Interaction with `state`:**
  * Reads: `state.multimodal.currentStream`, `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.audio.filePlayerAnalysers`, `state.audio.microphoneAnalysers`, `state.audio.audioContext`.
  * Writes: `state.audio.audioContext` (if needed), `state.audio.activeSource`, `state.audio.filePlayerGainNode`, `state.audio.filePlayerAnalysers`, `state.multimodal.currentStream` (toggles track `enabled`). Calls `setAnalyserNode` on `AudioAnalyzer` instances in `state`.

## `js/audio/audioProcessing.js`

* **Purpose:** Manages the `AudioContext` and sets up the audio processing chain using an `AudioWorkletNode` for analysis via WASM. Responsible for loading `waveletAnalyzer.js` as an AudioWorklet module and relaying data to the main thread.
* **Exported API:**
  * `setupAudioProcessing(sourceNode, type)` (async function): Loads the AudioWorklet (`waveletAnalyzer.js`), creates an `AudioWorkletNode` (`'cwt-processor'`), initializes it and connects the `sourceNode`. Accepts an `AudioNode` (source) and `type` (`'file'` or `'microphone'`).
  * `getAudioContext()` (function): Returns or creates/resumes the global `AudioContext`.
* **Key dependencies:**
  * `../core/init.js` (for `state`)
  * `../audio/waveletAnalyzer.js` (loaded as an AudioWorklet)
* **Interaction with `state`:**
  * Reads: `state.audio.audioContext`, `state.audio.targetFrequencies`.
  * Writes: `state.audio.audioContext`, `state.audio.currentDbLevels`, `state.audio.currentPanAngles`, `state.audio.filePlayerGainNode`, `state.audio.cwtProcessorNodeFile`, `state.audio.microphoneGainNode`, `state.audio.cwtProcessorNodeMicrophone`, `state.audio.audioSource`, `state.audio.activeSource`. Receives `currentDbLevels` and `currentPanAngles` from the `AudioWorkletNode` via `postMessage`.

## `js/audio/audioVisualizer.js`

* **Purpose:** Links audio analysis to the 3D visualization. **This module is deprecated; main visualization animation logic (`animateAudioVisuals`) was moved to `rendering.js`. The module refers to the legacy `AudioAnalyzer` and is used to bind analyser instances and renderer from global state.**
* **Exported API:**
  * `initAudioVisualization()` (function): Checks for analyser and renderer instances in `state` and sets a local reference to `hologramRendererInstance`.
* **Key dependencies:**
  * `./audioAnalyzer.js` (imports deprecated `AudioAnalyzer`)
  * `../3d/hologramRenderer.js` (imports `HologramRenderer`)
  * `../core/init.js` (for `state`)
* **Interaction with `state`:** Reads `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.hologramRendererInstance`.

## `js/audio/cwt_analyzer.js`

* **Purpose:** Defines `CWTAnalyzer` class for audio analysis using Continuous Wavelet Transform (CWT) via WebAssembly. **Currently contains conceptual structure and stubs; class export is commented out.**
* **Exported API:** None (planned export: `CWTAnalyzer` class with methods `constructor(wasmInstance)`, `performCWT(audioDataFloat32Array)`).
* **Key dependencies:**
  * (Expected) WebAssembly module (e.g., `../wasm/src/audio_analyzer_rs/pkg/audio_analyzer_rs.js`).
* **Interaction with `state`:** None.

## `js/audio/microphoneManager.js`

* **Purpose:** Defines `MicrophoneManager` class to manage microphone access, obtain audio streams and connect to the processing chain via `AudioWorklet`.
* **Exported API:**
  * `MicrophoneManager` (class):
    * `constructor(audioContext, state, fftSize, smoothingTimeConstant)`: Accepts `AudioContext`, the global `state`, and optional analyser parameters.
    * `initializeWithStream(stream, appStateParam)` (async): Initializes audio graph with an existing `MediaStream` (from `getUserMedia`). Connects the stream to a `ChannelSplitter` (for stereo) or directly to `setupAudioProcessing` via an `AudioWorklet`.
    * `init()` (async): Requests microphone access via `getUserMedia` and calls `initializeWithStream`.
    * `stop()`: Stops microphone stream and disconnects audio nodes.
    * `destroy()`: Stops microphone and removes visibility-change listeners.
    * `getAudioContext()`: Returns the `AudioContext`.
    * `toggleMicrophone()` (async): Toggles microphone on/off, updates UI and switches `state` active audio source.
* **Key dependencies:**
  * `../config/hologramConfig.js` (for `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`)
  * `./audioProcessing.js` (for `setupAudioProcessing`)
* **Interaction with `state`:**
  * Receives `state` in the constructor and in `initializeWithStream`.
  * Reads: `state.uiElements.buttons.microphoneButton`, `state.audio.activeSource`.
  * Writes: `state.audio.audioContext`, `state.audio.microphoneStream`, `state.audio.activeSource`.

## `js/audio/speechInput.js`

* **Purpose:** Implements speech recognition via the Web Speech API to input text into chat. Manages mic button state and switches UI to chat mode when activated.
* **Exported API:**
  * `initializeSpeechInput(state)` (function): Initializes Web Speech API, obtains DOM references from `state` and sets listeners. Returns `true` on success, `false` otherwise.
  * `isRecognitionActive()` (function): Returns current recognition activity state.
* **Key dependencies:** None direct.
* **Interaction with `state`:**
  * Accepts `state` as a parameter.
  * Reads: `state.uiElements.buttons.micButton`, `state.uiElements.inputs.chatInput`, `state.uiElements.actions.submitChatMessage`, `state.uiElements.buttons.triaButton`.

## `js/audio/waveletAnalyzer.js`

* **Purpose:** Defines `CwtProcessor`, an `AudioWorkletProcessor` class that performs CWT analysis using WebAssembly inside the audio thread. It loads the WASM module `fastcwt_processor.js` and processes audio, sending results (volume levels and pan angles) back to the main thread.
* **Exported API:** Registers `CwtProcessor` via `registerProcessor('cwt-processor', CwtProcessor)`.
* **Key dependencies:**
  * `../wasm/fastcwt/fastcwt_processor.js` (for WASM functions `init`, `encode_audio_to_hologram`).
* **Interaction with `state`:** None direct. Communicates with the main thread (`audioProcessing.js`) via `port` (`postMessage` / `onmessage`).

## `js/ai/chat.js`

* **Purpose:** Handles chat logic and UI, including an interactive UI tour, sending messages to the backend (FastAPI or a public endpoint), and speech synthesis. Also formats messages (basic Markdown).
* **Exported API:**
  * `setupChat(appState)` (function): Initializes chat UI, obtains DOM references from `appState` and sets up input handlers.
  * `sendChatMessage(messageText)` (async function): Sends a user message to the backend, processes the response, manages tour state (if active) and displays the bot reply. Uses `fetch`.
  * `addMessageToChat(sender, message)` (function): Adds a formatted message to the chat UI and to the `chatMessages` array.
  * `chatMessages` (array): Chat message history.
* **Key dependencies:**
  * `./models.js` (for `getSelectedModel`)
  * `../core/init.js` (for `state` — passed as `appState`)
* **Interaction with `state` (passed as `appState`):**
  * Reads: `appState.uiElements.containers.chatMessages`, `appState.uiElements.inputs.chatInput`, `appState.uiElements.inputs.modelSelect`.
  * Does not modify `state` directly but uses it for DOM references and obtaining the selected model.

## `js/ai/models.js`

* **Purpose:** Manages selection and configuration of AI models (LLMs).
* **Exported API:**
  * `models` (object): Enumeration of available model IDs.
  * `modelMetadata` (object): Metadata for each model (name, description).
  * `getSelectedModel(modelSelectElement)` (function): Returns the currently selected model ID.
  * `setSelectedModel(model, modelSelectElement)` (function): Sets the selected model and saves it to `localStorage`.
  * `initializeModelSelector()` (function): Initializes the model selector UI (`#modelSelect`).
  * `selectedModel` (variable): The current model ID (exported, but prefer `getSelectedModel`).
* **Key dependencies:** None.
* **Interaction with `state`:** None. Uses `localStorage`.

## `js/ai/prompts.js`

* **Purpose:** Manages sending structured prompts to a backend endpoint (`/prompt`). Handles inserting text into the main prompt input, processing backend responses, showing statuses and optionally applying changes to the hologram, including UI versioning.
* **Exported API:**
  * `initializePrompts(passedState)` (function): Initializes prompt system. Accepts application state object (`passedState`).
  * `sendPrompt(promptText, passedState)` (async function): Sends a prompt to backend, processes the response, updates version UI. Accepts prompt text and `passedState`.
  * `insertTextIntoPrompt(text, passedState)` (function): Inserts text into the main prompt input. Accepts text and `passedState`.
* **Key dependencies:**
  * `./models.js` (for `getSelectedModel`)
  * `axios` (globally, for `/prompt` and `/branches` requests)
* **Interaction with `state` (passed as `passedState`):**
  * Reads: `passedState.uiElements.inputs.topPromptInput`, `passedState.uiElements.inputs.modelSelect`, `passedState.currentBranch`, `passedState.hologramVersions`, `passedState.currentVersion`, `passedState.uiElements.containers.versionFrames`.
  * Writes: `passedState.uiElements.inputs.topPromptInput.value`, `passedState.currentVersion`, `passedState.hologramVersions` (on version creation).

## `js/ai/tria.js`

* **Purpose:** Manages configuration and some UI aspects related to the Tria AI, including training mode. Initializes model selector and Tria UI.
* **Exported API:**
  * `triaConfig` (object): Tria configuration (API URL, version, model parameters).
  * `initializeTria(state)` (function): Initializes model selector and Tria UI. Accepts global `state`.
  * `getTriaUsageStats()` (async function): Stub for fetching Tria usage stats from the backend.
  * `toggleTriaLearningMode(triaButton, modelSelect, state)` (function): Toggles Tria learning mode and updates UI.
* **Key dependencies:**
  * `./models.js` (for `initializeModelSelector`)
* **Interaction with `state`:**
  * Accepts `state` in `initializeTria` and `toggleTriaLearningMode`.
  * Reads: `state.uiElements.labels.triaVersion`, `state.tria.isLearningActive`.
  * Writes: `state.tria.isLearningActive`.

## `js/ai/tria_mode.js`

* **Purpose:** Manages the "Tria Mode", redirecting requests to `/chat` when active. Initializes the Tria mode toggle button.
* **Exported API:**
  * `isTriaModeActive()` (function): Returns `true` if Tria mode is active (reads `state.isTriaModeActive`).
  * `initializeTriaMode()` (function): Initializes `#triaButton` and its state for toggling mode. Adds a click listener that toggles `state.isTriaModeActive`.
  * `applyPromptWithTriaMode(prompt, model)` (async function): Sends prompt to `/chat` if Tria mode is active; otherwise returns `false` so main code proceeds with normal logic. Manages loading indicators and disables the send button while processing.
* **Key dependencies:**
  * `../core/init.js` (for `state`).
* **Interaction with `state`:** Reads and writes `state.isTriaModeActive`. Also reads `state.uiElements.inputs.topPromptInput` and `state.uiElements.inputs.modelSelect` indirectly via `applyPrompt` in `domEventHandlers.js`.

## `js/config/hologramConfig.js`

* **Purpose:** Defines and exports configuration constants and data for hologram visualization, including color, audio, grid and scale parameters. Also generates the `semitones` array.
* **Exported API:**
  * Constants: `START_HUE`, `END_HUE`, `SATURATION`, `LIGHTNESS`, `BASE_FREQUENCY`, `NOTES_PER_OCTAVE`, `STARTING_OCTAVE`, `NOTES` (array), `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`, `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`, `HOLOGRAM_REFERENCE_HEIGHT`.
  * `degreesToCells(index)` (function): Computes visual column width based on an index.
  * `semitones` (array): Array of objects describing each semitone/column (frequency, width, color, etc.).
* **Key dependencies:**
  * `three` (imported directly).
* **Interaction with `state`:** None.

## `js/config/hologramConstants.js`

* **Purpose:** Generates and exports the `semitones` array. **Note: This module largely duplicates functionality in `js/config/hologramConfig.js`, which is the preferred and more complete source. This file is likely deprecated and may be merged or removed.**
* **Exported API:**
  * `semitones` (array, default export): Array of objects describing each semitone/column.
* **Key dependencies:**
  * `three` (imported directly).
* **Interaction with `state`:** None.

## `js/gestures/detection.js`

* **Purpose:** Intended for implementing gesture detection logic. (Currently contains a stub function.)
* **Exported API:**
  * `initializeGestureDetection()` (function): Stub that logs a warning.
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/multimodal/handsTracking.js`

* **Purpose:** Integrates MediaPipe Hands for hand tracking, manages video stream and presents results in 2D and 3D. Uses `GestureIntentClassifier` to interpret gestures and `webSocketService` to send intents.
* **Exported API:**
  * `startVideoStream(videoElement, handsInstance, stream)` (async function): Starts or reuses an existing video stream for MediaPipe.
  * `initializeMediaPipeHands()` (function): Initializes MediaPipe Hands, sets up callbacks and starts video stream.
  * `stopVideoStream()` (function): Stops the video stream and cleans up MediaPipe resources.
* **Key dependencies:**
  * `@mediapipe/hands`
  * `@mediapipe/camera_utils`
  * `../core/init.js` (for `state`)
  * `../core/eventBus.js`
  * `../ui/layoutManager.js` (for `updateHologramLayout`)
  * `../ai/gestureIntentClassifier.js`
  * `../services/websocketService.js`
* **Interaction with `state`:**
  * Reads: `state.config`, `state.renderer`, `state.multimodal.videoElementForHands`, `state.multimodal.handsInstance`, `state.multimodal.cameraInstance`, `state.multimodal.gestureCanvasCtx`, `state.multimodal.gestureCanvas`, `state.gestureIntentClassifier`, `state.webAudioEngine`, `state.webAudioEngine.isInitialized`.
  * Writes: `state.multimodal.currentStream`, `state.multimodal.cameraInstance`, `state.multimodal.isGestureCanvasReady`, `state.multimodal.handsInstance`, `state.gestureIntentClassifier`, `state.multimodal.lastHandData`, `state.multimodal.handsVisible`.

## `js/multimodal/voice_input.js`

* **Purpose:** Defines `VoiceInputManager` class for Web Speech API speech recognition. **Currently provides a basic structure and stubs; class export is commented out.**
* **Exported API:** None (planned export: `VoiceInputManager` class with methods `constructor()`, `startRecognition()`, `stopRecognition()`, `getFinalTranscript()`).
* **Key dependencies:** None.
* **Interaction with `state`:** None.

## `js/panels/chatMessages.js`

* **Purpose:** Manages display of chat messages (`#chatMessages`) and provides a `speak` function for text-to-speech. Each message has a button to copy its content into the main prompt input.
* **Exported API:**
  * `initializeChatDisplay()` (function): Initializes chat DOM references (`#chatMessages`, `#topPromptInput`).
  * `addMessageToChat(sender, message)` (function): Adds a formatted message to the chat UI with an "Insert into Prompt" button. Uses `textContent` for safety.
  * `speak(text)` (function): Speaks provided text using Web Speech API, preferring a Russian voice and handling voice loading.
* **Key dependencies:**
  * `./rightPanelManager.js` (for `toggleModeInternal`).
* **Interaction with `state`:** None.

## `js/panels/rightPanelManager.js`

* **Purpose:** Manages switching between content modes in the right panel UI, primarily between 'Timeline' and 'Chat' modes.
* **Exported API:**
  * `initializeRightPanel(appState)` (function): Initializes right panel DOM references from `appState.uiElements` and attaches a chat button handler. Returns `true` on success, `false` otherwise.
  * `switchToChatMode()` (function): Programmatically switches the panel to chat mode.
  * `getCurrentMode()` (function): Returns current active mode ('chat', 'timeline') or 'unknown'.
  * `toggleModeInternal()` (function): Internal helper to toggle modes. Manages visibility and autofocus.
* **Key dependencies:** None direct; uses DOM APIs.
* **Interaction with `state` (passed as `appState`):**
  * Accepts `appState` in `initializeRightPanel`.
  * Reads: `appState.uiElements.buttons.chatButton`, `appState.uiElements.actions.submitTopPrompt`, `appState.uiElements.actions.submitChatMessage`, `appState.uiElements.versionTimeline`, `appState.uiElements.chatHistory`, `appState.uiElements.inputs.topPromptInput`, `appState.uiElements.inputs.chatInput`, `appState.uiElements.containers.promptBar`, `appState.uiElements.containers.chatInputBar`, `appState.uiElements.indicators.loadingIndicator`.

## `js/platforms/desktop/desktopInput.js`

* **Purpose:** Defines `DesktopInput` class to initialize and manage desktop-specific input event handlers. Also initializes many other key modules by passing them the global state.
* **Exported API:**
  * `DesktopInput` (class, default export):
    * `constructor(globalState)`: Accepts the global state object.
    * `initialize()`: Sets up keyboard, mouse and general button listeners. Calls init functions for `prompts`, `versionManager`, `chat`, `speechInput`, `tria`, `resizeHandler`, `hammerGestures`, `rightPanelManager`, `fileEditor`.
    * `setupKeyboardListeners()`: Sets up listeners for main prompt input and send button.
    * `setupMouseListeners()`: Sets up listeners for GitHub button, modal close buttons and send prompt button in modals.
    * `setupGeneralButtonListeners()`: Sets up listeners for file switching buttons, fullscreen, audio file upload, microphone, play/pause/stop audio, and placeholders for camera, gesture recording, scanning and Bluetooth buttons.
* **Key dependencies:**
  * `../../core/domEventHandlers.js` (for `applyPrompt`)
  * `../../utils/fullscreen.js` (for `toggleFullscreen`, `initFullscreenListeners`)
  * `../../ai/prompts.js` (for `initializePrompts`)
  * `../../ui/versionManager.js` (for `initializeVersionManager`)
  * `../../ai/chat.js` (for `setupChat`)
  * `../../audio/speechInput.js` (for `initializeSpeechInput`)
  * `../../ai/tria.js` (for `initializeTria`)
  * `../../core/resizeHandler.js` (for `initializeResizeHandler`)
  * `../../core/gestures.js` (for `initializeHammerGestures`)
  * `../../panels/rightPanelManager.js` (for `initializeRightPanel`)
  * `../../ui/fileEditor.js` (for `initializeFileEditor`)
* **Interaction with `state`:**
  * Receives `globalState` in the constructor and passes it to many modules during initialization.
  * Reads: `this.state.audioFilePlayer`, `this.state.microphoneManager` to call their methods.

## `js/platforms/desktop/desktopLayout.js`

* **Purpose:** Defines `DesktopLayout` class for managing layout and visibility of main UI panels on desktop. Initializes panel state from `localStorage` and handles toggling.
* **Exported API:**
  * `DesktopLayout` (class, default export):
    * `constructor(state)`: Accepts the global `state`.
    * `initialize()`: Initializes panel DOM references from `state.uiElements`, sets initial state and attaches click listener for panel toggle.
    * `initializeMainPanelState()`: Sets initial panel visibility from `localStorage` and calls `updateHologramLayout`.
    * `toggleMainPanels()`: Toggles left/right panels, updates toggle button class and saves state to `localStorage`. Calls `updateHologramLayout`.
* **Key dependencies:**
  * `../../ui/layoutManager.js` (for `updateHologramLayout`)
* **Interaction with `state`:**
  * Accepts `state` in the constructor.
  * Reads: `state.uiElements.leftPanel`, `state.uiElements.rightPanel`, `state.uiElements.togglePanelsButton`.
  * Does not modify `state` directly, uses it to access DOM elements and passes it to `updateHologramLayout`. Uses `localStorage` for persistence.

## `js/platforms/mobile/mobileInput.js`

* **Purpose:** Defines `MobileInput` class for mobile-specific input handling, including initializing multimedia on first interaction.
* **Exported API:**
  * `MobileInput` (class):
    * `constructor()`
    * `initialize()`: Initializes all listeners.
    * `setupTouchListeners()`: Configures touch listeners (e.g., for `#gesture-area`).
    * `setupFirstInteractionListener()`: Sets up a first interaction listener to trigger `initializeMultimedia`.
* **Key dependencies:**
  * `../../core/init.js` (for importing `state`, though direct usage may be limited)
  * `../../core/mediaInitializer.js` (for `initializeMultimedia`)
* **Interaction with `state`:** Indirect via `initializeMultimedia`.

## `js/platforms/mobile/mobileLayout.js`

* **Purpose:** Defines `MobileLayout` class for mobile UI layout management, including panel visibility and adapting the gesture area to screen orientation. Initializes panel state and handles orientation changes.
* **Exported API:**
  * `MobileLayout` (class, default export):
    * `constructor(state)`: Accepts the global `state`.
    * `initialize()`: Initializes references to panel and gesture area elements from `state.uiElements`, sets initial state and adds a click listener for panel toggle.
    * `initializeMainPanelState()`: Sets initial visibility (left visible, right hidden) and calls `updateHologramLayout`.
    * `toggleMainPanels()`: Toggles left panel visibility.
    * `initializeGestureArea()`: Sets up handlers for gesture area, including orientation and resize listeners.
    * `handleOrientationChange()`: Updates CSS classes (`portrait`/`landscape`) for the gesture area on orientation change.
* **Key dependencies:**
  * `../../ui/layoutManager.js` (for `updateHologramLayout`)
* **Interaction with `state`:**
  * Accepts `state` in the constructor.
  * Reads: `state.uiElements.leftPanel`, `state.uiElements.rightPanel`, `state.uiElements.togglePanelsButton`, `state.uiElements.gestureArea`.
  * Does not modify `state` directly, uses it to access DOM elements and passes it to `updateHologramLayout`.

## `js/platforms/xr/xrInput.js`

* **Purpose:** Defines `XrInput` class for handling WebXR input. **Currently a stub with basic structure and console logs.**
* **Exported API:**
  * `XrInput` (class, default export):
    * `constructor(state)`: Accepts the global `state`.
    * `initialize()`: Initializes XR input handlers (stub).
    * `setupXrControllerListeners()`: Stub for controller listeners.
* **Key dependencies:** None direct (expected WebXR Device API usage).
* **Interaction with `state`:** Receives `state` in constructor but does not interact directly in current implementation.

## `js/platforms/xr/xrLayout.js`

* **Purpose:** Defines `XrLayout` class for managing XR UI layout. **Currently a stub with basic structure and console logs.**
* **Exported API:**
  * `XrLayout` (class, default export):
    * `constructor(appState)`: Accepts application state `appState`.
    * `initialize()`: Stub for XR layout initialization.
    * `toggleMainPanels()`: Stub for toggling panels in XR.
* **Key dependencies:** None direct (expected use of WebXR Device API and Three.js).
* **Interaction with `state`:** Accepts `appState` but does not interact directly in current implementation.
