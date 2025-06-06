// frontend/js/ui/layoutManager.js
import * as THREE from 'three';
import { state } from '../core/init.js';
// Предполагаем, что uiElements ИЗ uiManager.js УЖЕ ЗАПИСАНЫ в state.uiElements к моменту вызова этой функции.
// Если uiManager еще не отработал, ui.leftPanel и ui.rightPanel здесь могут быть null.
// Поэтому безопаснее брать их из state.uiElements, если они там уже есть.

// Constants for layout adjustments
const HANDS_VISIBLE_SCALE_FACTOR = 0.75; // Will be overridden by direct 0.8 scale for handsVisible
const HANDS_VISIBLE_Y_OFFSET_FACTOR = 0.05; // Changed to 0.05 to match oldscriptjs.md topMargin logic (windowHeight * 0.05)
const HOLOGRAM_REFERENCE_WIDTH = 260; // As per task snippet
const HOLOGRAM_REFERENCE_HEIGHT = 260; // As per task snippet
const HOLOGRAM_SCALE_PADDING = 0.98; // As per task snippet for calculateInitialScale

// Вспомогательные функции для получения актуальной ширины видимых панелей
function getLeftPanelWidth() {
  const leftPanel = state.uiElements?.leftPanel;
  if (leftPanel && !leftPanel.classList.contains('hidden') && leftPanel.offsetParent !== null) {
    return leftPanel.getBoundingClientRect().width;
  }
  return 0;
}

function getRightPanelWidth() {
  const rightPanel = state.uiElements?.rightPanel;
  if (rightPanel && !rightPanel.classList.contains('hidden') && rightPanel.offsetParent !== null) {
    return rightPanel.getBoundingClientRect().width;
  }
  return 0;
}

function getTotalPanelWidths() {
  return getLeftPanelWidth() + getRightPanelWidth();
}

// Функция расчета начального масштаба для голограммы
function calculateInitialScale(containerWidth, containerHeight) { // Renamed parameter for clarity
  // Using constants as per task snippet
  let widthScale = (containerWidth * HOLOGRAM_SCALE_PADDING) / HOLOGRAM_REFERENCE_WIDTH;
  let heightScale = containerHeight / HOLOGRAM_REFERENCE_HEIGHT; // No padding mentioned for height in snippet's direct scale calculation

  let scale = Math.min(widthScale, heightScale);
  scale = Math.max(scale, 0.1); // Минимальный допустимый масштаб

  return scale;
}

/**
 * Обновляет макет голограммы, контейнера для нее и области жестов
 * в зависимости от видимости рук и размеров окна.
 * @param {boolean} handsVisible - Флаг, указывающий, видны ли руки MediaPipe.
 */
