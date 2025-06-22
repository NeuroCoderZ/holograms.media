// frontend/js/ui/layoutManager.js
import * as THREE from 'three';
// Using window.TWEEN as it's included via script tag and updated in rendering.js
// import * as TWEEN from '@tweenjs/tween.js';
// import { state } from '../core/init.js'; // Removed import
import eventBus from '../core/eventBus.js';
import { getPanelWidths, getLeftPanelWidth } from '../core/resizeHandler.js';
import { HOLOGRAM_REFERENCE_HEIGHT } from '../config/hologramConfig.js';

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

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Margins as per requirements
    const marginTop = windowHeight * 0.05;
    const marginBottom = windowHeight * 0.01;
    const marginSides = windowWidth * 0.05;

    initialLayout.top = marginTop;
    initialLayout.left = marginSides;
    initialLayout.width = windowWidth - (2 * marginSides);
    initialLayout.height = windowHeight - marginTop - marginBottom;

    gridContainer.style.position = 'absolute'; // Ensure position is absolute for top/left
    gridContainer.style.top = `${initialLayout.top}px`;
    gridContainer.style.left = `${initialLayout.left}px`;
    gridContainer.style.width = `${initialLayout.width}px`;
    gridContainer.style.height = `${initialLayout.height}px`;

    updateRendererAndCamera(appState, initialLayout.width, initialLayout.height); // Pass appState
    console.log('[LayoutManager] Initial hologram container layout set:', initialLayout);
}

function animateHologramContainer(appState, handsPresent) { // Added appState
    if (!gridContainer) {
        console.error('[LayoutManager] Grid container not found for animation.');
        return;
    }

    if (currentAnimation) {
        currentAnimation.stop();
        window.TWEEN.remove(currentAnimation);
    }

    const currentTop = parseFloat(gridContainer.style.top) || initialLayout.top;
    const currentLeft = parseFloat(gridContainer.style.left) || initialLayout.left;
    const currentWidth = parseFloat(gridContainer.style.width) || initialLayout.width;
    const currentHeight = parseFloat(gridContainer.style.height) || initialLayout.height;

    let targetLayout = {};

    if (handsPresent) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        targetLayout.top = windowHeight * 0.05; // 5% from screen top
        const gestureAreaHeight = windowHeight * 0.25; // 25vh
        const marginAboveGestureArea = windowHeight * 0.05; // 5% margin above gesture area

        // Corrected calculation for targetBottom (as distance from top of screen to bottom edge of container)
        const gestureAreaTopFromScreenTop = windowHeight - gestureAreaHeight;
        targetLayout.bottomEdge = gestureAreaTopFromScreenTop - marginAboveGestureArea; // Bottom edge of container relative to screen top

        targetLayout.height = targetLayout.bottomEdge - targetLayout.top;
        targetLayout.width = windowWidth * 0.90; // 5% margin each side
        targetLayout.left = windowWidth * 0.05;
    } else {
        targetLayout = { ...initialLayout };
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
        }, 300) // 300ms animation
        .easing(window.TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
            gridContainer.style.top = `${coords.top}px`;
            gridContainer.style.left = `${coords.left}px`;
            gridContainer.style.width = `${coords.width}px`;
            gridContainer.style.height = `${coords.height}px`;
            updateRendererAndCamera(appState, coords.width, coords.height); // Pass appState
        })
        .onComplete(() => {
            currentAnimation = null;
            console.log(`[LayoutManager] Hologram container animation complete. Hands present: ${handsPresent}`);
            // After animation, call updateHologramLayout to adjust pivot's scale/pos within the new container
            updateHologramLayout(appState); // Pass appState
        })
        .start();
}

