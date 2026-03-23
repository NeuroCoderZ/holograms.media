/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Вычисляет положение центрального источника света (голограммы) 
 * и обновляет CSS переменные для бликов на элементах.
 */
import eventBus from '../core/eventBus.js';
import { glassSpecularManager } from './glassSpecularManager.js';

export class LightingManager {
    constructor() {
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
        this.elements = Array.from(document.querySelectorAll('.control-button, .panel, .panel-section, .chat-message, .glass-panel'));
    }

    handleResize = () => {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.refreshElements();
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
        
        // DEBUG: Sample the data occasionally
        if (Math.random() < 0.01) {
             console.log('[LightingManager] Received spectral data. Max level:', Math.max(...data.levels));
        }

        const count = data.levels.length;
        const columnData = [];
        
        for (let i = 0; i < count; i++) {
            const amp = data.levels[i];
            if (amp < 5) continue; // Skip noise
            
            const hue = (i / count) * 300; // 0..300 range
            // Store color as HSL string for easier parsing later if needed
            const color = `hsl(${Math.round(hue)}, 100%, 50%)`;
            
            // PanX: -1 (left) to 1 (right)
            const panX = (i / count) * 2 - 1;
            
            columnData.push({
                freq: i,
                amplitude: amp / 255, // Normalize 0..1
                color: color,
                panX: panX
            });
        }
        
        this.updateSpectralLighting(columnData);
    }
    
    /**
     * Updates the spectral specular highlights on panels based on audio
     * columnData: [{ freq, amplitude: 0..1, color: 'hslString', panX: -1..1 }]
     */
    updateSpectralLighting(columnData) {
        if (this.elements.length === 0) return;

        // 1. Find top loud columns
        const topColumns = columnData
            .sort((a, b) => b.amplitude - a.amplitude)
            .slice(0, 5);

        if (topColumns.length === 0) {
             document.documentElement.style.setProperty('--glass-specular', 'transparent');
             return;
        }

        // DEBUG: Check top columns
        // if (Math.random() < 0.01) console.log('[LightingManager] Top columns:', topColumns);

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        this.elements.forEach(panel => {
            const rect = panel.getBoundingClientRect();
            const panelCenterX = (rect.left + rect.width/2) / winW;
            const panelCenterY = (rect.top + rect.height/2) / winH;

            let totalIntensity = 0;
            let dominantColor = 'rgba(255,255,255,0.1)';
            let maxAmp = 0;

            // Simplified: Find the column that affects this panel the most
            topColumns.forEach(col => {
                const colScreenX = (col.panX + 1) / 2;
                const dx = colScreenX - panelCenterX;
                const dy = 0.5 - panelCenterY;
                const dist = Math.sqrt(dx*dx + dy*dy) + 0.15;

                const intensity = (col.amplitude * 0.8 + 0.2) / (dist * dist);
                
                if (intensity > maxAmp) {
                    maxAmp = intensity;
                    dominantColor = col.color;
                }
                totalIntensity += intensity;
            });

            // Use glassSpecularManager to apply the glint
            // Pass 'totalIntensity' as mix factor (clamped)
            // BOOST SENSITIVITY: Multiplied by 3.0 to ensure visibility even at lower volumes
            const mix = Math.min(1, totalIntensity * 3.0);
            
            // DEBUG: Check mix calculation for one element
            if (mix > 0.1 && Math.random() < 0.001) {
               console.log('[LightingManager] Applying glint. Mix:', mix.toFixed(2), 'Color:', dominantColor);
            }

            glassSpecularManager.applyGlint(panel, mix, dominantColor);
        });
    }

    // Compatibility method if called externally
    updateSpectralColors(leftHighestColor, rightHighestColor) {
        // This method is kept for API compatibility but logic is now handled via eventBus -> updateSpectralLighting
        // We can use it to force set specific colors if needed
        const leftColor = typeof leftHighestColor === 'string' ? leftHighestColor : 'rgba(255,255,255,0.1)';
        const rightColor = typeof rightHighestColor === 'string' ? rightHighestColor : 'rgba(255,255,255,0.1)';
        
        // Apply global variables
        document.documentElement.style.setProperty('--spectral-color-left', leftColor);
        document.documentElement.style.setProperty('--spectral-color-right', rightColor);
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
