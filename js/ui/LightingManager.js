/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Вычисляет положение центрального источника света (голограммы) 
 * и обновляет CSS переменные для бликов на элементах.
 */
import eventBus from '../core/eventBus.js';

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
        
        // Bind spectral data handler
        this._onSpectralData = this._onSpectralData.bind(this);
    }

    initialize() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        
        // Subscribe to audio data for real-time lighting updates
        eventBus.on('audio:spectralData', this._onSpectralData);

        // Регистрируем основные группы элементов
        this.refreshElements();

        // Запускаем цикл обновления
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

    /**
     * Updates static lighting and mouse reflection (Liquid Glass Mirror Effect)
     */
    updateLighting() {
        if (this.elements.length === 0) return;
        
        // Use cached window dimensions
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        const mouseXNorm = this.mouseX / winW;
        const mouseYNorm = this.mouseY / winH;

        this.elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elCenterX = rect.left + rect.width / 2;
            const elCenterY = rect.top + rect.height / 2;
            
            // Normalize element position 0..1
            const elX = elCenterX / winW;
            const elY = elCenterY / winH;

            // Расстояние от курсора до элемента (для зеркального блика)
            // Aspect ratio correction (assume ~16:9 or similar, simplified distance)
            const dist = Math.hypot(mouseXNorm - elX, mouseYNorm - elY);
            
            // Mouse Mirror Reflection Logic
            if (dist < 0.25) {
                // Угол отражения — позиция блика внутри элемента
                // Relative mouse position within the element's coordinate space (extended)
                const relX = (this.mouseX - rect.left) / rect.width;
                const relY = (this.mouseY - rect.top) / rect.height;
                
                // Clamp slightly outside to allow entering/exiting smoothly
                const reflectX = Math.max(-50, Math.min(150, relX * 100));
                const reflectY = Math.max(-50, Math.min(150, relY * 100));
                
                const opacity = (0.25 - dist) / 0.25 * 0.15; // Max 15% opacity

                el.style.setProperty('--mouse-specular',
                    `radial-gradient(circle at ${reflectX.toFixed(1)}% ${reflectY.toFixed(1)}%, 
                    rgba(255,255,255,${opacity.toFixed(3)}) 0%, 
                    transparent 40%)`
                );
            } else {
                el.style.setProperty('--mouse-specular', 'transparent');
            }

            // Legacy Light/Shadow calculations (kept for fallback compatibility)
            const dx = elCenterX - this.centerX;
            const dy = elCenterY - this.centerY;
            const lightX = 50 - (dx / winW) * 100;
            const lightY = 50 - (dy / winH) * 100;
            
            el.style.setProperty('--light-x', `${lightX}%`);
            el.style.setProperty('--light-y', `${lightY}%`);
        });
    }

    /**
     * Process raw spectral data and update dynamic lighting
     */
    _onSpectralData(data) {
        if (!data || !data.levels) return;
        
        // Convert raw levels to column objects with color and position
        // Assuming 128 columns (BasilaQ-128)
        const count = data.levels.length;
        const columnData = [];
        
        for (let i = 0; i < count; i++) {
            const amp = data.levels[i];
            if (amp < 5) continue; // Skip noise
            
            // Map index to color (Holographic Spectrum)
            // Center is low freq (red/purple), edges high (blue/cyan)? 
            // Or simple linear rainbow:
            const hue = (i / count) * 300; // 0..300 range
            const color = this._hslToRgb(hue / 360, 1.0, 0.5);
            
            // PanX: -1 (left) to 1 (right)
            const panX = (i / count) * 2 - 1;
            
            columnData.push({
                freq: i,
                amplitude: amp, // Assuming 0-255 or similar
                color: color,
                panX: panX
            });
        }
        
        this.updateSpectralLighting(columnData);
    }
    
    /**
     * Updates the spectral specular highlights on panels based on audio
     */
    updateSpectralLighting(columnData) {
        if (this.elements.length === 0) return;

        // 1. Find top 5 loudest columns
        const topColumns = columnData
            .sort((a, b) => b.amplitude - a.amplitude)
            .slice(0, 5);
            
        if (topColumns.length === 0) {
             // Fade out if silence
             document.documentElement.style.setProperty('--glass-specular', 'transparent');
             return;
        }

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        this.elements.forEach(panel => {
            const rect = panel.getBoundingClientRect();
            const panelCenterX = (rect.left + rect.width/2) / winW;
            const panelCenterY = (rect.top + rect.height/2) / winH;
            
            let r = 0, g = 0, b = 0;
            
            topColumns.forEach(col => {
                // Distance logic
                // Col PanX is -1..1 relative to center. Convert to 0..1 for screen space?
                // Actually screen space: 0 (left) .. 1 (right). 
                // So col.panX (-1..1) -> (col.panX + 1) / 2
                const colScreenX = (col.panX + 1) / 2;
                
                const dx = colScreenX - panelCenterX;
                const dy = 0.5 - panelCenterY; // Hologram is at 0.5 Y (center)
                const dist = Math.sqrt(dx*dx + dy*dy) + 0.1; // +0.1 to avoid division by zero
                
                // Intensity: Inverse square law
                // Amplitude is 0..255 (usually). Normalize to 0..1
                const ampNorm = Math.min(1, col.amplitude / 128); 
                // Hyper-realism intensity for Phase 20.9.8
                const intensity = (ampNorm * 0.3 + 0.1) / (dist * dist);
                
                r += col.color.r * intensity;
                g += col.color.g * intensity;
                b += col.color.b * intensity;
            });
            
            // Limit max brightness (subtle glow, not blinding)
            // Colors are 0..255 range
            r = Math.min(255, Math.max(0, r * 255));
            g = Math.min(255, Math.max(0, g * 255));
            b = Math.min(255, Math.max(0, b * 255));
            
            // Apply variable
            // Using radial gradient for the "specular highlight" effect
            // Center of gradient is roughly towards the screen center (hologram)
            // But for simplicity, we light the whole panel with this tint
            
            // Optimization: Apply to style property
            panel.style.setProperty('--glass-specular',
                `radial-gradient(ellipse at 50% 0%, 
                rgba(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)},0.8) 0%, 
                transparent 70%)`
            );
            
            // Optional: Tint border
            panel.style.setProperty('--glass-border-tint',
                `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, 0.20)`
            );
        });
    }
    
    // Helper: HSL to RGB object {r,g,b} 0..1
    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r, g, b };
    }

    updateSpectralColors(leftHighestColor, rightHighestColor) {
        // Legacy support - can be removed later if unused
        this.spectralLeft = leftHighestColor || 'rgba(255, 255, 255, 0.1)';
        this.spectralRight = rightHighestColor || 'rgba(255, 255, 255, 0.1)';
        document.documentElement.style.setProperty('--spectral-color-left', this.spectralLeft);
        document.documentElement.style.setProperty('--spectral-color-right', this.spectralRight);
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
