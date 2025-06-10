import * as THREE from 'three'; // Добавляем импорт THREE для доступа к MathUtils
import { state } from './init.js';
import { updateHologramLayout } from '../ui/layoutManager.js'; // Предполагаемое место, пока оставляем как есть
import { debounce } from '../utils/helpers.js';

// Вспомогательная функция для получения ширины панелей (перенесена из script.js)
export function getPanelWidths() {
    const leftPanel = state.uiElements?.leftPanel;
    const rightPanel = state.uiElements?.rightPanel;
    let leftWidth = (leftPanel && leftPanel.offsetParent !== null) ? leftPanel.getBoundingClientRect().width : 0;
    let rightWidth = (rightPanel && rightPanel.offsetParent !== null) ? rightPanel.getBoundingClientRect().width : 0;
    return leftWidth + rightWidth;
}

export function getLeftPanelWidth() {
  const leftPanel = state.uiElements?.leftPanel;
  if (leftPanel && leftPanel.offsetParent !== null && !leftPanel.classList.contains('hidden')) { // Ensure it's visible
    return leftPanel.getBoundingClientRect().width;
  }
  return 0;
}

export function initializeResizeHandler() {
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;

  const handleResizeLogic = () => {
    if (window.innerWidth === lastWidth && window.innerHeight === lastHeight) {
      console.log('[Resize] Window dimensions unchanged, skipping layout update.');
      return;
    }
    lastWidth = window.innerWidth;
    lastHeight = window.innerHeight;

    if (!state.uiElements?.gridContainer) {
      console.warn('[ResizeHandler] Early exit: gridContainer not initialized');
      return;
    }
    if (!state.uiElements?.gridContainer || !state.uiElements?.leftPanel || !state.uiElements?.rightPanel) {
        console.warn('[ResizeHandler] Пропуск обработки resize: UI-элементы еще не готовы.');
        return;
    }
    console.log('[Resize] Window resized');

    // Обновляем размеры панелей (перенесено из script.js)
    const leftPanel = state.uiElements?.leftPanel;
    const rightPanel = state.uiElements?.rightPanel;

    if (leftPanel) {
      const buttonSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--button-size'));
      const buttonSpacing = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--button-spacing'));
      const newWidth = buttonSize * 2 + buttonSpacing * 3;
      leftPanel.style.width = `${newWidth}px`;
      console.log('[Resize] Left panel resized:', { width: newWidth });
    }

    if (rightPanel) {
      // Используем MathUtils.clamp из THREE
      const newWidthVW = THREE.MathUtils.clamp(window.innerWidth * 0.25, 20, 30);
      rightPanel.style.width = `${newWidthVW}vw`;
      console.log('[Resize] Right panel resized:', { width: `${newWidthVW}vw` });
    }

    // Получаем доступное пространство
    let availableWidth = window.innerWidth - getPanelWidths();
    let availableHeight = window.innerHeight;

    // Ensure dimensions are positive
    availableWidth = Math.max(1, availableWidth);
    availableHeight = Math.max(1, availableHeight);

    // Обновляем рендерер и камеру (используем state)
    if (state.renderer) {
      state.renderer.setSize(availableWidth, availableHeight);
      console.log('[Resize] Renderer resized:', { width: availableWidth, height: availableHeight });
    }

    if (state.activeCamera) { // Changed from state.camera to state.activeCamera for consistency
      // Обновляем камеру в зависимости от ее типа
      if (state.activeCamera.isOrthographicCamera) {
        state.activeCamera.left = -availableWidth / 2;
        state.activeCamera.right = availableWidth / 2;
        state.activeCamera.top = availableHeight / 2;
        state.activeCamera.bottom = -availableHeight / 2;
      } else if (state.activeCamera.isPerspectiveCamera) {
        const baseFov = 75; // Standard FOV for desktop (landscape)
        const aspectRatio = availableWidth / availableHeight; // ensure this is defined in scope

        if (aspectRatio < 1) { // Narrow screen (portrait orientation)
            // Increase FOV to "zoom out"
            state.activeCamera.fov = baseFov / aspectRatio;
        } else { // Landscape orientation
            state.activeCamera.fov = baseFov;
        }
        // Ensure camera aspect is also updated
        state.activeCamera.aspect = aspectRatio;
      }
      state.activeCamera.updateProjectionMatrix();
      console.log('[Resize] Active camera updated');
    }

    // Вызываем updateHologramLayout для пересчета макета голограммы
    // Определяем видимость по высоте (сравниваем с начальной высотой щели)
    // const gestureAreaElement = document.getElementById('gesture-area'); // Direct DOM query replaced by state access
    // const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false;

    // Ensure UI elements needed by updateHologramLayout are initialized
    if (state.uiElements && state.uiElements.gridContainer && state.uiElements.gestureArea) {
      // const handsAreCurrentlyVisible = state.uiElements.gestureArea.style.height !== '4px'; // This line is no longer needed
      if (typeof updateHologramLayout === 'function') {
        updateHologramLayout(); // Argument removed
        console.log('[Resize] updateHologramLayout called');
      } else {
        console.warn('updateHologramLayout function not found. It needs to be imported or moved.');
      }
    } else {
      console.warn('[Resize] UI elements not ready (gridContainer or gestureArea missing in state.uiElements), skipping updateHologramLayout.');
    }
  };

  const debouncedResizeHandler = debounce(handleResizeLogic, 100);
  window.addEventListener('resize', debouncedResizeHandler);
}