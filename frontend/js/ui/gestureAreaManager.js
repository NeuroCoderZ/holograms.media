// frontend/js/ui/gestureAreaManager.js
import { state } from '../core/init.js'; // Import state if needed, though not strictly for this exact code

function handleOrientationChange() {
    // Ensure uiElements and gestureArea are available in the global state
    if (!state.uiElements?.containers?.gestureArea) {
        console.warn('[GestureAreaManager] Gesture area element not found in state.uiElements.containers.gestureArea. Cannot handle orientation change.');
        return;
    }
    const gestureArea = state.uiElements.containers.gestureArea;
    const isPortrait = window.innerHeight > window.innerWidth;

    gestureArea.classList.toggle('portrait', isPortrait);
    gestureArea.classList.toggle('landscape', !isPortrait);

    console.log(`[GestureAreaManager] Orientation changed. Portrait: ${isPortrait}`);
    // Future: May need to trigger a layout update if gesture area dimensions affect other elements.
    // For now, CSS handles the visual changes based on these classes.
}

export function initializeGestureArea() {
    // Ensure this is called after state.uiElements.containers.gestureArea is populated.
    // Typically, DOM elements are cached in state.uiElements during an earlier UI initialization phase.
    if (!state.uiElements?.containers?.gestureArea) {
        console.warn('[GestureAreaManager] Gesture area element not found at initialization. Orientation styles might not apply correctly until it appears.');
        // Optionally, set up a MutationObserver or a delayed call if gestureArea might be added later.
        // For now, we assume it will be present when this is called or shortly after.
    }

    window.addEventListener('orientationchange', handleOrientationChange);
    // Listen for resize as well, as orientationchange might not always fire consistently across browsers/devices,
    // especially on desktop when resizing a window to simulate portrait/landscape.
    window.addEventListener('resize', handleOrientationChange);
    handleOrientationChange(); // Call once at initialization to set initial classes

    console.log('[GestureAreaManager] Gesture area manager initialized and orientation/resize listeners set up.');
}
