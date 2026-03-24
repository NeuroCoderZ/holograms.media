export class GlassSpecularManager {
    constructor() {
        this.cache = new Map();
    }

    init() {
        console.log('GlassSpecularManager: Initialized.');
    }

    /**
     * Generates a bright specular highlight color based on the input source color.
     * Handles HSL, RGBA, and RGB formats safely.
     * @param {string} color - The source color (e.g., 'hsl(120, 100%, 50%)', 'rgba(0,0,0,0.5)')
     * @returns {string} - A brightened version of the color with high opacity
     */
    getBrightColor(color) {
        if (!color || typeof color !== 'string') {
            return 'rgba(255, 255, 255, 0.9)';
        }

        if (this.cache.has(color)) {
            return this.cache.get(color);
        }

        let brightColor = 'rgba(255, 255, 255, 0.9)';

        try {
            if (color.includes('hsl')) {
                // Парсим HSL и делаем яркий specular цвет
                const match = color.match(/hsl\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/);
                if (match) {
                    const h = parseInt(match[1]);
                    const s = Math.min(100, parseInt(match[2]) + 20);
                    const l = Math.min(92, Math.max(75, parseFloat(match[3]) + 50)); 
                    brightColor = `hsla(${h}, ${s}%, ${l}%, 0.85)`;
                }
            } else if (color.includes('rgba')) {
                brightColor = color.replace(/[\d.]+\)$/g, '0.85)');
            } else if (color.includes('rgb')) {
                brightColor = color.replace(/\)$/g, ', 0.85)');
            }
        } catch (err) {
            console.warn('GlassSpecularManager: Error parsing color', color, err);
        }

        this.cache.set(color, brightColor);
        if (this.cache.size > 50) this.cache.clear();

        return brightColor;
    }

    /**
     * Applies the specular glint to an element based on its position relative to the audio source.
     * @param {HTMLElement} el - The DOM element to style
     * @param {number} intensity - Audio intensity (0-1)
     * @param {string} color - The source color
     * @param {number} sourcePanX - The pan position of the sound source (-1 to 1)
     */
    applyGlint(el, mix, color, sourcePanX = 0) {
        if (!el) return;

        if (mix > 0.005) {
            const brightColor = this.getBrightColor(color);
            
            // Позиция блика: -1 (лево) -> 0%, 1 (право) -> 100%
            const glintPos = (sourcePanX + 1) / 2 * 100; 
            const glintX = Math.max(10, Math.min(90, glintPos));

            // Градиент с учётом интенсивности — ярче при высоком mix
            const opacity = Math.min(1, mix);
            el.style.setProperty('--glass-specular',
                `radial-gradient(ellipse at ${glintX.toFixed(0)}% 50%, ${brightColor} 0%, transparent ${Math.round(40 + 40 * (1 - opacity))}%)`
            );
            
            if (Math.random() < 0.003) {
                console.log(`[GlassSpecular] mix=${mix.toFixed(2)} pos=${glintX.toFixed(0)}% color=${color}`);
            }
        } else {
            el.style.setProperty('--glass-specular', 'transparent');
        }
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
