/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Perf: rect cache, 30fps throttle, limited elements.
 * Spectral glints: eventBus → _onSpectralData → updateSpectralLighting → glassSpecularManager.applyGlint()
 */
import eventBus from '../core/eventBus.js';
import { glassSpecularManager } from './glassSpecularManager.js';

export class LightingManager {
    constructor() {
        this.elements = [];
        this.rectCache = new Map();
        
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;

        this.mouseX = 0;
        this.mouseY = 0;

        this._onSpectralData = this._onSpectralData.bind(this);
        this._isUpdating = false;
        
        // Throttling for performance
        this._lastUpdateTime = 0;
        this._updateInterval = 32; // ~30fps for UI glints is enough, saves CPU
    }

    initialize() {
        if (this._initialized) return;
        this._initialized = true;

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        
        eventBus.on('audio:spectralData', this._onSpectralData);

        this.refreshElements();
        this.updateLighting();

        console.log("LightingManager: High-Performance Mode Active.");
    }

    refreshElements() {
        // ОГРАНИЧИВАЕМ количество элементов для освещения. 
        // Обрабатываем только кнопки и основные панели. Игнорируем сотни сообщений чата.
        const coreElements = document.querySelectorAll('.control-button, .panel, .glass-panel, #gesture-area');
        this.elements = Array.from(coreElements);
        
        // Добавляем максимум 3 последних сообщения чата
        const chatMsgs = document.querySelectorAll('.chat-message');
        if (chatMsgs.length > 0) {
            this.elements.push(...Array.from(chatMsgs).slice(-3));
        }

        this.updateRectCache();
    }