export function updateHologramLayout(handsVisible) {
  console.log('[LayoutManager] updateHologramLayout called. Hands visible:', handsVisible, 'state.uiElements:', state.uiElements);

  // Проверяем наличие ключевых элементов в state
  if (!state.uiElements?.gridContainer) {
    console.warn('[LayoutManager] Skipping: gridContainer is not available in state.uiElements.');
    return;
  }
  if (!state.uiElements?.gestureArea) {
    console.warn('[LayoutManager] Skipping: gestureArea is not available in state.uiElements.');
    return;
  }
  if (!state.hologramPivot) {
    console.warn('[LayoutManager] Skipping: hologramPivot is not available in state.');
    return;
  }
  if (!state.renderer) { // state.scene проверяется позже, если используется камера
    console.warn('[LayoutManager] Skipping: renderer is not available in state.');
    return;
  }

  const gridContainer = state.uiElements.gridContainer;
  const gestureArea = state.uiElements.gestureArea;

  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  const totalPanelWidth = getTotalPanelWidths();

  // Рассчитываем доступное пространство для gridContainer (центральная область)
  const availableWidthForGrid = windowWidth - totalPanelWidth;
  
  // Отступы для gridContainer от верха и низа окна (или main-area, если main-area не 100vh)
  const topPageMargin = windowHeight * 0.05; // 5% сверху
  const bottomPageMarginBeforeGesture = windowHeight * 0.05; // 5% снизу до области жестов (когда она свернута)
  
  const gestureAreaVisibleHeight = handsVisible ? gestureArea.offsetHeight : (gestureArea.classList.contains('hands-detected-css-driven') ? parseFloat(getComputedStyle(gestureArea).height) : 4) ; // 4px - высота свернутой полоски по умолчанию

  // Доступная высота для gridContainer = вся высота - верхний отступ - (отступ снизу ИЛИ высота активной области жестов)
  const availableHeightForGrid = windowHeight - topPageMargin - (handsVisible ? gestureAreaVisibleHeight : bottomPageMarginBeforeGesture);

  // Позиционируем gridContainer
  gridContainer.style.position = 'absolute';
  gridContainer.style.top = `${topPageMargin}px`;
  gridContainer.style.left = `${getLeftPanelWidth()}px`; // Отступ равен ширине левой панели
  gridContainer.style.width = `${availableWidthForGrid}px`;
  gridContainer.style.height = `${availableHeightForGrid}px`;

  // Обновляем размер рендерера Three.js по размерам gridContainer
  if (state.renderer && gridContainer.clientWidth > 0 && gridContainer.clientHeight > 0) {
    state.renderer.setSize(gridContainer.clientWidth, gridContainer.clientHeight);
  }

  // Высота, доступная непосредственно для контента голограммы внутри gridContainer
  // Если #gesture-area будет ВНУТРИ #grid-container, то нужно будет вычитать ее высоту.
  // Если #gesture-area ПОД #grid-container, то availableHeightForGrid уже это учла.
  // Предположим, что availableHeightForGrid - это уже высота для рендера.
  const availableHeightForHologramContent = availableHeightForGrid;

  // Рассчитываем масштаб для голограммы
  let targetScaleValue;
  let newTargetPositionY;

  if (handsVisible) {
    targetScaleValue = 0.8; // As per oldscriptjs.md
    newTargetPositionY = window.innerHeight * HANDS_VISIBLE_Y_OFFSET_FACTOR; // As per oldscriptjs.md (topMargin)
  } else {
    targetScaleValue = calculateInitialScale(availableWidthForGrid, availableHeightForHologramContent);
    newTargetPositionY = 0; // Centered when hands are not visible
  }

  // Обновляем параметры ортографической камеры, если она активна
  // Note: Camera position itself is not changed here, only its frustum.
  // The hologramPivot position is what moves the content within this frustum.
  if (state.activeCamera && state.activeCamera.isOrthographicCamera) {
    state.activeCamera.left = -availableWidthForGrid / 2;
    state.activeCamera.right = availableWidthForGrid / 2;
    state.activeCamera.top = availableHeightForHologramContent / 2;
    state.activeCamera.bottom = -availableHeightForHologramContent / 2;
    // state.activeCamera.zoom = 1; // Можно настроить зум, если нужно
    state.activeCamera.updateProjectionMatrix();
  }

  // Анимация масштаба и позиции hologramPivot
  if (window.TWEEN) {
    new window.TWEEN.Tween(state.hologramPivot.scale)
      .to({ x: targetScaleValue, y: targetScaleValue, z: targetScaleValue }, 500) // Duration 500ms
      .easing(window.TWEEN.Easing.Quadratic.InOut) // Easing Quadratic.InOut
      .start();

    new window.TWEEN.Tween(state.hologramPivot.position)
      .to({ y: newTargetPositionY }, 500) // Duration 500ms
      .easing(window.TWEEN.Easing.Quadratic.InOut) // Easing Quadratic.InOut
      .onComplete(() => {
        if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
      })
      .start();
  } else {
    state.hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
    state.hologramPivot.position.y = newTargetPositionY;
    if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
  }

  // Позиционируем #gesture-area внизу .main-area, под #grid-container
  if (gestureArea) {
    gestureArea.style.position = 'absolute';
    gestureArea.style.left = `${getLeftPanelWidth()}px`;
    gestureArea.style.bottom = `0px`; // Прижимаем к самому низу .main-area (или window, если main-area = 100vh)
    gestureArea.style.width = `${availableWidthForGrid}px`;
    // Высота #gesture-area управляется через CSS (.hands-detected)
  }
}