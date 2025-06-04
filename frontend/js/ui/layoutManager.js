// frontend/js/ui/layoutManager.js

// Удаляем неиспользуемый импорт THREE
// import * as THREE from 'three';
import { state } from '../core/init.js';
import { ui } from '../core/ui.js'; // Импортируем ui для доступа к панелям

// Вспомогательные функции
// function getPanelWidths() { // Original function
//   return (ui.leftPanel?.offsetWidth || 0) + (ui.rightPanel?.offsetWidth || 0);
// }

function getLeftPanelWidth() {
  return (ui.leftPanel && !ui.leftPanel.classList.contains('hidden') ? ui.leftPanel.offsetWidth : 0);
}

function getRightPanelWidth() {
  return (ui.rightPanel && !ui.rightPanel.classList.contains('hidden') ? ui.rightPanel.offsetWidth : 0);
}

function getTotalPanelWidths() {
  return getLeftPanelWidth() + getRightPanelWidth();
}


function calculateInitialScale(containerWidth, availableHeightForHologram) {
  const { WIDTH, HEIGHT } = state.config?.GRID || { WIDTH: 130, HEIGHT: 260 };

  const hologramWidth = WIDTH * 2; // Assuming this is the intended base width of the hologram content
  const hologramHeight = HEIGHT; // Assuming this is the intended base height of the hologram content

  // Add a small padding inside the container for the hologram
  const padding = 0.98; // Use 98% of container for hologram
  let widthScale = (containerWidth * padding) / hologramWidth;
  let heightScale = (availableHeightForHologram * padding) / hologramHeight;

  let scale = Math.min(widthScale, heightScale);
  scale = Math.max(scale, 0.1); // Минимальный масштаб

  return scale;
}

/**
 * Обновляет макет голограммы и панелей в зависимости от видимости рук и размеров окна.
 * @param {boolean} handsVisible - Флаг, указывающий, видны ли руки MediaPipe.
 */
