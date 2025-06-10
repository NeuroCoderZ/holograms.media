// frontend/js/platforms/desktop/desktopLayout.js
import { uiElements } from '../../ui/uiManager.js'; // Assuming uiManager still provides common UI elements if needed

export class DesktopLayout {
    constructor() {
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;
        console.log("DesktopLayout instantiated.");
    }

    initialize() {
        this.leftPanelElement = document.getElementById('left-panel');
        this.rightPanelElement = document.getElementById('right-panel');
        this.togglePanelsButtonElement = document.getElementById('togglePanelsButton');

        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('[DesktopLayout] Could not find all necessary panel elements.');
            return;
        }

        this.initializeMainPanelState();

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("DesktopLayout initialized.");
    }

    initializeMainPanelState() {
        const panelsShouldBeHidden = localStorage.getItem('panelsHidden') === 'true';

        if (panelsShouldBeHidden) {
            this.leftPanelElement.classList.remove('visible');
            this.rightPanelElement.classList.remove('visible');
            this.togglePanelsButtonElement.classList.add('show-mode');
        } else {
            this.leftPanelElement.classList.add('visible');
            this.rightPanelElement.classList.add('visible');
            this.togglePanelsButtonElement.classList.remove('show-mode');
        }
        // Ensure old 'hidden' class is removed
        this.leftPanelElement.classList.remove('hidden');
        this.rightPanelElement.classList.remove('hidden');

        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        const currentVisibility = this.leftPanelElement.classList.contains('visible');
        console.log(`[DesktopLayout] Panels initialized. Currently visible: ${currentVisibility}`);
    }

    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('[DesktopLayout] Panel elements not initialized before toggle.');
            return;
        }

        const arePanelsCurrentlyVisible = this.leftPanelElement.classList.contains('visible');

        this.leftPanelElement.classList.toggle('visible');
        this.rightPanelElement.classList.toggle('visible');

        const newState = arePanelsCurrentlyVisible ? 'hidden' : 'visible';
        this.togglePanelsButtonElement.classList.toggle('show-mode', arePanelsCurrentlyVisible);

        try {
            localStorage.setItem('panelsHidden', arePanelsCurrentlyVisible.toString());
        } catch (e) {
            console.error('[DesktopLayout] Error saving panel visibility to localStorage:', e);
        }
        console.log(`[DesktopLayout] Panels toggled. New state: ${newState}`);

        const event = new CustomEvent('uiStateChanged', {
            detail: {
                component: 'mainPanels',
                newState: newState
            }
        });
        window.dispatchEvent(event);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
}
