// Manages the hologram's position, scale, and adaptive behavior.

// import * as THREE from 'three'; // Removed for global THREE
// import TWEEN from '@tweenjs/tween.js'; // Removed for global TWEEN

// Assuming THREE and TWEEN are global
const { Group } = THREE;
const TWEEN = window.TWEEN;


// Assuming an EventBus class/instance is available and imported
// import EventBus from '../core/eventBus';
// Assuming AppState is also passed or imported if it's a singleton
// import AppState from '../core/stateManager';

class HologramManager {
    constructor(scene, camera, eventBus, state) { // appState changed to state
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        this.state = state; // appState changed to state

        this.hologramPivot = new THREE.Group();
        this.mainSequencerGroup = new THREE.Group();

        this.GRID_WIDTH = 130;
        this.GRID_HEIGHT = 260;

        console.log("HologramManager initialized");
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (!this.eventBus) {
            console.warn("HologramManager: EventBus not provided, cannot subscribe to hand or resize events.");
            return;
        }
        // Listen for hand presence events
        this.eventBus.on('handsDetected', (results) => this.handleHandPresence(true, results));
        this.eventBus.on('handsLost', () => this.handleHandPresence(false));

        // Listen for window resize events (assuming EventBus relays this or is handled by main app)
        // Alternatively, window.addEventListener('resize', this.handleResize.bind(this));
        // For now, assume main app will call handleResize or emit an event.
        // Let's add a direct subscription for simplicity here, can be refactored.
        window.addEventListener('resize', this.handleResize.bind(this));

        console.log("HologramManager initialized event listeners.");
    }

    handleHandPresence(present, results = null) {
        console.log(`HologramManager: Hand presence changed to ${present}. Updating layout.`);
        // The appState should have been updated by GestureUIManager already if it also listens.
        // Or, HologramManager can also update appState if it's the primary source of truth for this.
        // For now, we assume appState reflects the latest handsVisible status.
        this.updateLayout(present);
    }

    initializeHologram(mainVisualsGroup) {
        if (mainVisualsGroup) {
            this.mainSequencerGroup = mainVisualsGroup;
        }

        this.scene.add(this.hologramPivot);
        this.hologramPivot.add(this.mainSequencerGroup);
        this.mainSequencerGroup.position.set(0, -this.GRID_HEIGHT / 2, 0);
        this.hologramPivot.position.set(0, 0, 0);

        let initialHandsVisible = false;
        if (this.state) { // Check if state object exists
            initialHandsVisible = this.state.handsVisible || false;
        }
        this.updateLayout(initialHandsVisible);
        console.log(`Hologram initialized. Initial handsVisible state: ${initialHandsVisible}`);
    }

    calculateOptimalScale(containerWidth, availableHeightForHologram) {
        const targetContentWidth = containerWidth * 0.90;
        const hologramVisualWidth = this.GRID_WIDTH * 2;
        const hologramVisualHeight = this.GRID_HEIGHT;

        if (hologramVisualWidth <= 0 || hologramVisualHeight <= 0) {
            console.warn("Hologram visual dimensions are zero or invalid, cannot calculate scale.");
            return 0.1;
        }

        const widthScale = targetContentWidth / hologramVisualWidth;
        const heightScale = availableHeightForHologram / hologramVisualHeight;
        let scale = Math.min(widthScale, heightScale);
        scale = Math.max(scale, 0.1);
        return scale;
    }

