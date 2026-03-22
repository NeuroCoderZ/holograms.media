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

        this.mouseX = 0;
        this.mouseY = 0;

        // Spectral Colors (from BasilaQ-128 columns)
        this.spectralLeft = 'rgba(255, 255, 255, 0.1)';
        this.spectralRight = 'rgba(255, 255, 255, 0.1)';
    }

    initialize() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);

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

    handleResize = () => {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.updateLighting();
    }

    handleMouseMove = (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.updateLighting();
    }

    updateLighting() {
        if (this.elements.length === 0) return;

        this.elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elCenterX = rect.left + rect.width / 2;
            const elCenterY = rect.top + rect.height / 2;

            const dx = elCenterX - this.centerX;
            const dy = elCenterY - this.centerY;

            const lightX = 50 - (dx / window.innerWidth) * 100;
            const lightY = 50 - (dy / window.innerHeight) * 100;

            const invLightX = 100 - lightX;
            const invLightY = 100 - lightY;

            el.style.setProperty('--light-x', `${lightX}%`);
            el.style.setProperty('--light-y', `${lightY}%`);
            el.style.setProperty('--inv-light-x', `${invLightX}%`);
            el.style.setProperty('--inv-light-y', `${invLightY}%`);

            const shadowScale = 0.05;
            const shadowX = Math.max(-15, Math.min(15, dx * shadowScale));
            const shadowY = Math.max(-15, Math.min(15, dy * shadowScale));
            el.style.setProperty('--shadow-x', `${shadowX}px`);
            el.style.setProperty('--shadow-y', `${shadowY}px`);

            const mdx = elCenterX - this.mouseX;
            const mdy = elCenterY - this.mouseY;
            const distance = Math.sqrt(mdx * mdx + mdy * mdy);
            
            const glowIntensity = Math.max(0, 1 - distance / 300);
            el.style.setProperty('--mouse-glow', glowIntensity.toFixed(3));
            
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            el.style.setProperty('--light-angle', `${angle}deg`);

            // Spectral Colors (Chrome Edges)
            el.style.setProperty('--spectral-color-left', this.spectralLeft);
            el.style.setProperty('--spectral-color-right', this.spectralRight);
        });
    }

    updateSpectralColors(leftHighestColor, rightHighestColor) {
        this.spectralLeft = leftHighestColor || 'rgba(255, 255, 255, 0.1)';
        this.spectralRight = rightHighestColor || 'rgba(255, 255, 255, 0.1)';
        
        document.documentElement.style.setProperty('--spectral-color-left', this.spectralLeft);
        document.documentElement.style.setProperty('--spectral-color-right', this.spectralRight);
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
