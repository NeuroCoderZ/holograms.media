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
     * Applies the specular glint to an element.
     * Logic: Light travels from emissive 3D columns to 2D UI elements.
     * 
     * @param {HTMLElement} el - Element to apply glint
     * @param {number} intensity - Relative brightness (0-1)
     * @param {string} color - Light source color
     * @param {number} sourcePanX - Pan of the column (-1 Left, 1 Right)
     */
    applyGlint(el, mix, color, sourcePanX = 0) {
        if (!el) return;

        // Threshold for performance
        if (mix > 0.05) {
            const brightColor = this.getBrightColor(color);
            
            // Physical projection: 
            // If sound is Left (pan -1), glint hits UI elements from the Left side.
            // glintX: -1 -> 0%, 1 -> 100%
            const glintX = ((sourcePanX + 1) / 2) * 100;
            
            // Clamping to edges for a more dramatic 'rim light' feel on buttons
            const clampedX = Math.max(5, Math.min(95, glintX));

            // Liquid Glass effect: radial gradient + color-dodge (simulated)
            // mix affects both size and opacity
            const size = Math.round(35 + 40 * mix);
            const opacity = (0.2 + 0.8 * mix).toFixed(2);

            // We use background-image for the glint layer (applied to ::after via variable)
            el.style.setProperty('--glass-specular',
                `radial-gradient(circle at ${clampedX.toFixed(0)}% 45%, ${brightColor} 0%, transparent ${size}%)`
            );
            
            // Dynamic opacity boost
            el.style.setProperty('--glass-specular-opacity', opacity);
        } else {
            el.style.setProperty('--glass-specular', 'transparent');
            el.style.setProperty('--glass-specular-opacity', '0');
        }
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
