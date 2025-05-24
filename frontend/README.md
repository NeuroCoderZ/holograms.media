# Holographic Media Frontend

This directory contains all client-side code for the Holographic Media project,
responsible for rendering holograms, handling user interactions, and communicating with the backend.

## Key Subdirectories

-   **/js**: Contains all JavaScript modules.
    -   **/3d**: Core 3D rendering logic.
        -   **/webgpu**: WebGPU specific rendering components for high-performance graphics.
    -   **/ai**: Client-side components related to Tria AI interaction.
    -   **/audio**: Audio processing, playback, and analysis (including CWT via WASM).
    -   **/core**: Core application logic, state management, event handling.
    -   **/gestures**: Gesture processing (currently relies on `multimodal/handsTracking.js`).
    -   **/multimodal**: Handling of diverse input methods like hand tracking (MediaPipe) and voice.
    -   **/panels**: UI components for different informational panels.
    -   **/ui**: General UI management and components.
    -   **/utils**: Utility functions.
    -   **/wasm**: WebAssembly modules (and their Rust/C++ source) for performance-intensive tasks.
        -   **/src**: Source code for WASM modules (e.g., Rust, C++).
    -   **/xr**: WebXR integration for VR/AR experiences.
-   **/css**: (Assumed, or link to `style.css` if flat) Stylesheets.
-   **/assets**: (Assumed) Static assets like images, 3D models (not holograms themselves).
-   `index.html`: Main HTML entry point.
-   `manifest.json`: Web application manifest.

## Core Technologies
- Vanilla JavaScript (ES6 Modules)
- Three.js (current primary 3D library)
- WebGPU (for future high-performance rendering)
- WebXR (for immersive experiences)
- WebAssembly (Rust/C++) for performance-critical tasks
- MediaPipe (for hand tracking)
- Web Speech API (for voice input)

## TODO
- Fully implement WebGPU rendering pipeline.
- Complete WebXR session management and input handling.
- Build and integrate WASM modules for audio analysis and physics.
- Develop advanced multimodal fusion techniques.
- Refine UI components and state management.
- Expand test coverage.
