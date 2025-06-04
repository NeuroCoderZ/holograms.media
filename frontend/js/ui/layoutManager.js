// frontend/js/ui/layoutManager.js

// Удаляем неиспользуемый импорт THREE
// import * as THREE from 'three';
import { state } from '../core/init.js';
import { ui } from '../core/ui.js'; // Импортируем ui для доступа к панелям

// Вспомогательные функции
function getPanelWidths() {
  return (ui.leftPanel?.offsetWidth || 0) + (ui.rightPanel?.offsetWidth || 0);
}

function calculateInitialScale(containerWidth, availableHeightForHologram) {
  const { WIDTH, HEIGHT } = state.config?.GRID || { WIDTH: 130, HEIGHT: 260 };

  const hologramWidth = WIDTH * 2;
  const hologramHeight = HEIGHT;

  let widthScale = (containerWidth * 0.98) / hologramWidth;
  let heightScale = availableHeightForHologram / hologramHeight;

  let scale = Math.min(widthScale, heightScale);
  scale = Math.max(scale, 0.1); // Минимальный масштаб

  return scale;
}

/**
 * Обновляет макет голограммы и панелей в зависимости от видимости рук и размеров окна.
 * @param {boolean} handsVisible - Флаг, указывающий, видны ли руки MediaPipe.
 */
export function updateHologramLayout(handsVisible) {
  console.log('[LayoutManager] updateHologramLayout called, state.uiElements:', state.uiElements); // ЗАДАЧА 3: Добавлен отладочный лог

  // Проверяем наличие необходимых элементов
  // Расширенная проверка на существование всех необходимых компонентов
  if (!state.uiElements.gridContainer) { // ИСПРАВЛЕНО: Доступ напрямую к gridContainer
    console.warn('[layoutManager/updateHologramLayout] Skipping: gridContainer is not available.');
    return;
  }

  if (!state.uiElements.gestureArea) { // ИСПРАВЛЕНО: Доступ напрямую к gestureArea
    console.warn('[layoutManager/updateHologramLayout] Skipping: gestureArea is not available.');
    return;
  }

  // Проверяем наличие hologramPivot в state
  if (!state.hologramPivot) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: hologramPivot is not available.');
    return;
  }

  // Проверяем наличие scene, camera и renderer
  if (!state.scene) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: scene is not available.');
    return;
  }

  if (!state.camera) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: camera is not available.');
    return;
  }

  if (!state.renderer) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: renderer is not available.');
    return;
  }

  // Получаем размеры и рассчитываем целевые значения
  const windowHeight = window.innerHeight;
  const topMargin = windowHeight * 0.05; // 5% от высоты окна как верхний отступ в режиме рук
  const availableWidth = window.innerWidth - getPanelWidths(); // Используем импортированную функцию
  // Высота для голограммы: вся высота минус верхний отступ и высота области жестов, если руки видны
  const availableHeight = windowHeight - (handsVisible ? state.uiElements.gestureArea.offsetHeight : 4); // ИСПРАВЛЕНО: Доступ напрямую к gestureArea

  const targetScale = handsVisible ? 0.8 : calculateInitialScale(availableWidth, availableHeight);
  const targetPositionY = handsVisible ? topMargin : 0; // Сдвигаем вниз, если руки видны

  // Анимируем масштаб
  if (window.TWEEN) {
    new window.TWEEN.Tween(state.hologramPivot.scale)
      .to({ x: targetScale, y: targetScale, z: targetScale }, 500) // Длительность анимации 500мс
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .start();

    // Анимируем позицию
    new window.TWEEN.Tween(state.hologramPivot.position)
      .to({ y: targetPositionY }, 500) // Длительность анимации 500мс
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
          if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
          // console.log('[Layout] Position Animation complete'); 
      })
      .start();
  } else {
    // Если TWEEN недоступен, применяем изменения мгновенно
    state.hologramPivot.scale.set(targetScale, targetScale, targetScale);
    state.hologramPivot.position.y = targetPositionY;
    // Update camera if no TWEEN
    if (state.activeCamera) state.activeCamera.updateProjectionMatrix();
  }

  // Обновляем размер рендерера и камеры
  // The renderer size and camera aspect are typically handled by a dedicated resize handler.
  // However, updateHologramLayout might be called when handsVisible changes, affecting available space.
  // The existing lines update based on full window.innerWidth/Height.
  // This could be correct if gridContainer is positioned absolutely and renderer overlays everything.
  // If renderer is confined to gridContainer, then availableWidth/availableHeight should be used.
  // For now, keeping original logic, but it's a point of attention for consistency with resize handler.
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  // state.camera.aspect = window.innerWidth / window.innerHeight; // This is for the fallback state.camera
  // The activeCamera's aspect ratio (if perspective) should be updated in the main resize handler.
  // The updateProjectionMatrix for activeCamera is now handled in TWEEN's onComplete or directly if no TWEEN.

  // Обновляем позицию gestureArea, если она видима
  if (handsVisible && state.uiElements.gestureArea) { // ИСПРАВЛЕНО: Доступ напрямую к gestureArea
      // Позиционируем gestureArea внизу доступной области
      state.uiElements.gestureArea.style.position = 'absolute';
      state.uiElements.gestureArea.style.left = `${getPanelWidths() / 2}px`; // Центрируем по горизонтали между панелями
      state.uiElements.gestureArea.style.bottom = '0px';
      state.uiElements.gestureArea.style.width = `${availableWidth}px`;
      // Высота gestureArea уже должна быть задана в CSS или при инициализации
  }

  // Обновляем позицию gridContainer, чтобы он занимал оставшееся место
   if (state.uiElements.gridContainer) { // ИСПРАВЛЕНО: Доступ напрямую к gridContainer
       state.uiElements.gridContainer.style.position = 'absolute';
       state.uiElements.gridContainer.style.top = '0px';
       state.uiElements.gridContainer.style.left = `${getPanelWidths() / 2}px`;
       state.uiElements.gridContainer.style.width = `${availableWidth}px`;
       state.uiElements.gridContainer.style.height = `${availableHeight}px`;
   }

  // Добавляем отладочные классы для визуализации областей
  // addDebugClasses(handsVisible);

  // Логируем состояние макета
  // logLayoutState(handsVisible);
}

// TODO: Перенести сюда вспомогательные функции, связанные с макетом, если таковые имеются и используются только здесь.