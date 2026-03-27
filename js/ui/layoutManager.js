// frontend/js/ui/layoutManager.js
// import { state } from '../core/init.js'; // Removed import
import { HOLOGRAM_REFERENCE_HEIGHT } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';

let gridContainer = null;
let initialLayout = { top: 0, left: 0, width: 0, height: 0 };
let currentAnimation = null;

function updateRendererAndCamera(appState, newWidth, newHeight) { // Added appState
    if (appState.renderer) {
        appState.renderer.setSize(newWidth, newHeight);
    }
    if (appState.activeCamera) {
        if (appState.activeCamera.isOrthographicCamera) {
            appState.activeCamera.left = -newWidth / 2;
            appState.activeCamera.right = newWidth / 2;
            appState.activeCamera.top = newHeight / 2;
            appState.activeCamera.bottom = -newHeight / 2;
            appState.activeCamera.updateProjectionMatrix();
        } else if (appState.activeCamera.isPerspectiveCamera) {
            appState.activeCamera.aspect = newWidth / newHeight;
            appState.activeCamera.updateProjectionMatrix();
        }
    }
}

// Corrected: Pass appState as a parameter
export function setInitialHologramContainerLayout(appState) {
    if (!gridContainer) {
        gridContainer = document.getElementById('grid-container'); // Get it once
        if (!gridContainer) {
            console.error('[LayoutManager] #grid-container not found for initial layout.');
            return;
        }
    }

    const isMobilePortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;

    if (isMobilePortrait) {
        console.log('[LayoutManager] Mobile Portrait detected. Skipping inline style overrides to favor CSS.');
        // Still need to update renderer to match current CSS-provided size
        setTimeout(() => updateHologramLayout(appState), 100);
        return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Margins as per requirements (v0.19.032: Restoring 5% vertical margins)
    // Phantom Margins (v0.19.036): Canvas fills the area which fills the viewport.
    // However, the hologram inside will scale to 90% of its height and center itself.
    initialLayout.top = 0;
    initialLayout.left = 0;
    initialLayout.width = windowWidth;
    initialLayout.height = windowHeight;

    gridContainer.style.position = 'absolute'; // Ensure position is absolute for top/left
    gridContainer.style.top = `${initialLayout.top}px`;
    gridContainer.style.left = `${initialLayout.left}px`;
    gridContainer.style.width = `${initialLayout.width}px`;
    gridContainer.style.height = `${initialLayout.height}px`;

    updateRendererAndCamera(appState, initialLayout.width, initialLayout.height); // Pass appState
    console.log('[LayoutManager] Initial hologram container layout set:', initialLayout);
}

export function animateHologramContainer(appState, handsPresent) { // Added appState
    if (!gridContainer) {
        console.error('[LayoutManager] Grid container not found for animation.');
        return;
    }

    const isMobilePortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
    if (isMobilePortrait) {
        // На мобильных макет статический (зона жестов всегда видна), анимация не требуется
        updateHologramLayout(appState);
        return;
    }

    if (currentAnimation) {
        currentAnimation.stop();
        window.TWEEN.remove(currentAnimation);
    }

    // Ensure initialLayout has valid values, calculate on-demand if not set
    if (initialLayout.width === 0 || initialLayout.height === 0) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        initialLayout.top = 0;
        initialLayout.left = 0;
        initialLayout.width = windowWidth;
        initialLayout.height = windowHeight;

        // Apply to container if not already set
        if (gridContainer) {
            gridContainer.style.position = 'absolute';
            gridContainer.style.top = `${initialLayout.top}px`;
            gridContainer.style.left = `${initialLayout.left}px`;
            gridContainer.style.width = `${initialLayout.width}px`;
            gridContainer.style.height = `${initialLayout.height}px`;
        }
    }

    const currentTop = parseFloat(gridContainer.style.top) || initialLayout.top;
    const currentLeft = parseFloat(gridContainer.style.left) || initialLayout.left;
    const currentWidth = parseFloat(gridContainer.style.width) || initialLayout.width;
    const currentHeight = parseFloat(gridContainer.style.height) || initialLayout.height;


    let targetLayout = {};

    if (handsPresent) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 2. Define margins as per requirements (v0.19.035: Sync margins)
        const marginTopPercent = 0.05;    // 5% top margin
        const gapPercent = 0.05;          // 5% gap
        const marginBottomPercent = 0.05; // 5% bottom margin (5vh)
        const panelToHoloRatio = 0.25;    // Panel is 25% of hologram height

        // Equation: windowHeight * (marginTop + hHeight + gap + (panelToHoloRatio * hHeight) + marginBottom) = windowHeight
        // hHeight * (1 + panelToHoloRatio) = 1.0 - marginTop - gap - marginBottom
        const hHeightPercent = (1.0 - marginTopPercent - gapPercent - marginBottomPercent) / (1.0 + panelToHoloRatio);
        const pHeightPercent = hHeightPercent * panelToHoloRatio;

        const hHeightActual = hHeightPercent * windowHeight;
        const pHeightActual = pHeightPercent * windowHeight;

        // Logic 3D Area (v0.19.038): Use visible area width and correct offset
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const leftW = leftPanel && leftPanel.classList.contains('visible') ? leftPanel.offsetWidth : 20;
        const rightW = rightPanel && rightPanel.classList.contains('visible') ? rightPanel.offsetWidth : 20;

        targetLayout.left = leftW;
        targetLayout.width = windowWidth - leftW - rightW;
        targetLayout.top = 0;
        targetLayout.height = windowHeight;

        // Sync Gesture Area height with actual calculated height
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.height = `${pHeightActual}px`;
        }
    } else {
        // Hands are gone - return to expanded centered state
        const marginTop = windowHeight * 0.05;
        const marginBottom = windowHeight * 0.05;
        const gap = windowHeight * 0.05;
        const peekHeight = 20;

        // Logic 3D Area (v0.19.041): 100% viewport to center relative to screen
        targetLayout.top = 0;
        targetLayout.left = 0;
        targetLayout.width = windowWidth;
        targetLayout.height = windowHeight;

        // Reset Gesture Area for peek state
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.height = ''; // Let CSS handle height (60px) but it will peek 20px
        }
    }

    // Ensure calculated height and width are positive
    targetLayout.height = Math.max(1, targetLayout.height);
    targetLayout.width = Math.max(1, targetLayout.width);


    const coords = {
        top: currentTop,
        left: currentLeft,
        width: currentWidth,
        height: currentHeight,
    };

    currentAnimation = new window.TWEEN.Tween(coords)
        .to({
            top: targetLayout.top,
            left: targetLayout.left,
            width: targetLayout.width,
            height: targetLayout.height,
        }, 300) // 300ms animation - synchronized with gesture panel
        .easing(window.TWEEN.Easing.Cubic.Out) // Matches gesture panel easing
        .onUpdate(() => {
            gridContainer.style.top = `${coords.top}px`;
            gridContainer.style.left = `${coords.left}px`;
            gridContainer.style.width = `${coords.width}px`;
            // Ensure continuous layout update for smooth hologram scaling
            updateHologramLayout(appState, coords.width, coords.height);
        })
        .onComplete(() => {
            currentAnimation = null;
            console.log(`[LayoutManager] Hologram container animation complete. Hands present: ${handsPresent}`);
            // Final update to ensure precision
            updateHologramLayout(appState);
        })
        .start();
}

