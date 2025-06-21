import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js'; // Добавляем импорт THREE для доступа к MathUtils
// import { state } from './init.js'; // Removed import
import { updateHologramLayout } from '../ui/layoutManager.js'; // Предполагаемое место, пока оставляем как есть
import { debounce } from '../utils/helpers.js';

let localStateRef; // Added module-level variable

// Вспомогательная функция для получения ширины панелей (перенесена из script.js)
export function getPanelWidths() {
    const leftPanel = localStateRef.uiElements?.leftPanel; // Use localStateRef
    const rightPanel = localStateRef.uiElements?.rightPanel; // Use localStateRef
    let leftWidth = (leftPanel && leftPanel.offsetParent !== null) ? leftPanel.getBoundingClientRect().width : 0;
    let rightWidth = (rightPanel && rightPanel.offsetParent !== null) ? rightPanel.getBoundingClientRect().width : 0;
    return leftWidth + rightWidth;
}

export function getLeftPanelWidth() {
  const leftPanel = localStateRef.uiElements?.leftPanel; // Use localStateRef
  if (leftPanel && leftPanel.offsetParent !== null && !leftPanel.classList.contains('hidden')) { // Ensure it's visible
    return leftPanel.getBoundingClientRect().width;
  }
  return 0;
}

export function initializeResizeHandler(passedState) { // Changed signature
  localStateRef = passedState; // Assign passedState
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;

  const handleResizeLogic = () => {
    if (window.innerWidth === lastWidth && window.innerHeight === lastHeight) {
      console.log('[Resize] Window dimensions unchanged, skipping layout update.');
      return;
    }
    lastWidth = window.innerWidth;
    lastHeight = window.innerHeight;

    if (!localStateRef.uiElements?.gridContainer) { // Use localStateRef
      console.warn('[ResizeHandler] Early exit: gridContainer not initialized');
      return;
    }
    if (!localStateRef.uiElements?.gridContainer || !localStateRef.uiElements?.leftPanel || !localStateRef.uiElements?.rightPanel) { // Use localStateRef
        console.warn('[ResizeHandler] Пропуск обработки resize: UI-элементы еще не готовы.');
        return;
    }
    console.log('[Resize] Window resized');

    // Обновляем размеры панелей (перенесено из script.js)
    const leftPanel = localStateRef.uiElements?.leftPanel; // Use localStateRef
    const rightPanel = localStateRef.uiElements?.rightPanel; // Use localStateRef

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

    // Обновляем рендерер и камеру (используем localStateRef)
    if (localStateRef.renderer) { // Use localStateRef
      localStateRef.renderer.setSize(availableWidth, availableHeight);
      console.log('[Resize] Renderer resized:', { width: availableWidth, height: availableHeight });
    }

    if (localStateRef.activeCamera) { // Changed from localStateRef.camera to localStateRef.activeCamera for consistency
      // Обновляем камеру в зависимости от ее типа
      if (localStateRef.activeCamera.isOrthographicCamera) {
        localStateRef.activeCamera.left = -availableWidth / 2;
        localStateRef.activeCamera.right = availableWidth / 2;
        localStateRef.activeCamera.top = availableHeight / 2;
        localStateRef.activeCamera.bottom = -availableHeight / 2;
      } else if (localStateRef.activeCamera.isPerspectiveCamera) {
        const baseFov = 75; // Standard FOV for desktop (landscape)
        const aspectRatio = availableWidth / availableHeight; // ensure this is defined in scope

        if (aspectRatio < 1) { // Narrow screen (portrait orientation)
            // Increase FOV to "zoom out"
            localStateRef.activeCamera.fov = baseFov / aspectRatio;
        } else { // Landscape orientation
            localStateRef.activeCamera.fov = baseFov;
        }
        // Ensure camera aspect is also updated
        localStateRef.activeCamera.aspect = aspectRatio;
      }
      localStateRef.activeCamera.updateProjectionMatrix();
      console.log('[Resize] Active camera updated');
    }

    // Вызываем updateHologramLayout для пересчета макета голограммы
    // Определяем видимость по высоте (сравниваем с начальной высотой щели)
    // const gestureAreaElement = document.getElementById('gesture-area'); // Direct DOM query replaced by state access
    // const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false;

    // Ensure UI elements needed by updateHologramLayout are initialized
    if (localStateRef.uiElements && localStateRef.uiElements.gridContainer && localStateRef.uiElements.gestureArea) { // Use localStateRef
      // const handsAreCurrentlyVisible = localStateRef.uiElements.gestureArea.style.height !== '4px'; // This line is no longer needed
      if (typeof updateHologramLayout === 'function') {
        updateHologramLayout(localStateRef); // Pass localStateRef
        console.log('[Resize] updateHologramLayout called');
      } else {
        console.warn('updateHologramLayout function not found. It needs to be imported or moved.');
      }
    } else {
      console.warn('[Resize] UI elements not ready (gridContainer or gestureArea missing in state.uiElements), skipping updateHologramLayout.');
    }
  };

  const debouncedResizeHandler = debounce(handleResizeLogic, 150);
  window.addEventListener('resize', debouncedResizeHandler);
}