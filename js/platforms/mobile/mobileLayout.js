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
        this.gestureAreaElement = this.state.uiElements.gestureArea;

        let criticalElementMissing = false;
        if (!this.leftPanelElement) {
            console.error('[CRITICAL ERROR][MobileLayout] Left panel element (#left-panel) not found in uiElements. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }
        if (!this.togglePanelsButtonElement) {
            console.error('[CRITICAL ERROR][MobileLayout] Toggle panels button element (#togglePanelsButton) not found in uiElements. Further initialization of MobileLayout aborted.');
            criticalElementMissing = true;
        }

        if (criticalElementMissing) {
            return; // Abort initialization
        }

        // Полагаемся на CSS для позиционирования кнопки и панелей на мобильных
        console.log('[MobileLayout] Initializing layout (relying on CSS for positioning)');

        this.initializeMainPanelState();
        this.initializeGestureArea();

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
        }

        window.addEventListener('resize', () => {
            console.log('[MobileLayout] Resize event, updating hologram layout');
            updateHologramLayout(this.state);
        });

        console.log("MobileLayout initialized.");
    }

    initializeMainPanelState() {
        // На мобильных панели скрыты по умолчанию (Overlay mode)
        if (this.leftPanelElement) {
            this.leftPanelElement.classList.remove('visible');
            this.leftPanelElement.classList.add('hidden');
        }
        if (this.rightPanelElement) {
            this.rightPanelElement.classList.remove('visible');
            this.rightPanelElement.classList.add('hidden');
        }
        if (this.togglePanelsButtonElement) {
            // В режиме скрытых панелей кнопка имеет класс show-mode
            this.togglePanelsButtonElement.classList.add('show-mode');
        }
        
        // Даем DOM время обновиться перед расчетом размеров
        setTimeout(() => updateHologramLayout(this.state), 100);
    }

    toggleMainPanels() {
        if (this.leftPanelElement) {
            const isVisible = this.leftPanelElement.classList.contains('visible');
            if (isVisible) {
                this.leftPanelElement.classList.remove('visible');
                this.leftPanelElement.classList.add('hidden');
                if (this.togglePanelsButtonElement) this.togglePanelsButtonElement.classList.add('show-mode');
                document.body.classList.remove('left-panel-open');
            } else {
                this.leftPanelElement.classList.add('visible');
                this.leftPanelElement.classList.remove('hidden');
                if (this.togglePanelsButtonElement) this.togglePanelsButtonElement.classList.remove('show-mode');
                document.body.classList.add('left-panel-open');
            }
        }
    }

    // Gesture Area Logic
    initializeGestureArea() {
        if (!this.gestureAreaElement) return;

        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
        this.handleOrientationChange();
    }

    handleOrientationChange() {
        const isPortrait = window.innerHeight > window.innerWidth;
        console.log(`[MobileLayout] Orientation check. Portrait: ${isPortrait}`);
        
        // Просто обновляем размеры Three.js, так как DOM (grid-container) изменится через CSS
        updateHologramLayout(this.state);
    }

    // Метод оставлен для совместимости, но логика перенесена в CSS
    updateToggleButtonPosition() {
        console.log('[MobileLayout] updateToggleButtonPosition called (handled by CSS)');
    }
}
}
