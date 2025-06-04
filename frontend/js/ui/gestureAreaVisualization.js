// frontend/js/ui/gestureAreaVisualization.js

/**
 * Инициализирует логику визуализации и наблюдения за областью жестов.
 * Перенесено из script.js.
 */
export function initializeGestureAreaVisualization() {
    console.log('Инициализация GestureAreaVisualization...');

    // Наблюдатель за окном записи жестов (gesture-recording-panel)
    // Ищем модальное окно жестов, которое, вероятно, используется для индикации записи
    const gesturePanel = document.getElementById('gestureModal');
    if (gesturePanel) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-gesture-recording') {
                    const isActive = gesturePanel.getAttribute('data-gesture-recording') === 'active';
                    console.log('Gesture recording panel active:', isActive);
                    window.dispatchEvent(new Event('resize')); // Обновить позиционирование
                }
            });
        });
        observer.observe(gesturePanel, { attributes: true });
    } else {
        console.warn('Элемент .gesture-recording-panel не найден.');
    }

    // Наблюдатель за областью жестов (gesture-area) - Эта логика теперь не нужна.
    // Состояние активности (#gesture-area.hands-detected) управляется из handsTracking.js.
    // Визуализация точек пальцев также находится в handsTracking.js.
    // const gestureAreaWatcher = state.uiElements.containers.gestureArea; // Correct way to get it
    // console.log('Gesture area element reference:', gestureAreaWatcher);
    // if (gestureAreaWatcher) {
    //     // Логика ниже не нужна, так как класс 'hands-detected' управляет высотой,
    //     // а updateHologramLayout вызывается из handsTracking.js.
    //     // console.log('Gesture area initial height:', gestureAreaWatcher.style.height);
    //     // const observer = new MutationObserver((mutations) => {
    //     //     mutations.forEach(() => {
    //     //         const height = gestureAreaWatcher.offsetHeight; // Read actual height
    //     //         const isActive = gestureAreaWatcher.classList.contains('hands-detected');
    //     //         console.log('Gesture area height changed to:', height, 'Active via class:', isActive);
    //     //         // gestureAreaWatcher.classList.toggle('active', isActive); // 'active' class is not used by current CSS for height
    //     //         // window.dispatchEvent(new Event('resize')); // Already handled by updateHologramLayout
    //     //     });
    //     // });
    //     // observer.observe(gestureAreaWatcher, { attributes: true, attributeFilter: ['class', 'style'] });
    // } else {
    //     console.warn('Элемент #gesture-area (state.uiElements.containers.gestureArea) не найден в gestureAreaVisualization.');
    // }

    // TODO: Логика отображения точек пальцев находится в handsTracking.js. Этот комментарий можно удалить.
    console.log('GestureAreaVisualization initialized. Note: Finger dot and active state are managed in handsTracking.js.');
}