    updateLayout(handsVisible) {
        console.log(`Updating layout. Current handsVisible state: ${handsVisible}`);

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        let leftPanelEl = null;
        let rightPanelEl = null;

        if (this.state && this.state.uiElements) {
            leftPanelEl = this.state.uiElements.leftPanel;
            rightPanelEl = this.state.uiElements.rightPanel;
        } else {
            console.warn("HologramManager: state.uiElements not available for panel width calculation. Falling back to querySelector.");
            leftPanelEl = document.querySelector('.panel.left-panel');
            rightPanelEl = document.querySelector('.panel.right-panel');
        }

        // Panel visibility is determined by 'visible' class in DesktopLayout, not 'hidden'
        // DesktopLayout removes 'hidden' and toggles 'visible'.
        // MobileLayout removes 'visible' by default.
        const leftPanelVisible = leftPanelEl && (leftPanelEl.classList.contains('visible') || (!leftPanelEl.classList.contains('hidden') && !leftPanelEl.classList.contains('visible') && getComputedStyle(leftPanelEl).display !== 'none'));
        const rightPanelVisible = rightPanelEl && (rightPanelEl.classList.contains('visible') || (!rightPanelEl.classList.contains('hidden') && !rightPanelEl.classList.contains('visible') && getComputedStyle(rightPanelEl).display !== 'none'));

        const leftPanelWidth = leftPanelVisible && leftPanelEl ? leftPanelEl.offsetWidth : 0;
        const rightPanelWidth = rightPanelVisible && rightPanelEl ? rightPanelEl.offsetWidth : 0;
        const panelWidths = leftPanelWidth + rightPanelWidth;

        const availableRenderWidth = windowWidth - panelWidths;
        let availableRenderHeight;
        let targetScale;
        let targetPositionY;

        const gestureAreaHeightVisible = windowHeight * 0.25;
        const gestureAreaHeightHidden = 4;

        if (handsVisible) {
            availableRenderHeight = windowHeight - gestureAreaHeightVisible;
            targetScale = 0.8;
            targetPositionY = windowHeight * 0.05;
        } else {
            availableRenderHeight = windowHeight - gestureAreaHeightHidden;
            if (availableRenderWidth <=0 || availableRenderHeight <=0) {
                 console.warn("Available render width or height is zero or negative. Cannot update layout.");
                 return;
            }
            targetScale = this.calculateOptimalScale(availableRenderWidth, availableRenderHeight);
            targetPositionY = 0;
        }

        // Stop any ongoing animations on the same properties to prevent conflicts
        TWEEN.remove(this.hologramPivot.scale_tween); // Assuming we store tweens like this
        TWEEN.remove(this.hologramPivot.position_tween);

        this.hologramPivot.scale_tween = new TWEEN.Tween(this.hologramPivot.scale)
            .to({ x: targetScale, y: targetScale, z: targetScale }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        this.hologramPivot.position_tween = new TWEEN.Tween(this.hologramPivot.position)
            .to({ y: targetPositionY }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => console.log("Hologram layout animation complete."))
            .start();

        console.log(`Hologram layout update initiated. Target Scale: ${targetScale.toFixed(2)}, Target Y: ${targetPositionY.toFixed(2)}`);
    }

    setRotation(x, y) {
        if (this.hologramPivot) {
            this.hologramPivot.rotation.x = x;
            this.hologramPivot.rotation.y = y;
            this.hologramPivot.rotation.z = 0;
        }
    }

    resetRotation() {
        if (this.hologramPivot) {
            TWEEN.remove(this.hologramPivot.rotation_tween);
            this.hologramPivot.rotation_tween = new TWEEN.Tween(this.hologramPivot.rotation)
                .to({ x: 0, y: 0, z: 0 }, 300)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
            console.log("Hologram rotation reset initiated.");
        }
    }

    handleResize() {
        console.log("HologramManager: Window resize detected.");
        let currentHandsVisible = false;
        if (this.state) { // Check if state object exists
            currentHandsVisible = this.state.handsVisible || false;
        }
        this.updateLayout(currentHandsVisible);
    }

    destroy() {
        if (this.eventBus) {
            this.eventBus.off('handsDetected', this.handleHandPresence);
            this.eventBus.off('handsLost', this.handleHandPresence);
        }
        window.removeEventListener('resize', this.handleResize.bind(this));
        // Stop any ongoing tweens associated with hologramPivot
        if (this.hologramPivot) {
            TWEEN.remove(this.hologramPivot.scale_tween);
            TWEEN.remove(this.hologramPivot.position_tween);
            TWEEN.remove(this.hologramPivot.rotation_tween);
        }
        console.log("HologramManager destroyed, events unsubscribed, tweens removed.");
    }
}

export default HologramManager;
