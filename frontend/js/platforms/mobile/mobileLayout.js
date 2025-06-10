// frontend/js/platforms/mobile/mobileLayout.js
import { state } from '../../core/init.js'; // For gestureArea
import { uiElements } from '../../ui/uiManager.js'; // Assuming uiManager still provides common UI elements if needed

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
        this.gestureAreaElement = state.uiElements?.containers?.gestureArea || document.getElementById('gesture-area');


        if (!this.leftPanelElement || !this.togglePanelsButtonElement) { // Right panel is optional for core logic here
            console.error('[MobileLayout] Could not find left panel or toggle button.');
            return;
        }

        this.initializeMainPanelState();
        this.initializeGestureArea();

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

        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        console.log(`[MobileLayout] Panels initialized. Defaulting to hidden.`);
    }

    toggleMainPanels() {
        if (!this.leftPanelElement || !this.togglePanelsButtonElement) {
            console.error('[MobileLayout] Panel elements not initialized before toggle.');
            return;
        }

        const isLeftPanelCurrentlyVisible = this.leftPanelElement.classList.contains('visible');

        this.leftPanelElement.classList.toggle('visible');

        // If right panel exists and might be visible, hide it explicitly on mobile when left is toggled.
        if (this.rightPanelElement && this.rightPanelElement.classList.contains('visible') && !isLeftPanelCurrentlyVisible) {
            // This case means left panel is about to become visible, ensure right is not.
            this.rightPanelElement.classList.remove('visible');
        }
        if (this.rightPanelElement && isLeftPanelCurrentlyVisible) {
             // This case means left panel is about to become hidden. Right should remain hidden.
            this.rightPanelElement.classList.remove('visible');
        }


        const newState = isLeftPanelCurrentlyVisible ? 'hidden' : 'visible';
        this.togglePanelsButtonElement.classList.toggle('show-mode', isLeftPanelCurrentlyVisible);

        try {
            // Reflects the state of the *left* panel primarily.
            localStorage.setItem('panelsHidden', isLeftPanelCurrentlyVisible.toString());
        } catch (e) {
            console.error('[MobileLayout] Error saving panel visibility to localStorage:', e);
        }
        console.log(`[MobileLayout] Left panel toggled. New state: ${newState}`);

        const event = new CustomEvent('uiStateChanged', {
            detail: {
                component: 'leftPanel',
                newState: newState
            }
        });
        window.dispatchEvent(event);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
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
