# Holographic Media Frontend

This directory (`frontend/`) contains all client-side code for the Holographic Media project. It is responsible for rendering the 3D holograms, handling user interactions (UI, gestures, voice), and communicating with the Firebase backend (Cloud Functions, Authentication, Storage). The frontend is designed as a Single Page Application (SPA) and is deployed using **Firebase Hosting**.

## Structure Overview

-   **`index.html`**: The main HTML entry point for the application.
-   **`style.css`**: Main stylesheet for the application.
-   **`manifest.json`**: Web application manifest for PWA capabilities.
-   **`vite.config.js`**: Configuration for Vite, used as the frontend build tool and dev server. The output of the build (e.g., a `dist` folder within `frontend/`) is what should be deployed to Firebase Hosting. Ensure `firebase.json` (in the project root) has `hosting.public` pointing to this build output directory (e.g., `frontend/dist`).
-   **`/js`**: Contains all JavaScript modules, organized by feature/concern.
    -   **`main.js`**: The main entry point for JavaScript execution, orchestrates initialization of other modules.
    -   **`/core`**: Core application logic, including:
        -   `init.js`: Initializes the global state, Three.js scene, and core components.
        -   `auth.js`: Handles Firebase Authentication logic (sign-up, login, state observation).
        -   `eventBus.js`, `domEventHandlers.js`: Manage application-wide events and DOM interactions.
        -   `diagnostics.js`: For logging and debugging.
    -   **`/3d`**: Core 3D rendering logic.
        -   `sceneSetup.js`: Initializes the Three.js scene, camera, lights.
        -   `hologramRenderer.js`: Manages the rendering of the main hologram object.
        -   `rendering.js`: General rendering utilities and the main animation loop.
        -   `/webgpu` (R&D): Components for future WebGPU integration.
    -   **`/audio`**: Audio processing, playback, and analysis.
        -   `audioAnalyzer.js`: Microphone input, FFT analysis for audio-reactivity.
        -   `audioVisualizer.js`: Connects audio analysis to hologram visuals.
        -   `speechInput.js`: Integration with Web Speech API.
    -   **`/ui`**: General UI management and components.
        -   `uiManager.js`: Manages overall UI elements, interactions, and state.
        -   `panelManager.js`, `rightPanelManager.js`: Logic for specific UI panels.
        -   Modules for chat interaction (e.g., in `ai/` or `panels/`).
    -   **`/services`**: Modules for interacting with backend services.
        -   `apiService.js`: Handles HTTP requests to Firebase Cloud Functions.
        -   `firebaseStorageService.js`: Manages file uploads to Firebase Storage.
    -   **`/multimodal`**: Handling of diverse input methods.
        -   `handsTracking.js`: MediaPipe integration for hand tracking.
    -   **`/ai`**: Client-side logic related to Tria AI interaction (e.g., `tria.js`, `tria_mode.js`).
    -   **`/wasm`** (R&D): For future WebAssembly modules and their source (e.g. `/js/wasm/src`).
    -   **`/xr`** (R&D): For future WebXR integration.
    -   **`/panels`**, **`/config`**, **`/utils`**, **`/gestures`**: Other specialized modules as per the project structure.
-   **`/public`**: Static assets that are copied directly to the build output directory by Vite. `favicon.ico` is typically placed here.
-   **`robots.txt`**, **`sitemap.xml`**: Standard web files, typically placed in the `public/` directory for Vite to handle, or generated during the build.

## Core Technologies

-   **Vanilla JavaScript (ES6 Modules):** Primary language for application logic.
-   **HTML5, CSS3:** Standard web technologies.
-   **Three.js (using WebGL):** Current primary 3D library for hologram rendering (MVP).
-   **Vite:** Frontend build tool and development server.
-   **Firebase SDK for JavaScript:** Used for:
    -   Firebase Authentication (client-side).
    -   Firebase Storage (file uploads).
    -   Calling Firebase Cloud Functions (via their HTTP triggers, using `fetch` or a library in `apiService.js`).
-   **MediaPipe Hands:** For client-side real-time hand tracking.
-   **Web Speech API:** For voice input.
-   **WebGPU & WebXR:** Future R&D for enhanced performance and immersion.
-   **WebAssembly (Rust/C++):** Future R&D for performance-critical tasks.

