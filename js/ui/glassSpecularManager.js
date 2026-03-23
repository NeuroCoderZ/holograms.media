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
        // Safety check: if not a string, return default white
        if (!color || typeof color !== 'string') {
            return 'rgba(255, 255, 255, 0.9)';
        }

        // Return cached if available
        if (this.cache.has(color)) {
            return this.cache.get(color);
        }

        let brightColor = 'rgba(255, 255, 255, 0.9)';

        try {
            if (color.includes('hsl')) {
                // Parse HSL: hsl(h, s%, l%)
                const match = color.match(/hsl\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/);
                if (match) {
                    const h = parseInt(match[1]);
                    const s = parseInt(match[2]);
                    // Boost lightness to make it a highlight (min 80%, max 95%)
                    const l = Math.min(95, Math.max(80, parseFloat(match[3]) + 40)); 
                    brightColor = `hsl(${h}, ${s}%, ${l}%)`;
                }
            } else if (color.includes('rgba')) {
                // Replace alpha with 0.9
                brightColor = color.replace(/[\d.]+\)$/g, '0.9)');
            } else if (color.includes('rgb')) {
                // Add alpha 0.9
                brightColor = color.replace(/\)$/g, ', 0.9)');
            }
        } catch (err) {
            console.warn('GlassSpecularManager: Error parsing color', color, err);
        }

        this.cache.set(color, brightColor);
        // Limit cache size
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

        if (mix > 0.01) { // Threshold lowered for sensitivity
            const brightColor = this.getBrightColor(color);
            
            // Calculate direction: 
            // If sourcePanX is negative (Left), glint should appear on the Left side (0%)
            // If positive (Right), on the Right side (100%)
            // We can interpolate for smoother movement: -1 -> 0%, 1 -> 100%
            const glintPos = (sourcePanX + 1) / 2 * 100; 
            
            // Clamp to edge zones for dramatic effect
            const glintX = glintPos < 50 ? '0%' : '100%';

            el.style.setProperty('--glass-specular',
                `radial-gradient(ellipse at ${glintX} 50%, ${brightColor} 0%, transparent 60%)`
            );
        } else {
            el.style.setProperty('--glass-specular', 'transparent');
        }
    }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
