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
     * columnData: [{ freq, amplitude: 0..1, color: 'hsl(h,s%,l%)', panX: -1..1 }]
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

            let totalR = 0, totalG = 0, totalB = 0;
            let totalIntensity = 0;

            topColumns.forEach(col => {
                // col.panX: -1 (left) .. 1 (right)
                // Convert to screen space: 0 (left) .. 1 (right)
                const colScreenX = (col.panX + 1) / 2;

                // Distance from column to panel (in screen space)
                const dx = colScreenX - panelCenterX;
                const dy = 0.5 - panelCenterY; // Hologram at center Y
                const dist = Math.sqrt(dx*dx + dy*dy) + 0.15; // +0.15 min distance

                // Intensity: inverse square law + amplitude
                // amplitude is already 0..1
                const intensity = (col.amplitude * 0.8 + 0.2) / (dist * dist);

                // Parse HSL color from semitones
                const rgb = this._parseHslToRgb(col.color);
                
                // Accumulate weighted color
                totalR += rgb.r * intensity;
                totalG += rgb.g * intensity;
                totalB += rgb.b * intensity;
                totalIntensity += intensity;
            });

            // Average the accumulated colors
            if (totalIntensity > 0) {
                totalR /= totalIntensity;
                totalG /= totalIntensity;
                totalB /= totalIntensity;
            }

            // Apply as specular highlight with high alpha (0.9)
            panel.style.setProperty('--glass-specular',
                `radial-gradient(ellipse at 50% 0%,
                rgba(${Math.round(totalR * 255)}, ${Math.round(totalG * 255)}, ${Math.round(totalB * 255)}, 0.9) 0%,
                transparent 70%)`
            );
        });
    }

    // Parse 'hsl(h, s%, l%)' to {r, g, b} 0..1
    _parseHslToRgb(hslStr) {
        const match = hslStr.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
        if (!match) return { r: 1, g: 1, b: 1 }; // fallback white
        
        const h = parseFloat(match[1]) / 360;
        const s = parseFloat(match[2]) / 100;
        const l = parseFloat(match[3]) / 100;
        
        return this._hslToRgb(h, s, l);
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

import { glassSpecularManager } from './glassSpecularManager.js';

class LightingManager {
    constructor() {
        this.elements = [];
        this.spectralLeft = 'rgba(255, 255, 255, 0.1)';
        this.spectralRight = 'rgba(255, 255, 255, 0.1)';
        this.init();
    }

    init() {
        // Collect UI elements that need lighting
        this.elements = document.querySelectorAll('.control-button, .panel, .glass-panel');
        
        // Listen for window resize to re-cache positions if needed
        window.addEventListener('resize', () => {
            this.elements = document.querySelectorAll('.control-button, .panel, .glass-panel');
        });
    }

    // Convert HSL object to CSS string if needed, or handle raw string
    // This helper might be redundant if we rely on glassSpecularManager, 
    // but ensures we store valid CSS strings.
    formatColor(color) {
        if (!color) return 'rgba(255, 255, 255, 0.1)';
        if (typeof color === 'object' && color.h !== undefined) {
             return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        }
        return color;
    }

    updateSpectralColors(leftHighestColor, rightHighestColor) {
        // Ensure we have strings
        this.spectralLeft = this.formatColor(leftHighestColor);
        this.spectralRight = this.formatColor(rightHighestColor);

        document.documentElement.style.setProperty('--spectral-color-left', this.spectralLeft);
        document.documentElement.style.setProperty('--spectral-color-right', this.spectralRight);

        // Apply to all UI elements
        const winW = window.innerWidth;
        this.elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elX = (rect.left + rect.width / 2) / winW;

            // Weight: Left source affects left items (0.0) more, Right (1.0) more
            const wL = Math.max(0, 1 - elX * 2);
            const wR = Math.max(0, (elX * 2) - 1);
            
            // Determine dominant side and mix
            let col, mix;
            if (wL > wR) {
                col = this.spectralLeft;
                mix = wL;
                // Pass a flag or handle direction in the manager
            } else {
                col = this.spectralRight;
                mix = wR;
            }

            // Use the manager to apply the glint safely
            // passing 'mix' as the intensity/weight
            if (mix > 0.05) {
                const brightColor = glassSpecularManager.getBrightColor(col);
                // Direction: Left source (wL > wR) hits from Left (0%), Right hits from Right (100%)
                const glintX = wL > wR ? '0%' : '100%';
                
                el.style.setProperty('--glass-specular',
                    `radial-gradient(ellipse at ${glintX} 50%, ${brightColor} 0%, transparent 60%)`
                );
            } else {
                el.style.setProperty('--glass-specular', 'transparent');
            }
        });
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
