/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Оптимизировано для экстремальной производительности и сочных бликов.
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
        
        // Throttling: 24fps для UI вполне достаточно, экономит кучу ресурсов
        this._lastUpdateTime = 0;
        this._updateInterval = 40; 
        
        this._glintOverlay = null;
        this._glintSpot = null;
    }

    initialize() {
        if (this._initialized) return;
        this._initialized = true;

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        
        eventBus.on('audio:spectralData', this._onSpectralData);

        this.refreshElements();
        console.log("LightingManager v20.1: Ultra-Perf Mode Active.");
    }

    refreshElements() {
        // ОГРАНИЧИВАЕМ: Только кнопки и панели. Сообщения чата не подсвечиваем индивидуально.
        const coreElements = document.querySelectorAll('.control-button, .panel, .glass-panel, #gesture-area');
        this.elements = Array.from(coreElements);
        
        this.updateRectCache();
    }

    updateRectCache() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        this.rectCache.clear();
        this.elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.rectCache.set(el, {
                    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
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
    }

    handleMouseMove = (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        // Мышиные блики отключены по просьбе пользователя
    }

    _onSpectralData(data) {
        if (!data || !data.levels) return;
        
        const now = performance.now();
        if (now - this._lastUpdateTime < this._updateInterval) return;
        this._lastUpdateTime = now;

        // Поиск макс. амплитуды (для логов и порога)
        let maxAmp = -128;
        const count = data.levels.length;
        const columnData = [];
        
        // Используем нормализованные данные для расчетов
        for (let i = 0; i < Math.min(128, count); i++) {
            const amp = data.levels[i];
            if (amp > maxAmp) maxAmp = amp;
            
            if (amp < -100) continue; 
            
            const amplitudeNorm = Math.max(0, (amp + 100) / 100);
            if (amplitudeNorm > 0.05) {
                columnData.push({
                    freq: i,
                    amplitude: amplitudeNorm,
                    color: `hsl(${(i / 128) * 300}, 100%, 55%)`,
                    panX: data.angles ? data.angles[i] : 0
                });
            }
        }
        
        if (columnData.length > 0) {
            this.updateSpectralLighting(columnData);
        } else {
            this._hideGlintOverlay();
        }
    }
    
    updateSpectralLighting(columnData) {
        // Берем топ-3 пика
        const topColumns = columnData
            .sort((a, b) => b.amplitude - a.amplitude)
            .slice(0, 3);

        if (topColumns.length === 0) {
            this._hideGlintOverlay();
            return;
        }

        const dominant = topColumns[0];
        const brightColor = glassSpecularManager.getBrightColor(dominant.color);
        
        // Позиция блика: -1..1 -> 0%..100%
        const glintX = ((dominant.panX + 1) / 2 * 100);
        
        // Масштабируем интенсивность (множитель 3.5 для сочности)
        const intensity = Math.min(1, dominant.amplitude * 3.5);
        const spread = Math.round(30 + 40 * intensity);

        // Показываем оверлей
        this._showGlintOverlay(
            `radial-gradient(ellipse at ${glintX.toFixed(0)}% 45%, ${brightColor} 0%, transparent ${spread}%)`
        );
    }

    _showGlintOverlay(gradient) {
        if (!this._glintOverlay) {
            this._glintOverlay = document.getElementById('spectral-glint-overlay');
            this._glintSpot = document.getElementById('spectral-glint-spot');
        }
        
        if (this._glintOverlay && this._glintSpot) {
            if (this._glintOverlay.style.display !== 'block') {
                this._glintOverlay.style.display = 'block';
            }
            this._glintSpot.style.background = gradient;
            this._glintSpot.style.opacity = '0.8'; // Доп. яркость
        }
    }

    _hideGlintOverlay() {
        if (this._glintOverlay) {
            this._glintOverlay.style.display = 'none';
        }
    }

    // Совместимость (пустой метод для исключения ошибок)
    updateSpectralColors() {}
}

export const lightingManager = new LightingManager();
export default lightingManager;
