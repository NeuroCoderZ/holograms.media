// js/utils/renderingCapabilities.js
// Модуль для детекта поддержки WebGL и WebGPU

/**
 * Класс для детекта возможностей рендеринга
 */
export class RenderingCapabilities {
    constructor() {
        this.capabilities = null;
    }

    /**
     * Проверяет поддержку WebGL
     * @returns {boolean} True если WebGL поддерживается
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    }

    /**
     * Проверяет поддержку WebGPU
     * @returns {boolean} True если WebGPU поддерживается
     */
    checkWebGPUSupport() {
        return navigator.gpu !== undefined;
    }

    /**
     * Получает все возможности рендеринга
     * @returns {Object} Объект с поддержкой WebGL и WebGPU
     */
    async detect() {
        if (this.capabilities) return this.capabilities;

        const webgl = this.checkWebGLSupport();
        const webgpu = this.checkWebGPUSupport();

        this.capabilities = {
            webgl,
            webgpu,
            preferred: webgpu ? 'webgpu' : webgl ? 'webgl' : 'canvas2d'
        };

        console.log('[RenderingCapabilities] Detected:', this.capabilities);
        return this.capabilities;
    }

    /**
     * Возвращает кэшированные возможности
     */
    getCapabilities() {
        return this.capabilities;
    }
}

// Singleton instance
export const renderingCapabilities = new RenderingCapabilities();