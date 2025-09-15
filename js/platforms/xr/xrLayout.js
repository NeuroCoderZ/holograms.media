// frontend/js/platforms/xr/xrLayout.js
// XR layout management - using desktop logic for now

import { updateHologramLayout } from '../../ui/layoutManager.js';

export default class XrLayout {
    constructor(state) { // Accept global state object
        this.state = state; // Store global state
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;
        console.log("XrLayout instantiated.");
    }

    initialize() {
        console.log("[XrLayout] Initializing...");
        console.log("[XrLayout] Received state:", this.state);
        console.log("[XrLayout] localStorage panelsHidden:", localStorage.getItem('panelsHidden'));

        // Get elements from state.uiElements
        if (!this.state || !this.state.uiElements) {
            console.error('[CRITICAL ERROR][XrLayout] State or uiElements not available on initialization.');
            return; // Abort initialization
        }
        this.leftPanelElement = this.state.uiElements.leftPanel;
        this.rightPanelElement = this.state.uiElements.rightPanel;
        this.togglePanelsButtonElement = this.state.uiElements.togglePanelsButton;

        console.log('[XrLayout] togglePanelsButtonElement:', this.togglePanelsButtonElement);

        let criticalElementMissing = false;
        if (!this.leftPanelElement) {
            console.error('[CRITICAL ERROR][XrLayout] Left panel element (#left-panel) not found. Further initialization of XrLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.rightPanelElement) {
            console.error('[CRITICAL ERROR][XrLayout] Right panel element (#right-panel) not found. Further initialization of XrLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.togglePanelsButtonElement) {
            console.warn('[XrLayout] Toggle panels button element (#togglePanelsButton) not found. Panel toggling will not work.');
            // Depending on requirements, this might also be critical. For now, a warning.
            // If it should be critical, set criticalElementMissing = true and log an error.
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        this.initializeMainPanelState();

        // this.toggleMainPanels(); // First toggle - REMOVED to preserve localStorage state
        // this.toggleMainPanels(); // Second toggle - REMOVED FOR DEBUGGING
        // console.log("XrLayout: toggleMainPanels() called twice for debug.");

        if (this.togglePanelsButtonElement) {
            console.log('[XrLayout] Adding click listener to togglePanelsButton');
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("XrLayout initialized.");
    }

    initializeMainPanelState() {
        const panelsShouldBeHidden = localStorage.getItem('panelsHidden') === 'true';
        console.log('[XrLayout] panelsShouldBeHidden:', panelsShouldBeHidden);
        if (this.leftPanelElement && this.rightPanelElement && this.togglePanelsButtonElement) {
            if (panelsShouldBeHidden) {
                this.leftPanelElement.classList.remove('visible');
                this.rightPanelElement.classList.remove('visible');
                this.togglePanelsButtonElement.classList.add('show-mode');
            } else {
                this.leftPanelElement.classList.add('visible');
                this.rightPanelElement.classList.add('visible');
                this.togglePanelsButtonElement.classList.remove('show-mode');
                // Apply transparency and blur to panels
                this.leftPanelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                this.leftPanelElement.style.backdropFilter = 'blur(20px)';
                this.rightPanelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                this.rightPanelElement.style.backdropFilter = 'blur(20px)';
            }
            // Ensure old 'hidden' class (if it was ever used) is removed
            this.leftPanelElement.classList.remove('hidden');
            this.rightPanelElement.classList.remove('hidden');
              console.log(`[XrLayout] Panels initialized from localStorage. Hidden: ${panelsShouldBeHidden}`);
              console.log('[XrLayout] leftPanel has visible after init:', this.leftPanelElement.classList.contains('visible'));
        } else {
            console.warn("[XrLayout] Panel elements not fully available for state initialization.");
        }
        updateHologramLayout(this.state);
    }

    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('[XrLayout] Panel elements not initialized before toggle.');
            return;
        }

        const arePanelsCurrentlyVisible = this.leftPanelElement.classList.contains('visible');
        console.log(`[XrLayout][toggleMainPanels] Panels currently visible (before toggle): ${arePanelsCurrentlyVisible}`);

        // Toggle visibility classes
        this.leftPanelElement.classList.toggle('visible');
        this.rightPanelElement.classList.toggle('visible');
        this.togglePanelsButtonElement.classList.toggle('show-mode', arePanelsCurrentlyVisible); // show-mode means panels are now hidden

        // Apply transparency and blur to panels if visible
        if (this.leftPanelElement.classList.contains('visible')) {
            this.leftPanelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            this.leftPanelElement.style.backdropFilter = 'blur(20px)';
        }
        if (this.rightPanelElement.classList.contains('visible')) {
            this.rightPanelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            this.rightPanelElement.style.backdropFilter = 'blur(20px)';
        }

        const newState = this.leftPanelElement.classList.contains('visible') ? 'visible' : 'hidden';
        console.log(`[XrLayout][toggleMainPanels] Panels toggled. New state: ${newState}. leftPanel visible: ${this.leftPanelElement.classList.contains('visible')}`);
        console.log(`[XrLayout][toggleMainPanels] rightPanel classList after toggle:`, this.rightPanelElement.classList);
        console.log(`[XrLayout][toggleMainPanels] rightPanel has visible after toggle: ${this.rightPanelElement.classList.contains('visible')}`);

        try {
            localStorage.setItem('panelsHidden', (!this.leftPanelElement.classList.contains('visible')).toString()); // Store the *new* hidden state
        } catch (e) {
            console.error('[XrLayout] Error saving panel visibility to localStorage:', e);
        }
        console.log(`[XrLayout] Panels toggled. New state in localStorage: ${localStorage.getItem('panelsHidden')}`);

        const event = new CustomEvent('uiStateChanged', {
            detail: {
                component: 'mainPanels',
                newState: newState
            }
        });
        window.dispatchEvent(event);
        // Update renderer size and hologram position after toggle
        if (this.state.updateRendererSize) {
            this.state.updateRendererSize();
        }
    }

    getTogglePanelsButton() {
        return this.togglePanelsButtonElement;
    }
}
