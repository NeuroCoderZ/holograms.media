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
                    // Держим насыщенный цвет: lightness 70-80% (не белый, но яркий)
                    const l = Math.min(80, Math.max(65, parseFloat(match[3]) + 20));
                    brightColor = `hsla(${h}, ${s}%, ${l}%, 0.92)`;
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
     * Logic: Creates a rainbow rim light (Prism Edge) based on current audio energy.
     * 
     * @param {HTMLElement} el - Target element
     * @param {Array} sources - List of {color, amplitude, panX}
     * @param {number} elementCenterX - 0..1 position of element
     */
    applyGlint(el, sources, elementCenterX) {
        if (!el || !sources || sources.length === 0) return;

        // Построение градиента из топ-источников
        // Мы сортируем их по панораме, чтобы создать "радужный перелив" слева направо
        const sorted = [...sources].sort((a, b) => a.panX - b.panX);
        
        // Среднее направление света (для угла градиента)
        const avgPan = sources.reduce((acc, s) => acc + s.panX, 0) / sources.length;
        const angle = 90 + (avgPan * 45); // От 45 до 135 градусов

        // Формируем стопы градиента
        const stops = sorted.map((s, i) => {
            const pos = Math.round((i / (sorted.length - 1 || 1)) * 100);
            const bright = this.getBrightColor(s.color);
            return `${bright} ${pos}%`;
        }).join(', ');

        const maxAmp = Math.max(...sources.map(s => s.amplitude));
        const opacity = Math.min(0.9, 0.1 + maxAmp * 0.8).toFixed(2);

        // [PRISM FIX] Используем линейный градиент. 
        // В сочетании с CSS маской (в _panels.css) это даст свечение только на 1px границе.
        el.style.setProperty('--glass-specular', 
            `linear-gradient(${angle}deg, ${stops})`
        );
        el.style.setProperty('--glass-specular-opacity', opacity);
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
