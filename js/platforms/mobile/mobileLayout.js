// frontend/js/platforms/mobile/mobileLayout.js
// import { state } from '../../core/init.js'; // No longer needed, state is passed in constructor
// import { uiElements } from '../../ui/uiManager.js'; // Removed as uiElements will be passed via constructor
import { updateHologramLayout } from '../../ui/layoutManager.js';

export default class MobileLayout {
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

        // Dynamic positioning for toggle button - centralized mobile/desktop logic
        const isMobile = window.innerWidth <= 768;
        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.style.position = 'fixed';
            this.togglePanelsButtonElement.style.left = isMobile ? '0px' : '20px';
            this.togglePanelsButtonElement.style.top = 'auto';
            this.togglePanelsButtonElement.style.zIndex = '10001';
            console.log(`[MobileLayout] Dynamic left set for #togglePanelsButton: ${isMobile ? '0px' : '20px'} (isMobile: ${isMobile})`);
            console.log('[MobileLayout] Left panel rect left:', this.leftPanelElement ? this.leftPanelElement.getBoundingClientRect().left : 'N/A');
            console.log('[MobileLayout] Button computed left after set:', window.getComputedStyle(this.togglePanelsButtonElement).left);
        }

        if (isMobile && this.togglePanelsButtonElement) {
            setTimeout(() => {
                console.log('[MobileLayout] Initial position update after 1500ms timeout');
                this.updateToggleButtonPosition();
            }, 1500);
        }

        if (this.leftPanelElement) {
            const observer = new MutationObserver(() => {
                console.log('[MobileLayout] Mutation in left-panel detected, updating toggle button position');
                this.updateToggleButtonPosition();
            });
            observer.observe(this.leftPanelElement, { childList: true, subtree: true });
            console.log('[MobileLayout] MutationObserver set up for left-panel changes');
        }

        this.initializeMainPanelState();
        this.initializeGestureArea();

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }
        console.log("MobileLayout initialized.");
        if (this.togglePanelsButtonElement) {
            window.addEventListener('resize', () => {
                console.log('[MobileLayout] Resize event triggered, updating toggle button position');
                this.updateToggleButtonPosition();
            });
        }
    }

    initializeMainPanelState() {
        if (this.leftPanelElement) {
            this.leftPanelElement.classList.add('visible');
            this.leftPanelElement.classList.remove('hidden');
        }
        if (this.rightPanelElement) { // Right panel should be hidden by default on mobile
            this.rightPanelElement.classList.remove('visible');
            this.rightPanelElement.classList.remove('hidden');
        }
        if (this.togglePanelsButtonElement) { // Button should reflect left panel state
             if (this.leftPanelElement && this.leftPanelElement.classList.contains('visible')) {
                this.togglePanelsButtonElement.classList.remove('show-mode');
             } else {
                this.togglePanelsButtonElement.classList.add('show-mode');
             }
        }
        updateHologramLayout(this.state);
        console.log(`[MobileLayout] Panels initialized. Left panel visible: ${this.leftPanelElement ? this.leftPanelElement.classList.contains('visible') : 'N/A'}`);
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

        // Set hologram margins to 5% left and right for portrait orientation on smartphone
        if (isPortrait) {
            const gridContainer = document.getElementById('grid-container');
            if (gridContainer) {
                const windowWidth = window.innerWidth;
                const marginSides = windowWidth * 0.05;
                const marginTop = window.innerHeight * 0.05;
                const marginBottom = window.innerHeight * 0.01;

                gridContainer.style.left = `${marginSides}px`;
                gridContainer.style.width = `${windowWidth - (2 * marginSides)}px`;
                gridContainer.style.top = `${marginTop}px`;
                gridContainer.style.height = `${window.innerHeight - marginTop - marginBottom}px`;

                // Update renderer and camera
                if (this.state.renderer) {
                    this.state.renderer.setSize(windowWidth - (2 * marginSides), window.innerHeight - marginTop - marginBottom);
                }
                if (this.state.activeCamera) {
                    if (this.state.activeCamera.isOrthographicCamera) {
                        this.state.activeCamera.left = -(windowWidth - (2 * marginSides)) / 2;
                        this.state.activeCamera.right = (windowWidth - (2 * marginSides)) / 2;
                        this.state.activeCamera.top = (window.innerHeight - marginTop - marginBottom) / 2;
                        this.state.activeCamera.bottom = -(window.innerHeight - marginTop - marginBottom) / 2;
                        this.state.activeCamera.updateProjectionMatrix();
                    } else if (this.state.activeCamera.isPerspectiveCamera) {
                        this.state.activeCamera.aspect = (windowWidth - (2 * marginSides)) / (window.innerHeight - marginTop - marginBottom);
                        this.state.activeCamera.updateProjectionMatrix();
                    }
                }
            }
        }

        console.log(`[MobileLayout] Orientation changed. Portrait: ${isPortrait}`);
    }

    /**
     * Positions the toggle button at fixed top below Telegram on mobile.
     */
    updateToggleButtonPosition() {
        if (!this.togglePanelsButtonElement) {
            console.warn('[MobileLayout] Toggle button element not available for positioning.');
            return;
        }

        if (window.innerWidth > 768) {
            return; // Only for mobile
        }

        this.togglePanelsButtonElement.style.top = 'calc(var(--button-size) * 25 + var(--spacing-md) * 3)';
        console.log('[MobileLayout] Toggle button positioned at fixed top: calc(var(--button-size) * 4 + var(--spacing-md) * 3)');
    }
}
