// import * as THREE from 'three'; // Removed for global THREE
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

    async startXRSession(sessionMode = 'immersive-ar') {
        if (!navigator.xr) {
            console.error("WebXR not supported.");
            return false;
        }
        if (this.xrSession) {
            console.warn("XR session already active.");
            return false;
        }

        try {
            // Updated for Phase 3: Explicitly request 'local-floor' for stable holograms
            const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] };
            const session = await navigator.xr.requestSession(sessionMode, sessionInit);

            if (this.renderer && this.renderer.xr) {
                await this.renderer.xr.setSession(session);
                this.xrSession = session;

                // Handle Reference Space
                // 'local-floor' is best for standing experiences (hologram around user)
                // 'viewer' is fallback for basic 3DoF
                const refSpaceType = sessionMode === 'immersive-vr' ? 'local-floor' : 'local-floor';

                // We don't need to get reference space here explicitly for Three.js, 
                // Three.js manages it, but we can log or configure if needed.
                // The Session 'end' event handles cleanup.

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
        } catch (e) {
            console.error("Failed to start XR session:", e);
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
