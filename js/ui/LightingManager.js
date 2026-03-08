/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Вычисляет положение центрального источника света (голограммы) 
 * и обновляет CSS переменные для бликов на элементах.
 */

export class LightingManager {
    constructor(appState) {
        this.state = appState;
        this.elements = [];
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;

        this.handleResize = this.handleResize.bind(this);
        this.updateLighting = this.updateLighting.bind(this);
    }

    initialize() {
        window.addEventListener('resize', this.handleResize);

        // Регистрируем основные группы элементов
        this.refreshElements();

        // Запускаем цикл обновления (можно через requestAnimationFrame, если нужно очень плавно)
        // Но для статичных кнопок достаточно обновлять при инициализации и ресайзе
        this.updateLighting();

        console.log("LightingManager: Initialized.");
    }

    refreshElements() {
        // Собираем все кнопки и панели, которые должны реагировать на свет
        this.elements = Array.from(document.querySelectorAll('.control-button, .panel, .panel-section, .chat-message'));
    }

    handleResize() {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.updateLighting();
    }

    updateLighting() {
        if (this.elements.length === 0) return;

        this.elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elCenterX = rect.left + rect.width / 2;
            const elCenterY = rect.top + rect.height / 2;

            // Вектор от центра экрана (света) к элементу
            const dx = elCenterX - this.centerX;
            const dy = elCenterY - this.centerY;

            // Расчет позиции блика в процентах (0-100%)
            // Мы инвертируем вектор, так как блик должен быть со стороны источника света
            // Если элемент справа от центра (dx > 0), блик должен быть на его ЛЕВОМ крае

            // Нормализуем координаты для радиального градиента (50% - центр элемента)
            // Мы ограничиваем смещение, чтобы блик не уходил за край слишком сильно
            const lightX = 50 - (dx / window.innerWidth) * 100;
            const lightY = 50 - (dy / window.innerHeight) * 100;

            // Инвертированные координаты для эффекта вогнутости (Concave)
            // Свет "проходит сквозь" и подсвечивает противоположную сторону
            const invLightX = 100 - lightX;
            const invLightY = 100 - lightY;

            el.style.setProperty('--light-x', `${lightX}%`);
            el.style.setProperty('--light-y', `${lightY}%`);
            el.style.setProperty('--inv-light-x', `${invLightX}%`);
            el.style.setProperty('--inv-light-y', `${invLightY}%`);

            // Также рассчитываем угол для конических градиентов или теней, если нужно
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            el.style.setProperty('--light-angle', `${angle}deg`);
        });
    }

    /**
     * Вызывает обновление только для конкретного элемента (например, при анимации)
     */
    updateElement(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;
        const dx = elCenterX - this.centerX;
        const dy = elCenterY - this.centerY;

        const lightX = 50 - (dx / window.innerWidth) * 100;
        const lightY = 50 - (dy / window.innerHeight) * 100;

        el.style.setProperty('--light-x', `${lightX}%`);
        el.style.setProperty('--light-y', `${lightY}%`);
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
