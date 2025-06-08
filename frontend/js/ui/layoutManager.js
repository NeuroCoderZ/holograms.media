// frontend/js/ui/layoutManager.js
import * as THREE from 'three';
import { state } from '../core/init.js';
import { GRID_WIDTH, GRID_HEIGHT } from '../config/hologramConfig.js';


// Constants for layout adjustments
const HOLOGRAM_SCALE_PADDING = 1.0; 
const HOLOGRAM_REFERENCE_WIDTH = 2 * GRID_WIDTH; // Adjusted for two grids
const HOLOGRAM_REFERENCE_HEIGHT = GRID_HEIGHT;   // Adjusted for actual grid height

// Дополнительная ручная корректировка для горизонтального центрирования (визуальная подстройка)
// TODO: Document the specific reason for this visual adjustment. For example, is it due to specific element styling, font rendering, or optical balance?
const FIXED_VISUAL_ADJUSTMENT_X = -65; // Компенсация визуального смещения влево

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
// Теперь будет использовать availableHeightForGrid для расчета масштаба по высоте
function calculateInitialScale(containerWidth, containerHeight) {
  let widthScale = (containerWidth * HOLOGRAM_SCALE_PADDING) / HOLOGRAM_REFERENCE_WIDTH;
  let heightScale = (containerHeight * HOLOGRAM_SCALE_PADDING) / HOLOGRAM_REFERENCE_HEIGHT; 

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
  if (!state.uiElements?.gridContainer || !state.uiElements?.gestureArea) {
      console.warn('[LayoutManager] Пропуск: UI элементы не готовы.');
      return;
  }
  console.log('[LayoutManager] updateHologramLayout called. Hands visible:', handsVisible, 'state.uiElements:', state.uiElements);

  // Consolidated guard clause
  if (!state.uiElements?.gridContainer || !state.uiElements?.gestureArea || !state.renderer) {
    console.warn('[LayoutManager] Skipping: UI elements (gridContainer, gestureArea) or renderer not fully initialized yet.');
    return;
  }

  // The checks below are now covered by the guard clause above, so they can be removed or commented out.
  // if (!state.uiElements?.gridContainer) {
  //   console.warn('[LayoutManager] Skipping: gridContainer is not available in state.uiElements.');
  //   return;
  // }
  // if (!state.uiElements?.gestureArea) {
  //   console.warn('[LayoutManager] Skipping: gestureArea is not available in state.uiElements.');
  //   return;
  // }
  // if (!state.renderer) { // General renderer check
  //   console.warn('[LayoutManager] Skipping: state.renderer is not available.');
  //   return;
  // }

  // Check for hologramRendererInstance and its pivot - this check is still relevant if it's a separate concern.
  if (!state.hologramRendererInstance || typeof state.hologramRendererInstance.getHologramPivot !== 'function') {
    console.warn('[LayoutManager] Skipping: state.hologramRendererInstance or getHologramPivot is not available.');
    return;
  }

  const gridContainer = state.uiElements.gridContainer;
  const gestureArea = state.uiElements.gestureArea;

  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  const leftPanelWidth = getLeftPanelWidth();
  const rightPanelWidth = getRightPanelWidth();
  const totalPanelWidth = leftPanelWidth + rightPanelWidth;

  // Рассчитываем доступное пространство для gridContainer (центральная область)
  const availableWidthForGrid = windowWidth - totalPanelWidth;

  // Желаемые отступы в процентах от высоты окна
  const desiredTopWindowMargin = windowHeight * 0.05; // 5% от верхней границы окна до верхней границы голограммы
  // Окно для записи жестов находится внизу. Его верхняя граница зависит от того, свернуто оно или развернуто.
  // В свернутом состоянии gestureArea.offsetHeight = 4 (задано в коде, не зависит от handsVisible)
  // В развернутом состоянии gestureArea.offsetHeight - фактическая высота
  const currentGestureAreaTop = gestureArea.getBoundingClientRect().top; 
  const desiredBottomMarginAboveGestureArea = windowHeight * 0.05; // 5% отступ от верхней границы gestureArea до нижней границы голограммы

  // Вычисляем высоту, которую должна занимать голограмма (и gridContainer)
  // Нижняя желаемая граница голограммы = текущая верхняя граница gestureArea - desiredBottomMarginAboveGestureArea
  const hologramBottomDesiredY = currentGestureAreaTop - desiredBottomMarginAboveGestureArea;

  // Высота gridContainer (она же доступная высота для голограммы) = (нижняя желаемая граница голограммы) - (верхняя желаемая граница голограммы)
  const availableHeightForGrid = hologramBottomDesiredY - desiredTopWindowMargin;

  // Позиционируем gridContainer
  gridContainer.style.position = 'absolute';
  gridContainer.style.top = `${desiredTopWindowMargin}px`;
  gridContainer.style.left = `${leftPanelWidth}px`; // Отступ равен ширине левой панели
  gridContainer.style.width = `${availableWidthForGrid}px`;
  gridContainer.style.height = `${availableHeightForGrid}px`;

  // Обновляем параметры ортографической камеры, если она активна
  if (state.activeCamera && state.activeCamera.isOrthographicCamera) {
    state.activeCamera.left = -availableWidthForGrid / 2;
    state.activeCamera.right = availableWidthForGrid / 2;
    state.activeCamera.top = availableHeightForGrid / 2;
    state.activeCamera.bottom = -availableHeightForGrid / 2;
    state.activeCamera.updateProjectionMatrix();
  }

  // Рассчитываем масштаб для голограммы (всегда используем полный доступный размер)
  let targetScaleValue = calculateInitialScale(availableWidthForGrid, availableHeightForGrid);
  
  // Вычисляем горизонтальное смещение для центрирования голограммы относительно всего окна
  const windowCenterScreenX = windowWidth / 2;
  const gridContainerCenterScreenX = leftPanelWidth + (availableWidthForGrid / 2);
  let horizontalOffset = windowCenterScreenX - gridContainerCenterScreenX;

  // Применяем тонкую визуальную корректировку
  horizontalOffset += FIXED_VISUAL_ADJUSTMENT_X;

  // Корректируем вертикальное позиционирование
  const newTargetPositionY = 0; 

  // Анимация масштаба и позиции hologramPivot
  // Используем корректный pivot, полученный от HologramRendererInstance
  const hologramPivotToAnimate = state.hologramRendererInstance.getHologramPivot();

  // Раскомментируем TWEEN для отладки, теперь он должен работать
  if (window.TWEEN) {
    new window.TWEEN.Tween(hologramPivotToAnimate.scale)
      .to({ x: targetScaleValue, y: targetScaleValue, z: targetScaleValue }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .start();

    new window.TWEEN.Tween(hologramPivotToAnimate.position)
      .to({ y: newTargetPositionY, x: horizontalOffset }, 500) 
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
      })
      .start();
  } else {
    // Резервный вариант, если TWEEN не загружен
    hologramPivotToAnimate.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
    hologramPivotToAnimate.position.y = newTargetPositionY;
    hologramPivotToAnimate.position.x = horizontalOffset;
    if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
  }

  // Позиционируем #gesture-area внизу .main-area
  if (gestureArea) {
    gestureArea.style.position = 'absolute';
    gestureArea.style.left = `${leftPanelWidth}px`;
    gestureArea.style.bottom = `0px`; 
    gestureArea.style.width = `${availableWidthForGrid}px`;
    const targetGestureAreaHeight = handsVisible ? `${windowHeight * 0.2}px` : '4px'; 
    new window.TWEEN.Tween(gestureArea.style)
      .to({ height: targetGestureAreaHeight }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .start();
  }
}
