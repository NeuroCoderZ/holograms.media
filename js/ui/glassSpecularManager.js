/**
 * GlassSpecularManager.js - Stub Mode (v0.20.226)
 * Динамические блики отключены для повышения FPS.
 * Возвращает пустые значения, заставляя CSS использовать стандартные стили.
 */
export class GlassSpecularManager {
    update(target, color, factor = 1) {
        // Ничего не делаем
    }

    applyGlint(target, sources, cache, isPanel = false) {
        // Очищаем переменную, если она была установлена
        target.style.setProperty('--glass-specular', 'none');
    }

    getBrightColor(color) {
        return 'transparent';
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
