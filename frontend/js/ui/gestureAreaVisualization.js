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

    // Наблюдатель за областью жестов (gesture-area)
    const gestureAreaWatcher = document.getElementById('gesture-area') || document.querySelector('[data-gesture-area], [style*="height: 25vh"], [style*="height: 4px"]');
    console.log('Gesture area element:', gestureAreaWatcher);
    if (gestureAreaWatcher) {
        console.log('Gesture area initial height:', gestureAreaWatcher.style.height);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => { // Удалена неиспользуемая переменная mutation
                const height = gestureAreaWatcher.style.height;
                const isActive = height === '25vh';
                console.log('Gesture area height changed to:', height, 'Active:', isActive);
                gestureAreaWatcher.classList.toggle('active', isActive);
                window.dispatchEvent(new Event('resize'));
            });
        });
        observer.observe(gestureAreaWatcher, { attributes: true, attributeFilter: ['style'] });
    } else {
        console.warn('Элемент #gesture-area или его аналоги не найдены.');
        // Дополнительный поиск для отладки, если элемент не найден по ID или селекторам
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.style.height === '25vh' || el.style.height === '4px') {
                console.log('Found element with height 25vh or 4px during fallback search:', el);
            }
        });
    }

    // TODO: Перенести сюда логику отображения точек пальцев, если она еще осталась в script.js
// (Судя по предыдущему анализу, эта логика была закомментирована или удалена)
}