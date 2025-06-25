// import * as THREE from 'three'; // Removed for global THREE
import { updateHologramLayout } from '../../ui/layoutManager.js';

export default class DesktopLayout {
    constructor(state) { // Accept global state object
        this.state = state; // Store global state
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;
        console.log("DesktopLayout instantiated.");
    }

    initialize() {
        // Get elements from state.uiElements
        if (!this.state || !this.state.uiElements) {
            console.error('[CRITICAL ERROR][DesktopLayout] State or uiElements not available on initialization.');
            return; // Abort initialization
        }
        this.leftPanelElement = this.state.uiElements.leftPanel;
        this.rightPanelElement = this.state.uiElements.rightPanel;
        this.togglePanelsButtonElement = this.state.uiElements.togglePanelsButton;

        let criticalElementMissing = false;
        if (!this.leftPanelElement) {
            console.error('[CRITICAL ERROR][DesktopLayout] Left panel element (#left-panel) not found. Further initialization of DesktopLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.rightPanelElement) {
            console.error('[CRITICAL ERROR][DesktopLayout] Right panel element (#right-panel) not found. Further initialization of DesktopLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.togglePanelsButtonElement) {
            console.warn('[DesktopLayout] Toggle panels button element (#togglePanelsButton) not found. Panel toggling will not work.');
            // Depending on requirements, this might also be critical. For now, a warning.
            // If it should be critical, set criticalElementMissing = true and log an error.
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        this.initializeMainPanelState();

        this.toggleMainPanels(); // First toggle
        this.toggleMainPanels(); // Second toggle
        console.log("DesktopLayout: toggleMainPanels() called twice for debug.");

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("DesktopLayout initialized.");
    }

    initializeMainPanelState() {
        const panelsShouldBeHidden = localStorage.getItem('panelsHidden') === 'true';
        if (this.leftPanelElement && this.rightPanelElement && this.togglePanelsButtonElement) {
            if (panelsShouldBeHidden) {
                this.leftPanelElement.classList.remove('visible');
                this.rightPanelElement.classList.remove('visible');
                this.togglePanelsButtonElement.classList.add('show-mode');
            } else {
                this.leftPanelElement.classList.add('visible');
                this.rightPanelElement.classList.add('visible');
                this.togglePanelsButtonElement.classList.remove('show-mode');
            }
            // Ensure old 'hidden' class (if it was ever used) is removed
            this.leftPanelElement.classList.remove('hidden');
            this.rightPanelElement.classList.remove('hidden');
             console.log(`[DesktopLayout] Panels initialized from localStorage. Hidden: ${panelsShouldBeHidden}`);
        } else {
            console.warn("[DesktopLayout] Panel elements not fully available for state initialization.");
        }
        updateHologramLayout(this.state);
    }

    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('[DesktopLayout] Panel elements not initialized before toggle.');
            return;
        }

        const arePanelsCurrentlyVisible = this.leftPanelElement.classList.contains('visible');
        console.log(`[DesktopLayout][toggleMainPanels] Panels currently visible (before toggle): ${arePanelsCurrentlyVisible}`);

        // Toggle visibility classes
        this.leftPanelElement.classList.toggle('visible');
        this.rightPanelElement.classList.toggle('visible');
        this.togglePanelsButtonElement.classList.toggle('show-mode', arePanelsCurrentlyVisible); // show-mode means panels are now hidden

        const newState = this.leftPanelElement.classList.contains('visible') ? 'visible' : 'hidden';
        console.log(`[DesktopLayout][toggleMainPanels] Panels toggled. New state: ${newState}. leftPanel visible: ${this.leftPanelElement.classList.contains('visible')}`);

        try {
            localStorage.setItem('panelsHidden', (!this.leftPanelElement.classList.contains('visible')).toString()); // Store the *new* hidden state
        } catch (e) {
            console.error('[DesktopLayout] Error saving panel visibility to localStorage:', e);
        }
        console.log(`[DesktopLayout] Panels toggled. New state in localStorage: ${localStorage.getItem('panelsHidden')}`);

        const event = new CustomEvent('uiStateChanged', {
            detail: {
                component: 'mainPanels',
                newState: newState
            }
        });
        window.dispatchEvent(event);
        // setTimeout(() => window.dispatchEvent(new Event('resize')), 50); // Remove this
        if (typeof updateHologramLayout === 'function') updateHologramLayout(this.state); // Add this and pass state
    }
}
