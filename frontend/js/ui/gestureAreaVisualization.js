// frontend/js/ui/gestureAreaVisualization.js

/**
 * Инициализирует логику визуализации и наблюдения за областью жестов.
 * Перенесено из script.js.
 */
export function initializeGestureAreaVisualization() {
    console.log('Инициализация GestureAreaVisualization...');

    // Наблюдатель за окном записи жестов (gesture-recording-panel)
    const gesturePanel = document.querySelector('.gesture-recording-panel');
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
            mutations.forEach((mutation) => {
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

// --- Функции из frontend/js/gestureAreaVisualization.js ---

import * as THREE from 'three'; // Импортируем THREE для THREE.MathUtils

// Function to update the visualization in the gesture area based on MediaPipe results
export function updateGestureAreaVisualization(results) {
    const gestureArea = document.getElementById('gesture-area'); // Получаем gestureArea
    if (!gestureArea) {
        console.error("Gesture area element not found!");
        return;
    }

    // Очищаем предыдущие точки
    gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

    // Проверь, есть ли вообще обнаруженные руки
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Внутри этой проверки пройдись циклом по results.multiHandLandmarks
        for (const landmarks of results.multiHandLandmarks) {
            // Внутри этого цикла возьми 5 ключевых точек кончиков пальцев
            const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

            // Пройдись циклом по fingerTips
            fingerTips.forEach(tip => {
                // Создай новый div
                const dot = document.createElement('div');
                // Добавь ему класс
                dot.className = 'finger-dot-on-line';
                // Вычисли позицию Y
                const gestureAreaHeight = gestureArea.clientHeight;
                const topPosition = tip.y * gestureAreaHeight;
                // Вычисли масштаб Z
                const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5); // Близко (-0.5) -> 1.5, Далеко (0.1) -> 0.5
                // Установи стили точки
                dot.style.top = `${topPosition - 3}px`;
                dot.style.transform = `scale(${scale})`;
                // Добавь точку в gestureArea
                gestureArea.appendChild(dot);
            });
        }
    }
}

// --- Функции из frontend/js/gestureAreaVisualization.js ---

import * as THREE from 'three'; // Импортируем THREE для THREE.MathUtils

// Function to update the visualization in the gesture area based on MediaPipe results
export function updateGestureAreaVisualization(results) {
    const gestureArea = document.getElementById('gesture-area'); // Получаем gestureArea
    if (!gestureArea) {
        console.error("Gesture area element not found!");
        return;
    }

    // Очищаем предыдущие точки
    gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

    // Проверь, есть ли вообще обнаруженные руки
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Внутри этой проверки пройдись циклом по results.multiHandLandmarks
        for (const landmarks of results.multiHandLandmarks) {
            // Внутри этого цикла возьми 5 ключевых точек кончиков пальцев
            const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

            // Пройдись циклом по fingerTips
            fingerTips.forEach(tip => {
                // Создай новый div
                const dot = document.createElement('div');
                // Добавь ему класс
                dot.className = 'finger-dot-on-line';
                // Вычисли позицию Y
                const gestureAreaHeight = gestureArea.clientHeight;
                const topPosition = tip.y * gestureAreaHeight;
                // Вычисли масштаб Z
                const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5); // Близко (-0.5) -> 1.5, Далеко (0.1) -> 0.5
                // Установи стили точки
                dot.style.top = `${topPosition - 3}px`;
                dot.style.transform = `scale(${scale})`;
                // Добавь точку в gestureArea
                gestureArea.appendChild(dot);
            });
        }
    }
}