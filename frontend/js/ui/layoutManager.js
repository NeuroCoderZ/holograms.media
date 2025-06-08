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
  console.log('[LayoutManager] updateHologramLayout called.');

  const gridContainer = state.uiElements.gridContainer;
  const hologramPivot = state.hologramRendererInstance.getHologramPivot();

  // 2. Расчет Размеров (Calculate Dimensions)
  const leftPanelCurrentWidth = getLeftPanelWidth(); // Используем импортированную функцию
  const totalPanelCurrentWidth = getPanelWidths(); // Используем импортированную функцию

  const availableWidth = window.innerWidth - totalPanelCurrentWidth;
  const availableHeight = window.innerHeight; // gridContainer will take full available height

  // Ensure dimensions are positive
  const finalWidth = Math.max(1, availableWidth);
  const finalHeight = Math.max(1, availableHeight);

  // Apply styles to gridContainer to position and size it
  gridContainer.style.position = 'absolute';
  gridContainer.style.top = '0px';
  gridContainer.style.left = `${leftPanelCurrentWidth}px`;
  gridContainer.style.width = `${finalWidth}px`;
  gridContainer.style.height = `${finalHeight}px`;

  // Update renderer size to match gridContainer
  // This is crucial if the renderer's canvas is directly inside gridContainer and should fill it.
  // This might also be handled by resizeHandler, but explicit here ensures it for this function's scope.
  if (state.renderer) { // Added a check for state.renderer
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
    console.log('[LayoutManager] Orthographic camera updated:', { left: state.activeCamera.left, right: state.activeCamera.right, top: state.activeCamera.top, bottom: state.activeCamera.bottom });
  } else {
    console.warn('[LayoutManager] Active camera is not orthographic or not set.');
    // If it's a perspective camera, you might want to update its aspect ratio here too.
    // if (state.activeCamera && state.activeCamera.isPerspectiveCamera) {
    //   state.activeCamera.aspect = finalWidth / finalHeight;
    //   state.activeCamera.updateProjectionMatrix();
    // }
  }

  // 4. Расчет Масштаба (Scale Calculation)
  // HOLOGRAM_REFERENCE_HEIGHT is imported from '../config/hologramConfig.js'
  let targetScaleValue = finalHeight / HOLOGRAM_REFERENCE_HEIGHT;
  targetScaleValue = Math.max(targetScaleValue, 0.01); // Ensure scale is not zero or negative

  console.log('[LayoutManager] Hologram scale calculation:', { availableHeight: finalHeight, HOLOGRAM_REFERENCE_HEIGHT: HOLOGRAM_REFERENCE_HEIGHT, targetScaleValue: targetScaleValue });

  // 5. Центрирование Голограммы (Centering Hologram)
  hologramPivot.position.x = 0;
  hologramPivot.position.y = 0;
  hologramPivot.position.z = 0;

  console.log('[LayoutManager] Hologram position set to:', { x: hologramPivot.position.x, y: hologramPivot.position.y, z: hologramPivot.position.z });

  // 6. Применение Трансформаций (Apply Transformations - Direct Assignment)
  hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
  console.log('[LayoutManager] Hologram scale applied:', { x: targetScaleValue, y: targetScaleValue, z: targetScaleValue });

  console.log('[LayoutManager] updateHologramLayout completed successfully.');
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
