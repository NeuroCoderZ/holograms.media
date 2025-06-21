import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';
// File: frontend/js/xr/webxr_session_manager.js
// Purpose: Manages WebXR sessions, including entering and exiting VR/AR modes.
// Key Future Dependencies: WebXR Device API (browser), Three.js WebXRManager (if using Three).
// Main Future Exports/API: XRSessionManager class, startXRSession(), endXRSession().
// Link to Legacy Logic (if applicable): Evolves any existing XR toggling logic.
// Intended Technology Stack: JavaScript, WebXR.
// TODO: Check for WebXR support.
// TODO: Request appropriate XR session type (e.g., 'immersive-vr', 'immersive-ar').
// TODO: Handle session start, end, and visibility change events.
// TODO: Integrate with the main render loop (Three.js or WebGPU).

export class XRSessionManager { // Export the class
    constructor(renderer) { // renderer could be Three.js renderer or custom WebGPU renderer
        this.renderer = renderer; // This should be the Three.js WebGLRenderer
        this.xrSession = null;
        this.xrReferenceSpace = null;
        // TODO: Add other XR related properties
    }

    async startXRSession(sessionMode = 'immersive-vr') {
        if (!navigator.xr) {
            console.error("WebXR not supported.");
            return;
        }
        if (this.xrSession) {
            console.warn("XR session already active.");
            return;
        }

        try {
            // const session = await navigator.xr.requestSession(sessionMode); // Commented out
            console.log("[VR Disabled] XR session request was blocked as per current settings."); // Optional: Add a log
            return false; // Prevent further execution related to session starting

            // The following code will not be reached:
            // Associate the session with the Three.js renderer
            /*
            if (this.renderer && this.renderer.xr) {
                await this.renderer.xr.setSession(session);
                this.xrSession = session;

                session.addEventListener('end', () => {
                    this.renderer.xr.setSession(null);
                    this.xrSession = null;
                    console.log("WebXR session ended via session event.");
                });

                console.log(`WebXR session started in ${sessionMode} mode.`);
                return true;
            } else {
                console.error("Three.js renderer or its XR capabilities not available.");
                await session.end();
                return false;
            }
            */
        } catch (e) {
            // This catch block might still be relevant if other errors occur before the commented line
            console.error("Failed to start XR session (or error during disabled check):", e);
            return false;
        }
    }

    async endXRSession() {
        if (this.xrSession) {
            try {
                await this.xrSession.end();
                // The session 'end' event listener set up in startXRSession
                // should handle setting this.xrSession = null and renderer.xr.setSession(null).
                // If it doesn't, uncomment below:
                // this.xrSession = null;
                // if (this.renderer && this.renderer.xr) {
                //     this.renderer.xr.setSession(null);
                // }
                console.log("WebXR session explicitly ended.");
                return true;
            } catch (e) {
                console.error("Error ending XR session:", e);
                return false;
            }
        }
        return false;
    }

    isSessionActive() {
        return this.xrSession !== null;
    }

    async toggleXRSession(xrButtonElement, sessionMode = 'immersive-vr') {
        if (this.isSessionActive()) {
            const success = await this.endXRSession();
            if (success && xrButtonElement) {
                xrButtonElement.classList.remove('active');
                xrButtonElement.title = "Enter XR Mode";
            }
        } else {
            const success = await this.startXRSession(sessionMode);
            if (success && xrButtonElement) {
                xrButtonElement.classList.add('active');
                xrButtonElement.title = "Exit XR Mode";
            }
        }
    }
}