// Initialize and subscribe to events
// This needs to be called once, perhaps from main.js or when UI is ready
export function initializeLayoutManager(appState) { // Added appState
    gridContainer = document.getElementById('grid-container');
    if (!gridContainer) {
        console.error("[LayoutManager] #grid-container not found during initialization.");
        return;
    }
    setInitialHologramContainerLayout(appState); // Pass appState

    eventBus.on('handsDetected', () => animateHologramContainer(appState, true)); // Pass appState
    eventBus.on('handsLost', () => animateHologramContainer(appState, false));   // Pass appState

    // Also listen for resize to re-apply initial layout (or an adapted one)
    window.addEventListener('resize', () => {
        setInitialHologramContainerLayout(appState); // Pass appState
        // If hands are currently visible, we might want to re-trigger animation to new dimensions
        if (appState.multimodal?.handsVisible) { // Use appState
             // Give a short delay for resize to settle before animating
            setTimeout(() => animateHologramContainer(appState, true), 100); // Pass appState
        }
    });
    console.log("[LayoutManager] Initialized and subscribed to hand/resize events.");
}


/**
 * Updates the layout of the hologram display area (gridContainer),
 * positions it correctly based on visible side panels, and scales the hologram.
 * The function now relies on global state and imported utility functions.
 * THIS FUNCTION'S ROLE HAS CHANGED: It now primarily focuses on scaling the
 * HOLOGRAM PIVOT within the ALREADY RESIZED gridContainer.
 * The gridContainer's size/position is handled by animateHologramContainer and setInitialHologramContainerLayout.
 */
export function updateHologramLayout(appState) { // Added appState
  if (!gridContainer) gridContainer = document.getElementById('grid-container');
  if (!gridContainer || !appState.renderer || !appState.hologramRendererInstance || typeof appState.hologramRendererInstance.getHologramPivot !== 'function') {
    console.warn('[LayoutManager] Skipping updateHologramLayout: Essential elements not ready or appState missing.');
    return;
  }

  // Current dimensions of the gridContainer (set by TWEEN or initial setup)
  // const containerWidth = parseFloat(gridContainer.style.width); // Original line
  // const containerHeight = parseFloat(gridContainer.style.height); // Original line

  // --- НАЧАЛО НОВОГО КОДА ---
  // Ensure gridContainer is valid and has dimensions before trying to read them
  if (!gridContainer || typeof gridContainer.clientWidth === 'undefined' || typeof gridContainer.clientHeight === 'undefined') {
    console.warn('[LayoutManager] Skipping layout update: gridContainer is not valid or does not have clientWidth/Height properties.');
    return;
  }

  const containerWidth = gridContainer.clientWidth;
  const containerHeight = gridContainer.clientHeight;

  if (!containerWidth || !containerHeight || isNaN(containerWidth) || isNaN(containerHeight)) {
    console.warn('[LayoutManager] Skipping layout update due to invalid container dimensions (0 or NaN). W:', containerWidth, 'H:', containerHeight);
    return; // ВЫХОДИМ ИЗ ФУНКЦИИ
  }
  // --- КОНЕЦ НОВОГО КОДА ---

  const hologramPivot = appState.hologramRendererInstance.getHologramPivot();

  // Check if hologramPivot was successfully retrieved before using it
  if (!hologramPivot) {
    console.warn('[LayoutManager] Skipping updateHologramLayout: Hologram pivot not available.');
    return;
  }

  // The following check for containerWidth/Height might seem redundant due to the new code above,
  // but this one specifically checks for <= 0 after they've been confirmed to be numbers.
  // The new code checks for falsy values (0, NaN, undefined) earlier.
  if (containerWidth <= 0 || containerHeight <= 0) {
    console.warn('[LayoutManager] Invalid gridContainer dimensions for pivot scaling. W:', containerWidth, 'H:', containerHeight);
    return;
  }

  // Update renderer and camera to match current container size (redundant if called by TWEEN onUpdate, but safe)
  updateRendererAndCamera(appState, containerWidth, containerHeight); // Pass appState

  // Scale the hologram pivot to fit within the new container dimensions.
  // HOLOGRAM_REFERENCE_HEIGHT is the design height of the hologram content itself.
  // We want to scale it so it fits the containerHeight.
  let targetScaleValue = containerHeight / HOLOGRAM_REFERENCE_HEIGHT;
  targetScaleValue = Math.max(targetScaleValue, 0.01); // Ensure scale is not zero or negative

  hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);

  // Center the hologram pivot within the gridContainer.
  // Since camera is orthographic and centered on (0,0) of container, pivot should be at (0,0,0).
  hologramPivot.position.set(0, 0, 0);

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