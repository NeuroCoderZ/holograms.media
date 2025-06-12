// frontend/js/ui/layoutManager.js
import * as THREE from 'three';
import { state } from '../core/init.js';
import { getPanelWidths, getLeftPanelWidth } from '../core/resizeHandler.js';
import { HOLOGRAM_REFERENCE_HEIGHT } from '../config/hologramConfig.js'; // Ensure this constant is defined in the config

// Note: GRID_WIDTH, GRID_HEIGHT, HOLOGRAM_SCALE_PADDING, HOLOGRAM_REFERENCE_WIDTH,
// FIXED_VISUAL_ADJUSTMENT_X, and helper functions (getLeftPanelWidth, getRightPanelWidth,
// getTotalPanelWidths, calculateInitialScale) have been removed as per the rewrite instructions.
// TWEEN.js animation logic has also been removed.

/**
 * Updates the layout of the hologram display area (gridContainer),
 * positions it correctly based on visible side panels, and scales the hologram.
 * The function now relies on global state and imported utility functions.
 */
export function updateHologramLayout() { // Removed handsVisible parameter
  // 1. "Предохранитель" (Guard Clause)
  if (!state.uiElements?.gridContainer || !state.renderer || !state.hologramRendererInstance || typeof state.hologramRendererInstance.getHologramPivot !== 'function') {
    console.warn('[LayoutManager] Skipping updateHologramLayout: Essential elements (gridContainer, renderer, hologramRendererInstance with getHologramPivot) not ready.');
    return;
  }
  // Removed: console.log('[LayoutManager] updateHologramLayout called.');

  const gridContainer = state.uiElements.gridContainer;
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
  if (state.renderer) {
    state.renderer.setSize(finalWidth, finalHeight);
  }


  // 3. Настройка Камеры (Camera Setup)
  if (state.activeCamera && state.activeCamera.isOrthographicCamera) {
    state.activeCamera.left = -finalWidth / 2;
    state.activeCamera.right = finalWidth / 2;
    state.activeCamera.top = finalHeight / 2;
    state.activeCamera.bottom = -finalHeight / 2;
    state.activeCamera.near = 0.1; // Ensure near/far are appropriate
    state.activeCamera.far = 2000; // Ensure near/far are appropriate
    state.activeCamera.updateProjectionMatrix();
    // Removed: console.log('[LayoutManager] Orthographic camera updated:', { left: state.activeCamera.left, right: state.activeCamera.right, top: state.activeCamera.top, bottom: state.activeCamera.bottom });
  } else {
    console.warn('[LayoutManager] Active camera is not orthographic or not set.');
    // If it's a perspective camera, you might want to update its aspect ratio here too.
    // if (state.activeCamera && state.activeCamera.isPerspectiveCamera) {
    //   state.activeCamera.aspect = finalWidth / finalHeight;
    //   state.activeCamera.updateProjectionMatrix();
    // }
  }

  const animationDuration = 300; // Common animation duration

  // 4. Determine Gesture Area's target height for calculations
  const gestureAreaTargetHeightPx = state.handsVisible ? finalHeight * 0.20 : 4;

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
  // if (state.uiElements?.gestureArea && typeof TWEEN !== 'undefined') {
  //   const gestureAreaElement = state.uiElements.gestureArea;
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
  //   if (!state.uiElements?.gestureArea) {
  //     console.warn('[LayoutManager] gestureArea not found in state.uiElements. Cannot animate height.');
  //   }
  //   if (typeof TWEEN === 'undefined') {
      // This warning is now covered by the hologram animation check as well
      // console.warn('[LayoutManager] TWEEN is not defined. Cannot animate gestureArea height.');
  //   }
  // }

  // Direct setting of gestureArea height if TWEEN is not used or disabled
  if (state.uiElements?.gestureArea) {
    state.uiElements.gestureArea.style.height = gestureAreaTargetHeightPx + 'px';
  } else {
    console.warn('[LayoutManager] gestureArea not found in state.uiElements. Cannot set height directly.');
  }


  // Removed: console.log('[LayoutManager] updateHologramLayout completed successfully.');
}

/**
 * Updates the visibility of the grid helper in the scene.
 * @param {boolean} isVisible - Whether the grid helper should be visible.
 */
export function updateGridHelperVisibility(isVisible) {
  if (state.gridHelper) {
    state.gridHelper.visible = isVisible;
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
