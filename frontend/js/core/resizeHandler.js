import { state } from './init.js';
// import { updateHologramLayout } from '../ui/layoutManager.js'; // Предполагаемое место, пока оставляем как есть

export function initializeResizeHandler() {
  window.addEventListener('resize', () => {
    // Получаем элементы и их размеры
    const gridContainerElement = document.getElementById('grid-container');
    if (!gridContainerElement) {
      console.error("Resize handler: #grid-container not found!");
      return;
    }
    const currentGridHeight = gridContainerElement.clientHeight;
    // Предполагаем, что getPanelWidths() либо глобальна, либо будет импортирована/перенесена позже
    const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
    const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
    const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;

    // Логи
    console.log(`Resize event: availableW=${availableWidth}, currentGridHeight=${currentGridHeight}`);

    // Обновляем камеру и рендерер
    // Используем state.camera и state.renderer
    if (!state.isXRMode) { // Предполагаем, что isXRMode теперь в state
      // Проверяем, что state.camera существует перед использованием
      if (state.camera) {
        if (state.camera.isOrthographicCamera) {
          state.camera.left = -availableWidth / 2;
          state.camera.right = availableWidth / 2;
          state.camera.top = currentGridHeight / 2;
          state.camera.bottom = -currentGridHeight / 2;
        } else if (state.camera.isPerspectiveCamera) {
          state.camera.aspect = availableWidth / currentGridHeight;
        }
        state.camera.updateProjectionMatrix();
      } else {
        console.error('Resize handler: state.camera is null');
      }

      // Проверяем, что state.renderer существует перед использованием
      if (state.renderer) {
        state.renderer.setSize(availableWidth, currentGridHeight);
      } else {
        console.error('Resize handler: state.renderer is null');
      }
    }

    // Вызываем updateHologramLayout для пересчета макета голограммы
    const gestureAreaElement = document.getElementById('gesture-area');
    // Определяем видимость по высоте (сравниваем с начальной высотой щели)
    // !!! Проверяем именно '4px' - это специфичная логика, переносим как есть
    const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false;
    // updateHologramLayout(handsAreCurrentlyVisible); // !!! Этот вызов должен быть здесь
    // Если updateHologramLayout еще не вынесена, ее нужно будет импортировать или перенести позже.
    // Пока оставляем вызов закомментированным или предполагаем, что она глобальна/импортируется.
    // В соответствии с инструкцией, оставляем вызов как есть, предполагая, что она будет доступна.
    if (typeof updateHologramLayout === 'function') {
        updateHologramLayout(handsAreCurrentlyVisible);
    } else {
        console.warn('updateHologramLayout function not found. It needs to be imported or moved.');
    }

  });
}