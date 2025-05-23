// layoutManager.js
// Управляет расположением и размерами элементов UI
import { state } from '../core/init.js';

/**
 * Обновляет макет голограммы и панелей в зависимости от видимости рук и размеров окна.
 * @param {boolean} handsVisible - Флаг, указывающий, видны ли руки MediaPipe.
 */
export function updateHologramLayout(handsVisible) {
  // Проверяем наличие необходимых элементов
  // Расширенная проверка на существование всех необходимых компонентов
  if (!state.ui.containers.gridContainer) {
    console.warn('[layoutManager/updateHologramLayout] Skipping: gridContainer is not available.');
    return;
  }

  if (!state.ui.containers.gestureArea) {
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
  const availableHeight = windowHeight - (handsVisible ? state.ui.containers.gestureArea.offsetHeight : 4); // Используем offsetHeight gestureArea

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
      .start();
  } else {
    // Если TWEEN недоступен, применяем изменения мгновенно
    state.hologramPivot.scale.set(targetScale, targetScale, targetScale);
    state.hologramPivot.position.y = targetPositionY;
  }

  // Обновляем размер рендерера и камеры
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();

  // Обновляем позицию gestureArea, если она видима
  if (handsVisible && state.ui.containers.gestureArea) {
      // Позиционируем gestureArea внизу доступной области
      state.ui.containers.gestureArea.style.position = 'absolute';
      state.ui.containers.gestureArea.style.left = `${getPanelWidths() / 2}px`; // Центрируем по горизонтали между панелями
      state.ui.containers.gestureArea.style.bottom = '0px';
      state.ui.containers.gestureArea.style.width = `${availableWidth}px`;
      // Высота gestureArea уже должна быть задана в CSS или при инициализации
  }

  // Обновляем позицию gridContainer, чтобы он занимал оставшееся место
   if (state.ui.containers.gridContainer) {
       state.ui.containers.gridContainer.style.position = 'absolute';
       state.ui.containers.gridContainer.style.top = '0px';
       state.ui.containers.gridContainer.style.left = `${getPanelWidths() / 2}px`;
       state.ui.containers.gridContainer.style.width = `${availableWidth}px`;
       state.ui.containers.gridContainer.style.height = `${availableHeight}px`;
   }

  // Добавляем отладочные классы для визуализации областей
  // addDebugClasses(handsVisible);

  // Логируем состояние макета
  // logLayoutState(handsVisible);
}

// TODO: Перенести сюда вспомогательные функции, связанные с макетом, если таковые имеются и используются только здесь.