// ... (existing code)

/**
 * Updates the layout of the hologram display area (gridContainer),
 * positions it correctly based on side panels, and scales the hologram.
 * Can accept override dimensions to avoid DOM reads during animation.
 */
export function updateHologramLayout(appState, overrideWidth = null, overrideHeight = null) { // Added appState and overrides
    if (!gridContainer) gridContainer = document.getElementById('grid-container');
    if (!gridContainer || !appState.renderer || !appState.hologramRendererInstance || typeof appState.hologramRendererInstance.getHologramPivot !== 'function') {
        console.warn('[LayoutManager] Skipping updateHologramLayout: Essential elements not ready or appState missing.');
        return;
    }

    let containerWidth, containerHeight;

    if (overrideWidth !== null && overrideHeight !== null) {
        containerWidth = overrideWidth;
        containerHeight = overrideHeight;
    } else {
        // --- START NEW CODE ---
        // Ensure gridContainer is valid and has dimensions before trying to read them
        if (!gridContainer || typeof gridContainer.clientWidth === 'undefined' || typeof gridContainer.clientHeight === 'undefined') {
            console.warn('[LayoutManager] Skipping layout update: gridContainer is not valid or does not have clientWidth/Height properties.');
            return;
        }

        containerWidth = gridContainer.clientWidth;
        containerHeight = gridContainer.clientHeight;

        if (!containerWidth || !containerHeight || isNaN(containerWidth) || isNaN(containerHeight)) {
            console.warn('[LayoutManager] Skipping layout update due to invalid container dimensions (0 or NaN). W:', containerWidth, 'H:', containerHeight);
            return; // EXIT FUNCTION
        }
        // --- END NEW CODE ---
    }

    const hologramPivot = appState.hologramRendererInstance.getHologramPivot();

    // Check if hologramPivot was successfully retrieved before using it
    if (!hologramPivot) {
        console.warn('[LayoutManager] Skipping updateHologramLayout: Hologram pivot not available.');
        return;
    }

    if (containerWidth <= 0 || containerHeight <= 0) {
        console.warn('[LayoutManager] Invalid gridContainer dimensions for pivot scaling. W:', containerWidth, 'H:', containerHeight);
        return;
    }

    // Update renderer and camera to match current container size (redundant if called by TWEEN onUpdate, but safe)
    updateRendererAndCamera(appState, containerWidth, containerHeight); // Pass appState

    // Scale Protection (v0.19.043): Use visibleWidth instead of containerWidth
    const windowWidth = window.innerWidth;
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');

    const leftW = leftPanel ? (leftPanel.classList.contains('visible') ? leftPanel.offsetWidth : 20) : 0;
    const rightW = rightPanel ? (rightPanel.classList.contains('visible') ? rightPanel.offsetWidth : 20) : 0;
    
    // Visible Width between panels
    const visibleWidth = Math.max(10, windowWidth - leftW - rightW);
    const visibleHeight = containerHeight; // Vertically we use containerHeight

    // Phantom Margins (v0.19.036): 90% of available space
    const scaleH = (visibleHeight * 0.90) / HOLOGRAM_REFERENCE_HEIGHT;
    const scaleW = (visibleWidth * 0.90) / 256; 
    
    let targetScaleValue = Math.min(scaleH, scaleW);
    targetScaleValue = Math.max(targetScaleValue, 0.01);

    // Offset to align hologram center with visible area center
    const xOffset = (leftW - rightW) / 2;

    if (windowWidth > 768) {
        // Sync Gesture Area width to match the hologram
        const visualWidth = 256 * targetScaleValue;
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.setProperty('--gesture-width', `${visualWidth}px`);
            gestureArea.style.width = `${visualWidth}px`;
            gestureArea.style.removeProperty('left');
            gestureArea.style.removeProperty('transform');
            gestureArea.style.margin = '0';
        }
    } else {
        // Reset Gesture Area for Mobile
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.removeProperty('--gesture-offset');
            gestureArea.style.removeProperty('--gesture-width');
        }
    }

    // Set centering and vertical offset
    const verticalCenterOffset = (containerHeight / 2) - (128 * targetScaleValue);
    
    if (appState.isXRMode) {
        hologramPivot.scale.set(1, 1, 1);
        hologramPivot.position.set(0, 0, 0);
    } else {
        hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
        // Apply X-Offset for centering between visible panels
        hologramPivot.position.set(xOffset / targetScaleValue, verticalCenterOffset / targetScaleValue, 0);
    }

    // The desktop panel logic (getLeftPanelWidth, etc.) is removed from here as the
    // container's left/width is now managed by the animation/initial setup logic.
    // This function now assumes gridContainer is already correctly sized and positioned.

    // console.log('[LayoutManager] Hologram pivot updated to fit new container size. Scale:', targetScaleValue);
}

/**
 * Updates the visibility of the grid helper in the scene.
 */
export function updateGridHelperVisibility(appState, isVisible) { // Added appState
    if (appState.gridHelper) {
        appState.gridHelper.visible = isVisible;
        console.log(`Grid helper visibility set to: ${isVisible}`);
    } else {
        console.warn('Grid helper not found in state.');
    }
}
