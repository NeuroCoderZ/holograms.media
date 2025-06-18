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

export function setInitialHologramContainerLayout() {
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
  const hologramPivot = state.hologramRendererInstance.getHologramPivot();
  const isMobile = window.innerWidth <= 768; // Match CSS media query

  let finalWidth;
  const availableHeight = window.innerHeight; // gridContainer will generally take full available height

  if (isMobile) {
    // On mobile, CSS handles gridContainer's L/R positioning and width (e.g., left: 5vw, width: 90vw).
    // We must ensure that the gridContainer's styles are applied before reading clientWidth.
    // A simple way to help ensure this is to trigger a reflow if necessary,
    // though typically this function is called after major layout changes (like resize)
    // where styles should be computed.
    gridContainer.style.position = 'absolute'; // Ensure position is set for offset/client calculations
    gridContainer.style.top = '0px';
    // gridContainer.style.left and gridContainer.style.width are set by CSS.
    // We read them after ensuring CSS is likely applied.
    gridContainer.getBoundingClientRect(); // Force reflow to get latest computed dimensions
    finalWidth = gridContainer.clientWidth;

    // Ensure gridContainer height is set (CSS might do this, but being explicit is safer for JS calcs)
    gridContainer.style.height = `${Math.max(1, availableHeight)}px`;

  } else {
    // Desktop logic: JS controls panel and gridContainer layout
    const leftPanelCurrentWidth = getLeftPanelWidth();
    const totalPanelCurrentWidth = getPanelWidths();

    const calculatedWidth = window.innerWidth - totalPanelCurrentWidth;
    finalWidth = Math.max(1, calculatedWidth);

    gridContainer.style.position = 'absolute';
    gridContainer.style.top = '0px';
    gridContainer.style.left = `${leftPanelCurrentWidth}px`;
    gridContainer.style.width = `${finalWidth}px`;
    gridContainer.style.height = `${Math.max(1, availableHeight)}px`;
  }

  // Ensure final dimensions are positive for renderer and camera
  finalWidth = Math.max(1, finalWidth);
  const finalHeight = Math.max(1, availableHeight);

  // Update renderer size
  // if (state.renderer) { // Needs appState
    // state.renderer.setSize(finalWidth, finalHeight);
  // }


  // 3. Настройка Камеры (Camera Setup)
  // if (state.activeCamera && state.activeCamera.isOrthographicCamera) { // Needs appState
    // state.activeCamera.left = -finalWidth / 2;
    // state.activeCamera.right = finalWidth / 2;
    // state.activeCamera.top = finalHeight / 2;
    // state.activeCamera.bottom = -finalHeight / 2;
    // state.activeCamera.near = 0.1; // Ensure near/far are appropriate
    // state.activeCamera.far = 2000; // Ensure near/far are appropriate
    // state.activeCamera.updateProjectionMatrix();
    // Removed: console.log('[LayoutManager] Orthographic camera updated:', { left: state.activeCamera.left, right: state.activeCamera.right, top: state.activeCamera.top, bottom: state.activeCamera.bottom });
  // } else {
    // console.warn('[LayoutManager] Active camera is not orthographic or not set.');
    // If it's a perspective camera, you might want to update its aspect ratio here too.
    // if (state.activeCamera && state.activeCamera.isPerspectiveCamera) { // Needs appState
    //   state.activeCamera.aspect = finalWidth / finalHeight;
    //   state.activeCamera.updateProjectionMatrix();
    // }
  // }

  const animationDuration = 300; // Common animation duration

  // 4. Determine Gesture Area's target height for calculations
  // const gestureAreaTargetHeightPx = state.handsVisible ? finalHeight * 0.20 : 4; // Needs appState

  // 5. Calculate padding and available height for Hologram based on requirements
  // finalHeight is window.innerHeight (also gridContainer height)
  // gestureAreaTargetHeightPx is the calculated height of the gesture area

  const paddingTopDevicePx = 0.05 * finalHeight; // 5% of window height for top padding

  // Top of gesture area in device pixels (from top of window)
  const gestureAreaTopDevicePx = finalHeight - gestureAreaTargetHeightPx;
  // Bottom padding is 5% of the gesture area's top position
  const paddingBottomDevicePx = 0.05 * gestureAreaTopDevicePx;

  // Calculate the actual visual height available for the hologram content
  const hologramAvailableVisualHeightPx = finalHeight - paddingTopDevicePx - paddingBottomDevicePx - gestureAreaTargetHeightPx;

  // 6. Расчет Масштаба (Scale Calculation)
  let targetScaleValue = hologramAvailableVisualHeightPx / HOLOGRAM_REFERENCE_HEIGHT;
  targetScaleValue = Math.max(targetScaleValue, 0.01); // Ensure scale is not zero or negative

  // 7. Центрирование Голограммы (Hologram Centering)
  // The hologram needs to be centered in the space defined by paddingTopDevicePx and paddingBottomDevicePx,
  // above the gestureAreaTargetHeightPx.
  // All calculations are relative to the center of gridContainer (camera's Y=0).
  // Top of available space (camera coordinates): (finalHeight / 2) - paddingTopDevicePx
  // Bottom of available space (camera coordinates): (-finalHeight / 2) + gestureAreaTargetHeightPx + paddingBottomDevicePx
  // Target Y position is the midpoint of this space.
  const targetPositionY = (((finalHeight / 2) - paddingTopDevicePx) + ((-finalHeight / 2) + gestureAreaTargetHeightPx + paddingBottomDevicePx)) / 2;
  // Simplified: (gestureAreaTargetHeightPx + paddingBottomDevicePx - paddingTopDevicePx) / 2;

  // 8. Animate Hologram Scale and Position if TWEEN is available
  // if (typeof TWEEN !== 'undefined') {
  //   // Animate Scale
  //   new TWEEN.Tween(hologramPivot.scale)
  //     .to({ x: targetScaleValue, y: targetScaleValue, z: targetScaleValue }, animationDuration)
  //     .easing(TWEEN.Easing.Quadratic.InOut)
  //     .start();
  //
  //   // Animate Position Y
  //   new TWEEN.Tween(hologramPivot.position)
  //     .to({ y: targetPositionY }, animationDuration)
  //     .easing(TWEEN.Easing.Quadratic.InOut)
  //     .start();
  //
  //   // X and Z position remain 0 (or could be tweened if needed in future)
  //   if (hologramPivot.position.x !== 0 || hologramPivot.position.z !== 0) {
  //       new TWEEN.Tween(hologramPivot.position)
  //           .to({ x: 0, z: 0 }, animationDuration)
  //           .easing(TWEEN.Easing.Quadratic.InOut)
  //           .start();
  //   }
  //
  // } else {
    // Fallback to direct assignment if TWEEN is not available (now always used)
    hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
    hologramPivot.position.y = targetPositionY;
    hologramPivot.position.x = 0;
    hologramPivot.position.z = 0;
    // console.warn('[LayoutManager] TWEEN is not defined. Hologram transformations applied directly.'); // Commented out as TWEEN is intentionally disabled for this part
  // }
  // Removed: console.log('[LayoutManager] Hologram target calculated:', { scale: targetScaleValue, posY: targetPositionY });

  // 9. Animate Gesture Area Height based on handsVisible state (from previous subtask)
  // if (appState.uiElements?.gestureArea && typeof TWEEN !== 'undefined') { // Needs appState
  //   const gestureAreaElement = appState.uiElements.gestureArea;
  //
  //   if (!gestureAreaElement.style.height) {
  //     gestureAreaElement.style.height = '4px';
  //   }
  //   const currentGestureAreaHeightPx = parseFloat(gestureAreaElement.style.height);
  //
  //   // Avoid re-animating if already at target height (simple check)
  //   // gestureAreaTargetHeightPx is already calculated above
  //   if (Math.abs(currentGestureAreaHeightPx - gestureAreaTargetHeightPx) > 0.5) {
  //     new TWEEN.Tween({ height: currentGestureAreaHeightPx })
  //       .to({ height: gestureAreaTargetHeightPx }, animationDuration)
  //       .easing(TWEEN.Easing.Quadratic.InOut)
  //       .onUpdate((object) => {
  //         gestureAreaElement.style.height = object.height + 'px';
  //       })
  //       .start();
  //   }
  // } else {
  //   if (!appState.uiElements?.gestureArea) { // Needs appState
  //     console.warn('[LayoutManager] gestureArea not found in appState.uiElements. Cannot animate height.');
  //   }
  //   if (typeof TWEEN === 'undefined') {
      // This warning is now covered by the hologram animation check as well
      // console.warn('[LayoutManager] TWEEN is not defined. Cannot animate gestureArea height.');
  //   }
  // }

  // Direct setting of gestureArea height if TWEEN is not used or disabled
  // if (appState.uiElements?.gestureArea) { // Needs appState
    // appState.uiElements.gestureArea.style.height = gestureAreaTargetHeightPx + 'px';
  // } else {
    // console.warn('[LayoutManager] gestureArea not found in appState.uiElements. Cannot set height directly.');
  // }


  // Removed: console.log('[LayoutManager] updateHologramLayout completed successfully.');
}

/**
 * Updates the visibility of the grid helper in the scene.
 * @param {boolean} isVisible - Whether the grid helper should be visible.
 */
export function updateGridHelperVisibility(appState, isVisible) { // Added appState
  if (appState.gridHelper) {
    appState.gridHelper.visible = isVisible;
    console.log(`Grid helper visibility set to: ${isVisible}`);
  } else {
    console.warn('Grid helper not found in state.');
  }
}
// Ensure TWEEN update calls are removed if TWEEN is no longer used for layout.
// If TWEEN is used elsewhere, ensure its updates are handled (e.g., in the main animation loop).
// Removed explicit TWEEN.update() from here.
// window.addEventListener('resize', updateHologramLayout); // This was likely for testing, proper call is from resizeHandler
// updateHologramLayout(false); // Initial call, also likely for testing, should be managed by initialization sequence.
