// frontend/js/platforms/mobile/mobileLayout.js
// import { state } from '../../core/init.js'; // No longer needed, state is passed in constructor
// import { uiElements } from '../../ui/uiManager.js'; // Removed as uiElements will be passed via constructor
import { updateHologramLayout } from '../../ui/layoutManager.js';

export class MobileLayout {
    constructor(state) { // Accept global state object
        this.state = state; // Store global state
        this.leftPanelElement = null;
        this.rightPanelElement = null; // Keep reference for ensuring it's hidden
        this.togglePanelsButtonElement = null;
        this.gestureAreaElement = null;
        console.log("MobileLayout instantiated.");
    }

    initialize() {
        // Get elements from state.uiElements
        if (!this.state || !this.state.uiElements) {
            console.error('[CRITICAL ERROR][MobileLayout] State or uiElements not available on initialization.');
            return; // Abort initialization
        }
        this.leftPanelElement = this.state.uiElements.leftPanel;
        this.rightPanelElement = this.state.uiElements.rightPanel;
        this.togglePanelsButtonElement = this.state.uiElements.togglePanelsButton;
        this.gestureAreaElement = this.state.uiElements.gestureArea; // Corrected: gestureArea is a direct child of uiElements

        let criticalElementMissing = false;
        if (!this.leftPanelElement) {
            console.error('[CRITICAL ERROR][MobileLayout] Left panel element (#left-panel) not found in uiElements. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.togglePanelsButtonElement) {
            console.error('[CRITICAL ERROR][MobileLayout] Toggle panels button element (#togglePanelsButton) not found in uiElements. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }

        if (!this.rightPanelElement) {
            console.warn('[MobileLayout] Right panel element (#right-panel) not found in uiElements. This might be expected on mobile.');
        }

        if (!this.gestureAreaElement) {
            console.warn('[MobileLayout] Gesture area element (#gesture-area) not found in uiElements. Gesture area functionality might be affected.');
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        this.initializeMainPanelState();
        this.initializeGestureArea();

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("MobileLayout initialized.");
    }

    initializeMainPanelState() {
        this.leftPanelElement.classList.remove('visible');
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('visible');
        }
        this.togglePanelsButtonElement.classList.add('show-mode');

        this.leftPanelElement.classList.remove('hidden');
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('hidden');
        }

        if (typeof updateHologramLayout === 'function') updateHologramLayout();
        console.log(`[MobileLayout] Panels initialized. Defaulting to hidden.`);
    }

    toggleMainPanels() {
        const leftPanel = this.leftPanelElement; // Use stored reference
        if (leftPanel) {
            leftPanel.classList.toggle('visible');
            console.log(`Left panel visibility toggled. Is visible: ${leftPanel.classList.contains('visible')}`);
            // Removed: this.updateHologramLayout();
        }
    }

    // Gesture Area Logic (from gestureAreaManager.js)
    initializeGestureArea() {
        if (!this.gestureAreaElement) {
            console.warn('[MobileLayout] Gesture area element not found at initialization. Orientation styles might not apply correctly.');
            return;
        }

        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        window.addEventListener('resize', this.handleOrientationChange.bind(this));
        this.handleOrientationChange();

        console.log('[MobileLayout] Gesture area manager logic initialized.');
    }

    handleOrientationChange() {
        if (!this.gestureAreaElement) {
            console.warn('[MobileLayout] Gesture area element not found. Cannot handle orientation change.');
            return;
        }
        const isPortrait = window.innerHeight > window.innerWidth;
        this.gestureAreaElement.classList.toggle('portrait', isPortrait);
        this.gestureAreaElement.classList.toggle('landscape', !isPortrait);
        console.log(`[MobileLayout] Orientation changed. Portrait: ${isPortrait}`);
    }
}
