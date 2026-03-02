// frontend/js/platforms/xr/xrLayout.js
// XR layout management - using desktop logic for now

import { updateHologramLayout } from '../../ui/layoutManager.js';
import eventBus from '../../core/eventBus.js';

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
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        this.initializeMainPanelState();

        if (this.togglePanelsButtonElement) {
            console.log('[XrLayout] Adding click listener to togglePanelsButton');
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }

        // Subscribe to EventBus for XR session lifecycle
        this._setupEventBusSubscriptions();

        console.log("XrLayout initialized.");
    }

    /**
     * Sets up EventBus subscriptions for XR session events.
     */
    _setupEventBusSubscriptions() {
        // Handle XR session start - hide 2D panels for immersive mode
        eventBus.on('xr:sessionStart', () => {
            console.log('[XrLayout] XR session started - hiding 2D panels');
            this._enterImmersiveMode();
        });

        // Handle XR session end - restore 2D panels
        eventBus.on('xr:sessionEnd', () => {
            console.log('[XrLayout] XR session ended - restoring 2D panels');
            this._exitImmersiveMode();
        });
    }

    /**
     * Enters immersive VR mode - hides 2D UI panels.
     */
    _enterImmersiveMode() {
        if (this.leftPanelElement) {
            this.leftPanelElement.classList.add('xr-hidden');
        }
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.add('xr-hidden');
        }
        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.classList.add('xr-hidden');
        }
    }

    /**
     * Exits immersive VR mode - restores 2D UI panels to previous state.
     */
    _exitImmersiveMode() {
        if (this.leftPanelElement) {
            this.leftPanelElement.classList.remove('xr-hidden');
        }
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('xr-hidden');
        }
        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.classList.remove('xr-hidden');
        }
        // Restore to localStorage state
        this.initializeMainPanelState();
    }


    initializeMainPanelState() {
        const storedState = localStorage.getItem('panelsHidden');
        // Default to VISIBLE (false) if no state is stored (first visit) or if explicitly false
        const panelsShouldBeHidden = storedState === 'true';
        // If storedState is null, it defaults to false, which is what we want for desktop.

        console.log('[XrLayout] panelsShouldBeHidden:', panelsShouldBeHidden, '(from storage:', storedState, ')');
        if (this.leftPanelElement && this.rightPanelElement && this.togglePanelsButtonElement) {
            if (panelsShouldBeHidden) {
                this.leftPanelElement.classList.remove('visible');
                this.rightPanelElement.classList.remove('visible');

                // Add hidden class for desktop support
                this.leftPanelElement.classList.add('hidden');
                this.rightPanelElement.classList.add('hidden');

                this.togglePanelsButtonElement.classList.add('show-mode');
                this.togglePanelsButtonElement.title = 'Показать панели';
            } else {
                this.leftPanelElement.classList.add('visible');
                this.rightPanelElement.classList.add('visible');

                // Remove hidden class
                this.leftPanelElement.classList.remove('hidden');
                this.rightPanelElement.classList.remove('hidden');

                this.togglePanelsButtonElement.classList.remove('show-mode');
                this.togglePanelsButtonElement.title = 'Скрыть панели';
            }
            console.log(`[XrLayout] Panels initialized from localStorage. Hidden: ${panelsShouldBeHidden}`);
            console.log('[XrLayout] leftPanel has visible after init:', this.leftPanelElement.classList.contains('visible'));
        } else {
            console.warn("[XrLayout] Panel elements not fully available for state initialization.");
        }
        updateHologramLayout(this.state);

        // Initial update of renderer size and centering based on loaded state
        if (this.state.updateRendererSize) {
            const shouldCenter = panelsShouldBeHidden; // If hidden on init, center it
            this.state.updateRendererSize(shouldCenter);
        }
    }

    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('[XrLayout] Panel elements not initialized before toggle.');
            return;
        }

        const arePanelsCurrentlyVisible = this.leftPanelElement.classList.contains('visible');
        console.log(`[XrLayout][toggleMainPanels] Panels currently visible (before toggle): ${arePanelsCurrentlyVisible}`);

        if (arePanelsCurrentlyVisible) {
            // Hide panels
            this.leftPanelElement.classList.remove('visible');
            this.rightPanelElement.classList.remove('visible');
            this.leftPanelElement.classList.add('hidden');
            this.rightPanelElement.classList.add('hidden');
            this.togglePanelsButtonElement.classList.add('show-mode');
            this.togglePanelsButtonElement.title = 'Показать панели';
        } else {
            // Show panels
            this.leftPanelElement.classList.add('visible');
            this.rightPanelElement.classList.add('visible');
            this.leftPanelElement.classList.remove('hidden');
            this.rightPanelElement.classList.remove('hidden');
            this.togglePanelsButtonElement.classList.remove('show-mode');
            this.togglePanelsButtonElement.title = 'Скрыть панели';
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