    updateRectCache() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        this.rectCache.clear();
        this.elements.forEach(el => {
            // Простая проверка на видимость в DOM и вьюпорте
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.rectCache.set(el, {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    centerX: (rect.left + rect.width / 2) / winW,
                    centerY: (rect.top + rect.height / 2) / winH
                });
            }
        });
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
        // Лимитируем частоту обновлений от мыши
        if (!this._isUpdating) {
            this._isUpdating = true;
            requestAnimationFrame(() => {
                this.updateLighting();
                this._isUpdating = false;
            });
        }
    }

    updateLighting() {
        if (this.elements.length === 0) return;
        
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const mouseXNorm = this.mouseX / winW;
        const mouseYNorm = this.mouseY / winH;

        this.elements.forEach(el => {
            const cache = this.rectCache.get(el);
            if (!cache) return;

            const elX = cache.centerX;
            const elY = cache.centerY;
            const dist = Math.hypot(mouseXNorm - elX, mouseYNorm - elY);
            
            if (dist < 0.25) {
                const relX = (this.mouseX - cache.left) / cache.width;
                const relY = (this.mouseY - cache.top) / cache.height;
                const reflectX = Math.max(-50, Math.min(150, relX * 100));
                const reflectY = Math.max(-50, Math.min(150, relY * 100));
                const opacity = (0.25 - dist) / 0.25 * 0.15; 

                el.style.setProperty('--mouse-specular',
                    `radial-gradient(circle at ${reflectX.toFixed(1)}% ${reflectY.toFixed(1)}%, 
                    rgba(255,255,255,${opacity.toFixed(3)}) 0%, 
                    transparent 40%)`
                );
            } else {
                el.style.setProperty('--mouse-specular', 'transparent');
            }

            const dx = (elX * winW) - this.centerX;
            const dy = (elY * winH) - this.centerY;
            el.style.setProperty('--light-x', `${50 - (dx / winW) * 100}%`);
            el.style.setProperty('--light-y', `${50 - (dy / winH) * 100}%`);
        });
    }

    _onSpectralData(data) {
        if (!data || !data.levels) return;
        
        const now = performance.now();
        if (now - this._lastUpdateTime < this._updateInterval) return;
        this._lastUpdateTime = now;

        // Логирование каждые 3 секунды для отладки
        if (!this._lastDebugLog || now - this._lastDebugLog > 3000) {
            const maxAmp = Math.max(...data.levels);
            const anglesLen = data.angles ? data.angles.length : 0;
            console.log(`[LightingManager] elements=${this.elements.length} maxAmp=${maxAmp.toFixed(1)} dB anglesLen=${anglesLen} hasData=${maxAmp > -110}`);
            this._lastDebugLog = now;
        }

        if (Math.random() < 0.01) this.refreshElements();

        // Используем минимум из длин levels и angles чтобы избежать undefined panX
        const levelsLen = data.levels.length;
        const anglesLen = data.angles ? data.angles.length : 0;
        const count = Math.min(levelsLen, anglesLen || levelsLen);
        const columnData = [];
        
        for (let i = 0; i < count; i++) {
            const amp = data.levels[i];
            if (amp < -110) continue; 
            
            const hue = (i / count) * 300; 
            const amplitudeNorm = Math.max(0, (amp + 110) / 110);
            
            if (amplitudeNorm > 0.01) {
                columnData.push({
                    freq: i,
                    amplitude: amplitudeNorm,
                    color: `hsl(${Math.round(hue)}, 100%, 50%)`,
                    panX: (data.angles && typeof data.angles[i] === 'number') ? data.angles[i] : 0
                });
            }
        }
        
        if (columnData.length > 0) {
            this.updateSpectralLighting(columnData);
        } else {
            document.documentElement.style.setProperty('--glass-specular', 'transparent');
        }
    }
    
    updateSpectralLighting(columnData) {
        // 3 самых громких пика
        const topColumns = columnData
            .sort((a, b) => b.amplitude - a.amplitude)
            .slice(0, 3);

        if (topColumns.length === 0 || topColumns[0].amplitude < 0.05) {
            this._hideGlintOverlay();
            return;
        }

        // Берём самый громкий столбец для overlay
        const dominant = topColumns[0];
        const brightColor = glassSpecularManager.getBrightColor(dominant.color);
        const glintX = Math.max(5, Math.min(95, (dominant.panX + 1) / 2 * 100));
        const intensity = Math.min(1, dominant.amplitude * 2.5);
        const spread = Math.round(25 + 35 * intensity);

        // Рендерим блик в overlay (поверх панелей с opacity 0.4)
        this._showGlintOverlay(
            `radial-gradient(ellipse at ${glintX.toFixed(0)}% 45%, ${brightColor} 0%, transparent ${spread}%)`
        );

        // Также обновляем CSS переменные на панелях для mouse-specular
        // (spectral --glass-specular теперь в overlay, не на панелях)
        if (Math.random() < 0.005) {
            console.log(`[GLINT] overlay color=${dominant.color} pos=${glintX.toFixed(0)}% amp=${dominant.amplitude.toFixed(3)}`);
        }
    }

    _showGlintOverlay(gradient) {
        if (!this._glintSpot) {
            this._glintSpot = document.getElementById('spectral-glint-spot');
            this._glintOverlay = document.getElementById('spectral-glint-overlay');
        }
        if (this._glintSpot && this._glintOverlay) {
            this._glintOverlay.style.display = 'block';
            this._glintSpot.style.background = gradient;
        }
    }

    _hideGlintOverlay() {
        if (!this._glintSpot) {
            this._glintSpot = document.getElementById('spectral-glint-spot');
            this._glintOverlay = document.getElementById('spectral-glint-overlay');
        }
        if (this._glintSpot && this._glintOverlay) {
            this._glintOverlay.style.display = 'none';
            this._glintSpot.style.background = 'transparent';
        }
    }

    updateSpectralColors(leftHighestColor, rightHighestColor) {
        const leftColor = typeof leftHighestColor === 'string' ? leftHighestColor : 'rgba(255, 255, 255, 0.1)';
        const rightColor = typeof rightHighestColor === 'string' ? rightHighestColor : 'rgba(255, 255, 255, 0.1)';
        document.documentElement.style.setProperty('--spectral-color-left', leftColor);
        document.documentElement.style.setProperty('--spectral-color-right', rightColor);
    }
}

export const lightingManager = new LightingManager();
export default lightingManager;
