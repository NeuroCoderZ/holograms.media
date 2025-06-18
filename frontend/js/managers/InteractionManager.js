// Manages user interactions like pan gestures for hologram rotation.

// import Hammer from 'hammerjs'; // Assuming Hammer can be imported
// HologramManager might be passed in, not necessarily in the same directory
// import HologramManager from './HologramManager';

class InteractionManager {
    constructor(rendererDomElement, hologramManager) {
        if (!rendererDomElement) {
            console.error("InteractionManager: renderer DOM element is required.");
            return;
        }
        if (!hologramManager) {
            console.error("InteractionManager: HologramManager instance is required.");
            return;
        }

        this.rendererDomElement = rendererDomElement;
        this.hologramManager = hologramManager;
        this.hammer = new Hammer(this.rendererDomElement);

        console.log("InteractionManager initialized");
        this.setupPanGestures();
    }

    setupPanGestures() {
        if (!this.hammer || !this.hologramManager || !this.hologramManager.hologramPivot) {
            console.error("Hammer.js, HologramManager, or hologramPivot not available for pan gesture setup.");
            return;
        }

        this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        let initialRotationX = 0;
        let initialRotationY = 0;

        this.hammer.on('panstart', (ev) => {
            // Store the initial rotation of the hologram's pivot when panning starts
            if (this.hologramManager.hologramPivot) {
                initialRotationX = this.hologramManager.hologramPivot.rotation.x;
                initialRotationY = this.hologramManager.hologramPivot.rotation.y;
            }
        });

        this.hammer.on('pan', (ev) => {
            if (!this.hologramManager.hologramPivot) return;

            // Calculate rotation based on deltaX and deltaY
            // Normalize delta values by dividing by element dimensions for consistent speed
            const deltaX = ev.deltaX / this.rendererDomElement.clientWidth;
            const deltaY = ev.deltaY / this.rendererDomElement.clientHeight;

            // Sensitivity factor: how much rotation per unit of swipe
            // A factor of Math.PI means a full swipe across the element dimension results in 180-degree rotation.
            const sensitivity = Math.PI;

            let newRotationY = initialRotationY + deltaX * sensitivity;
            let newRotationX = initialRotationX + deltaY * sensitivity; // Pan up/down for X-axis rotation

            // Clamp rotation to limits (e.g., +/- PI/2 or 90 degrees) as per plan
            const limit = Math.PI / 2;
            newRotationX = Math.max(-limit, Math.min(limit, newRotationX));
            newRotationY = Math.max(-limit, Math.min(limit, newRotationY));

            this.hologramManager.setRotation(newRotationX, newRotationY);
            // console.log(`Pan gesture: dX: ${ev.deltaX}, dY: ${ev.deltaY}, rotX: ${newRotationX.toFixed(2)}, rotY: ${newRotationY.toFixed(2)}`);
        });

        this.hammer.on('panend', (ev) => {
            // Call resetRotation on HologramManager, which will handle the animation
            this.hologramManager.resetRotation();
            console.log("Pan gesture ended, hologram rotation reset initiated.");
        });

        console.log("Pan gestures setup complete.");
    }

    destroy() {
        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
            console.log("InteractionManager destroyed, Hammer instance removed.");
        }
    }
}

// Export the class
export default InteractionManager;
