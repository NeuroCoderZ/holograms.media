// frontend/js/platforms/mobile/mobileLayout.js
import { state } from '../../core/init.js'; // For gestureArea
import { uiElements } from '../../ui/uiManager.js'; // Assuming uiManager still provides common UI elements if needed
import { updateHologramLayout } from '../../ui/layoutManager.js';

export class MobileLayout {
    constructor() {
        this.leftPanelElement = null;
        this.rightPanelElement = null; // Keep reference for ensuring it's hidden
        this.togglePanelsButtonElement = null;
        this.gestureAreaElement = null;
        console.log("MobileLayout instantiated.");
    }

    initialize() {
        this.leftPanelElement = document.getElementById('left-panel');
        this.rightPanelElement = document.getElementById('right-panel');
        this.togglePanelsButtonElement = document.getElementById('togglePanelsButton');
        // Attempt to get gestureAreaElement from state first, then fallback to direct DOM query
        this.gestureAreaElement = state.uiElements?.containers?.gestureArea || document.getElementById('gesture-area');

        let criticalElementMissing = false;
        if (!this.leftPanelElement) {
            console.error('[CRITICAL ERROR][MobileLayout] Left panel element (#left-panel) not found. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.togglePanelsButtonElement) {
            // If toggle button is essential for mobile layout to function, make it critical
            console.error('[CRITICAL ERROR][MobileLayout] Toggle panels button element (#togglePanelsButton) not found. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }

        // Right panel is not strictly critical for mobile layout's core functionality (managing left panel and gesture area)
        // but we can log if it's missing.
        if (!this.rightPanelElement) {
            console.warn('[MobileLayout] Right panel element (#right-panel) not found. This might be expected on mobile.');
        }

        if (!this.gestureAreaElement) {
            console.warn('[MobileLayout] Gesture area element (#gesture-area) not found. Gesture area functionality might be affected.');
            // Depending on how critical gesture area is, this could also set criticalElementMissing = true
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        this.initializeMainPanelState();
        this.initializeGestureArea(); // This method also has its own checks for gestureAreaElement

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("MobileLayout initialized.");
    }

    initializeMainPanelState() {
        // On mobile, panels are hidden by default
        this.leftPanelElement.classList.remove('visible');
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('visible');
        }
        this.togglePanelsButtonElement.classList.add('show-mode');

        // Ensure old 'hidden' class is removed
        this.leftPanelElement.classList.remove('hidden');
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('hidden');
        }

        if (typeof updateHologramLayout === 'function') updateHologramLayout();
        console.log(`[MobileLayout] Panels initialized. Defaulting to hidden.`);
    }

    toggleMainPanels() {
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            leftPanel.classList.toggle('visible');
            console.log(`Left panel visibility toggled. Is visible: ${leftPanel.classList.contains('visible')}`);
            // Вызываем обновление layout после изменения панели
            this.updateHologramLayout();
        }
    }

    // Gesture Area Logic (from gestureAreaManager.js)
    initializeGestureArea() {
        if (!this.gestureAreaElement) {
            // Attempt to find it again if not available from state initially
            this.gestureAreaElement = document.getElementById('gesture-area');
            if (!this.gestureAreaElement) {
                console.warn('[MobileLayout] Gesture area element not found at initialization. Orientation styles might not apply correctly.');
                return;
            }
        }

        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        window.addEventListener('resize', this.handleOrientationChange.bind(this));
        this.handleOrientationChange(); // Call once at initialization

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
