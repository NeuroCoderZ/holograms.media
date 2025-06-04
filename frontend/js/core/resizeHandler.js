import * as THREE from 'three'; // Добавляем импорт THREE для доступа к MathUtils
import { state } from './init.js';
import { updateHologramLayout } from '../ui/layoutManager.js'; // Предполагаемое место, пока оставляем как есть

// Вспомогательная функция для получения ширины панелей (перенесена из script.js)
function getPanelWidths() {
    // ИСПРАВЛЕНО: Использование state.uiElements для доступа к панелям
    const leftPanel = state.uiElements?.leftPanel;
    const rightPanel = state.uiElements?.rightPanel;
    const leftWidth = leftPanel ? leftPanel.offsetWidth : 0;
    const rightWidth = rightPanel ? rightPanel.offsetWidth : 0;
    return leftWidth + rightWidth;
}

export function initializeResizeHandler() {
  window.addEventListener('resize', () => {
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
    const availableWidth = window.innerWidth - getPanelWidths();
    const availableHeight = window.innerHeight;

    // Обновляем рендерер и камеру (используем state)
    if (state.renderer) {
        state.renderer.setSize(availableWidth, availableHeight);
        console.log('[Resize] Renderer resized:', { width: availableWidth, height: availableHeight });
    }

    if (state.camera) {
        // Обновляем камеру в зависимости от ее типа
        if (state.camera.isOrthographicCamera) {
            state.camera.left = -availableWidth / 2;
            state.camera.right = availableWidth / 2;
            state.camera.top = availableHeight / 2;
            state.camera.bottom = -availableHeight / 2;
        } else if (state.camera.isPerspectiveCamera) {
            state.camera.aspect = availableWidth / availableHeight;
        }
        state.camera.updateProjectionMatrix();
        console.log('[Resize] Camera updated');
    }

    // Вызываем updateHologramLayout для пересчета макета голограммы
    // Определяем видимость по высоте (сравниваем с начальной высотой щели)
    // const gestureAreaElement = document.getElementById('gesture-area'); // Direct DOM query replaced by state access
    // const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false;

    // Ensure UI elements needed by updateHologramLayout are initialized
    if (state.uiElements && state.uiElements.gridContainer && state.uiElements.gestureArea) {
      const handsAreCurrentlyVisible = state.uiElements.gestureArea.style.height !== '4px';
      if (typeof updateHologramLayout === 'function') {
          updateHologramLayout(handsAreCurrentlyVisible);
          console.log('[Resize] updateHologramLayout called');
      } else {
          console.warn('updateHologramLayout function not found. It needs to be imported or moved.');
      }
    } else {
      console.warn('[Resize] UI elements not ready (gridContainer or gestureArea missing in state.uiElements), skipping updateHologramLayout.');
    }
  });
}