## Local Development

1.  **Prerequisites:**
    *   Node.js and npm (or yarn) installed.
    *   Firebase CLI installed (`npm install -g firebase-tools`) and configured (`firebase login`).
    *   Firebase Local Emulator Suite running for backend services:
        ```bash
        firebase emulators:start --only functions,auth,storage,hosting
        # Add ,firestore if used by the backend
        ```
2.  **Install Dependencies:**
    *   Navigate to the root of the project (where the main `package.json` is located).
        ```bash
        npm install
        # or yarn install
        ```
3.  **Running the Frontend Development Server (Vite):**
    *   From the project root, run the Vite development server script defined in `package.json`:
        ```bash
        npm run dev
        # Or a specific script like 'npm run start:frontend' if defined.
        ```
    *   This will typically start a local server (e.g., on `http://localhost:5173`, check Vite output) with Hot Module Replacement (HMR).
    *   The frontend's `firebaseInit.js` (in `frontend/js/core/`) and `apiService.js` (in `frontend/js/services/`) should be configured to connect to the local Firebase Emulators when the app is not running in a production environment.

4.  **Firebase SDK Configuration for Emulators:**
    *   In `frontend/js/core/firebaseInit.js` (or a similar initialization file), ensure the Firebase SDK is configured to use the emulators when in a development environment. Example:
        ```javascript
        // import { initializeApp } from "firebase/app";
        // import { getAuth, connectAuthEmulator } from "firebase/auth";
        // import { getStorage, connectStorageEmulator } from "firebase/storage";
        // import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

        // const firebaseConfig = { /* your firebase config from Firebase console */ };
        // const app = initializeApp(firebaseConfig);
        // const auth = getAuth(app);
        // const storage = getStorage(app);
        // const functions = getFunctions(app, "your-functions-region"); // Specify region if not default

        // // Check if running locally and connect to emulators
        // if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        //   try {
        //     connectAuthEmulator(auth, "http://localhost:9099");
        //     connectStorageEmulator(storage, "localhost", 9199);
        //     connectFunctionsEmulator(functions, "localhost", 5001); // Ensure port matches your functions emulator port
        //     console.log("Firebase SDK connected to local emulators.");
        //   } catch (error) {
        //     console.error("Error connecting Firebase SDK to emulators: ", error);
        //   }
        // }
        ```

## Build & Deployment

-   **Build:**
    *   A build script (likely `npm run build` or `npm run build:frontend` in the root `package.json`) uses Vite to compile and bundle the frontend assets.
    *   The output directory (e.g., `frontend/dist/`) **must** match the `hosting.public` setting in the main `firebase.json` at the project root. For example, if Vite builds to `frontend/dist/`, then `firebase.json` should be updated to `hosting.public: "frontend/dist"`. (Currently, `firebase.json` has `hosting.public: "frontend"`. This implies Vite might be configured to output directly to `frontend` or that `firebase.json` needs an update if Vite uses a `dist` subfolder). **This configuration needs verification and alignment.**
-   **Deployment:**
    *   The frontend is deployed to **Firebase Hosting**.
    *   Deploy using the Firebase CLI from the project root:
        ```bash
        firebase deploy --only hosting
        ```

## Key Tasks & TODO (Frontend MVP Focus)

*   Ensure stable and performant audio-reactive hologram visualization on Firebase Hosting, using Three.js/WebGL.
*   Implement all UI elements and interactions for MVP features (Authentication, chunk upload, Tria chat, panel management) as defined in `ULTIMATE_ROAD_TO_MVP_JUNE_9.md`.
*   Thoroughly test frontend functionality across target browsers, including interactions with emulated and deployed Firebase services.
*   Refine client-side state management (e.g., using `frontend/js/core/stateManager.js` or a similar pattern).
*   Ensure seamless integration with Firebase Authentication, Firebase Storage (for uploads), and Firebase Cloud Functions (via `apiService.js`).
*   Manage client-side configuration for Firebase SDK and API endpoints effectively, distinguishing between development (emulator) and production environments.
*   **Verify and align Vite's build output directory with the `hosting.public` setting in the root `firebase.json`.**
