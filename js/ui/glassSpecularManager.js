/**
 * GlassSpecularManager.js
 * Управление физически-корректными бликами на стеклянных поверхностях.
 * Версия 2026: Liquid Glass — динамическая дисперсия и расчет по панораме.
 */

export class GlassSpecularManager {
    constructor() {
        this.cache = new Map();
    }

    init() {
        console.log('GlassSpecularManager v2026: Liquid Glass engine initialized.');
    }

    /**
     * Generates a bright specular highlight color.
     * Uses OKLCH simulation for high dynamic range look.
     */
    getBrightColor(color) {
        if (!color || typeof color !== 'string') {
            return 'rgba(255, 255, 255, 0.95)';
        }

        if (this.cache.has(color)) {
            return this.cache.get(color);
        }

        let brightColor = 'rgba(255, 255, 255, 0.95)';

        try {
            if (color.includes('hsl')) {
                const match = color.match(/hsl\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/);
                if (match) {
                    const h = parseInt(match[1]);
                    const s = 100;
                    // Mirror Mode: Сохраняем цвет столбца, добавляем лишь 10-15% яркости для блеска
                    // Вместо 85%+, используем 60-70%
                    const l = Math.min(75, Math.max(55, parseFloat(match[3]) + 15));
                    brightColor = `hsla(${h}, ${s}%, ${l}%, 0.95)`;
                }
            } else if (color.includes('rgba')) {
                brightColor = color.replace(/[\d.]+\)$/g, '0.95)');
            } else if (color.includes('rgb')) {
                brightColor = color.replace(/\)$/g, ', 0.95)');
            }
        } catch (err) {
            console.warn('GlassSpecularManager: Error parsing color', color, err);
        }

        this.cache.set(color, brightColor);
        if (this.cache.size > 100) this.cache.clear();

        return brightColor;
    }

    /**
     * Applies the spectral prism glint to an element.
     * Logic: Creates a rainbow rim light (Prism Edge) or a vertical "Garland" reflection.
     * 
     * @param {HTMLElement} el - Target element
     * @param {Array} sources - List of {color, amplitude, panX, freq}
     * @param {Object} cache - Element rect cache {centerX, centerY, height...}
     * @param {boolean} verticalMode - If true, gradient goes along the longest axis (garland)
     */
    applyGlint(el, sources, cache, verticalMode = false) {
        if (!el || !sources || sources.length === 0) return;

        let gradient;
        const maxAmp = Math.max(...sources.map(s => s.amplitude));
        const opacity = Math.min(0.95, 0.15 + maxAmp * 0.85).toFixed(2);

        if (verticalMode) {
            // [GARLAND EFFECT] Зеркальное отражение по вертикали
            // Сортируем по частоте (freq), так как в Триа частоты распределены по Y (снизу вверх)
            const sortedByFreq = [...sources].sort((a, b) => b.freq - a.freq);
            
            const stops = sortedByFreq.map((s, i) => {
                const pos = Math.round((i / (sortedByFreq.length - 1 || 1)) * 100);
                const color = this.getBrightColor(s.color);
                return `${color} ${pos}%`;
            }).join(', ');

            // Направление: Сверху вниз (отражение)
            gradient = `linear-gradient(to bottom, ${stops})`;
        } else {
            // [PRISM EDGE] Горизонтальный/диагональный блик (для кнопок)
            const sortedByPan = [...sources].sort((a, b) => a.panX - b.panX);
            const avgPan = sources.reduce((acc, s) => acc + s.panX, 0) / sources.length;
            const angle = 90 + (avgPan * 45); 

            const stops = sortedByPan.map((s, i) => {
                const pos = Math.round((i / (sortedByPan.length - 1 || 1)) * 100);
                const color = this.getBrightColor(s.color);
                return `${color} ${pos}%`;
            }).join(', ');

            gradient = `linear-gradient(${angle}deg, ${stops})`;
        }

        el.style.setProperty('--glass-specular', gradient);
        el.style.setProperty('--glass-specular-opacity', opacity);
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