export function updateHologramLayout(handsVisible) {
  const gridContainer = state.uiElements.containers.gridContainer;
  const gestureArea = state.uiElements.containers.gestureArea;

  if (!gridContainer) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: gridContainer is not available.');
    return;
  }

  if (!gestureArea) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: gestureArea is not available.');
    return;
  }

  if (!state.hologramPivot) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: hologramPivot is not available.');
    return;
  }

  if (!state.scene || !state.renderer) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: scene or renderer is not available.');
    return;
  }
  // activeCamera can be null initially, will be checked before use

  const mainAreaHeight = window.innerHeight; // Assuming main area is full window height for now
  const mainAreaWidth = window.innerWidth;

  const leftPanelWidth = getLeftPanelWidth();
  const totalPanelWidth = getTotalPanelWidths();

  // Calculate available space for gridContainer
  const availableWidthForGrid = mainAreaWidth - totalPanelWidth;
  const availableHeightForGrid = mainAreaHeight * 0.9; // 90% of mainAreaHeight (5% top, 5% bottom margin)
  const gridContainerTop = mainAreaHeight * 0.05;
  const gridContainerLeft = leftPanelWidth;

  // Update gridContainer styles
  gridContainer.style.position = 'absolute';
  gridContainer.style.top = `${gridContainerTop}px`;
  gridContainer.style.left = `${gridContainerLeft}px`;
  gridContainer.style.width = `${availableWidthForGrid}px`;
  gridContainer.style.height = `${availableHeightForGrid}px`;

  // Height available for hologram content within gridContainer
  // This considers the gesture area if it's visible and takes space from the bottom of gridContainer
  const gestureAreaHeight = handsVisible ? gestureArea.offsetHeight : 0;
  // Ensure gestureAreaHeight does not exceed availableHeightForGrid to prevent negative content height
  const actualGestureAreaHeight = Math.min(gestureAreaHeight, availableHeightForGrid);
  const availableHeightForHologramContent = availableHeightForGrid - actualGestureAreaHeight;


  // Calculate scale for the hologram content
  // When hands are visible, a fixed scale is used. Otherwise, it's calculated.
  const targetScaleValue = handsVisible ? 0.8 : calculateInitialScale(availableWidthForGrid, availableHeightForHologramContent);

  // Target Y position for the hologram pivot.
  // This positions the hologram within the gridContainer.
  // If gesture area is visible, hologram might be pushed up or centered in remaining space.
  // The original logic shifted it by topMargin (5% of window height) when hands were visible.
  // Now, it should be relative to gridContainer.
  // Let's try to center the hologram in the available content space within gridContainer.
  // The pivot's y=0 is its center. availableHeightForHologramContent / 2 would be top.
  // If gesture area is shown, it's at the bottom of gridContainer.
  // The hologram should sit above it.
  // A simple approach: if hands are visible, slightly raise the hologram from the center of gridContainer's original height.
  // Or, position it considering the gesture area.
  // For now, let's keep the original logic of a small fixed offset when hands are visible,
  // but this offset should be relative to the gridContainer's coordinate system if pivot is a direct child.
  // If pivot's y is 0 in the middle of its content, then to place it at top of availableHeightForHologramContent:
  // targetPositionY = availableHeightForHologramContent / 2 - (state.config.GRID.HEIGHT * targetScaleValue / 2)
  // To place it at bottom:
  // targetPositionY = -availableHeightForHologramContent / 2 + (state.config.GRID.HEIGHT * targetScaleValue / 2)
  // To center it:
  // targetPositionY = 0 if pivot is centered in gridContainer.
  // The original logic: `handsVisible ? topMargin : 0;` where topMargin was windowHeight * 0.05.
  // This was applied to hologramPivot.position.y.
  // If gridContainer is now correctly positioned, and hologramPivot is relative to scene origin (0,0,0),
  // its y position should be relative to the center of the gridContainer.
  // Let's assume hologramPivot is at (0,0,0) in world space and we want to move it.
  // The gridContainer's center Y in screen pixels is gridContainerTop + availableHeightForGrid / 2.
  // This translation is complex. Simpler: hologramPivot is a child of a group that IS gridContainer.
  // Let's assume hologramPivot itself remains at (0,0,0) relative to its parent, and its parent is scaled/positioned.
  // The existing code animates state.hologramPivot.scale and state.hologramPivot.position.y
  // This implies hologramPivot is the root of the hologram.
  // Let's adjust targetPositionY to be relative to the center of the availableHeightForHologramContent.
  // If hands are visible, gesture area takes space from bottom. Hologram should be in space above.
  // If no hands, hologram uses full availableHeightForHologramContent.
  // A simple target: 0 (center of availableHeightForHologramContent if camera looks there).
  // The previous `topMargin` was pushing it down from top of screen.
  // Let's make it push down from top of gridContainer for now when hands are visible.
  const targetPositionY = handsVisible ? -(availableHeightForGrid / 2) + (state.config.GRID.HEIGHT * targetScaleValue / 2) + (mainAreaHeight * 0.02) : 0;
  // This is still a bit of a guess. The crucial part is that camera and content are aligned.
  // A simpler starting point for targetPositionY might be 0, and adjust camera view.
  // Let's stick to a modification of the original idea: shift down from top of available content area.
  // The center of the hologram content is (0,0). We want to place it.
  // availableHeightForHologramContent / 2 is the top edge relative to center.
  // state.config.GRID.HEIGHT * targetScaleValue / 2 is the scaled half-height of hologram.
  // So, top_edge_of_hologram_content = targetPositionY + scaled_half_height_of_hologram
  // We want top_edge_of_hologram_content = availableHeightForHologramContent / 2 (if y is up)
  // Or for DirectX style (Y down) / WebGL (Y up for camera view, but content might be defined Y up from its origin)
  // Let's assume Y is up for positioning.
  // Target position Y: if hands visible, position it in the upper part of the (gridContainer height - gestureAreaHeight).
  // If not, center it in gridContainer.
  // const yPosOffset = handsVisible ? (availableHeightForHologramContent / 2) - (state.config.GRID.HEIGHT * targetScaleValue / 2) - (mainAreaHeight * 0.01) : 0;
  // Let's try a simple fixed offset from the center of the grid when hands are visible, pushing it slightly up.
  const yPosOffsetWhenHandsVisible = actualGestureAreaHeight / 2 ; // Push up by half the gesture area height.
  const newTargetPositionY = handsVisible ? yPosOffsetWhenHandsVisible : 0;


  // Update orthographic camera parameters if it's active
  if (state.activeCamera && state.activeCamera.isOrthographicCamera) {
    state.activeCamera.left = -availableWidthForGrid / 2;
    state.activeCamera.right = availableWidthForGrid / 2;
    // The ortho camera's top/bottom should correspond to the space where the hologram content is actually rendered.
    state.activeCamera.top = availableHeightForHologramContent / 2;
    state.activeCamera.bottom = -availableHeightForHologramContent / 2;
    // Zoom might need adjustment if the scale of hologramPivot is not sufficient,
    // or if we want to keep hologramPivot.scale at 1 and use camera zoom.
    // For now, assuming hologramPivot scaling handles fitting the content.
    // state.activeCamera.zoom = newZoomFactor; // If needed
    state.activeCamera.updateProjectionMatrix();
  }


  // Animate scale and position
  if (window.TWEEN) {
    new window.TWEEN.Tween(state.hologramPivot.scale)
      .to({ x: targetScaleValue, y: targetScaleValue, z: targetScaleValue }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .start();

    new window.TWEEN.Tween(state.hologramPivot.position)
      .to({ y: newTargetPositionY }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        // Ensure projection matrix is updated after animation, especially if camera params changed.
        if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
      })
      .start();
  } else {
    state.hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
    state.hologramPivot.position.y = newTargetPositionY;
    if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
  }

  // Update renderer size to match gridContainer dimensions
  state.renderer.setSize(availableWidthForGrid, availableHeightForGrid);

  // Update gestureArea position (relative to screen, positioned at bottom of gridContainer area)
  if (handsVisible && gestureArea) {
    gestureArea.style.position = 'absolute';
    gestureArea.style.left = `${gridContainerLeft}px`;
    gestureArea.style.bottom = `${mainAreaHeight - (gridContainerTop + availableHeightForGrid)}px`; // Align with bottom of gridContainer
    gestureArea.style.width = `${availableWidthForGrid}px`;
    // Height is assumed to be set by CSS or initial setup
  }

  // Добавляем отладочные классы для визуализации областей
  // addDebugClasses(handsVisible);

  // Логируем состояние макета
  // logLayoutState(handsVisible);
}

// TODO: Перенести сюда вспомогательные функции, связанные с макетом, если таковые имеются и используются только здесь.