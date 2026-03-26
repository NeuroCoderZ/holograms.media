/**
 * LightingManager.js - Управление динамическим освещением интерфейса.
 * Оптимизировано для экстремальной производительности и сочных ПЕР-ЭЛЕМЕНТНЫХ бликов.
 * Теперь столбцы голограммы — единственный источник света.
 */
import eventBus from '../core/eventBus.js';
import { glassSpecularManager } from './glassSpecularManager.js';
import { semitones } from '../config/hologramConfig.js';

export class LightingManager {
    constructor() {
        this.elements = [];
        this.rectCache = new Map();
        
        this._onSpectralData = this._onSpectralData.bind(this);
        
        // Throttling: 30fps для UI вполне достаточно
        this._lastUpdateTime = 0;
        this._updateInterval = 33; 
    }

    initialize() {
        if (this._initialized) return;
        this._initialized = true;

        window.addEventListener('resize', this.handleResize);
        
        // Подписка на данные BasilaQ-128
        eventBus.on('audio:spectralData', this._onSpectralData);

        this.refreshElements();
        console.log("LightingManager v20.3: Emissive Columns Mode with Dynamic DOM Tracking.");
        
        // Track dynamically added UI elements (like panels and buttons)
        this._observer = new MutationObserver(() => this.refreshElements());
        this._observer.observe(document.body, { childList: true, subtree: true });

        // Пересчёт при скролле — элементы правой панели меняют Y-позицию
        this._scrollHandler = this._onScroll.bind(this);
        document.addEventListener('scroll', this._scrollHandler, { passive: true, capture: true });
    }

    refreshElements() {
        // ОГРАНИЧИВАЕМ: Только кнопки и панели. 
        const coreElements = document.querySelectorAll('.control-button, .panel, .glass-panel, #gesture-area, .rp-tab');
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
        this.refreshElements();
    }

    _onScroll() {
        // Throttle: пересчёт не чаще 10 раз в секунду
        const now = performance.now();
        if (!this._lastScrollUpdate || now - this._lastScrollUpdate > 100) {
            this._lastScrollUpdate = now;
            this.updateRectCache();
        }
    }

    _onSpectralData(data) {
        if (!data || !data.levels) return;
        
        const now = performance.now();
        if (now - this._lastUpdateTime < this._updateInterval) return;
        this._lastUpdateTime = now;

        // Поиск макс. амплитуды
        const count = data.levels.length;
        const columnData = [];
        
        for (let i = 0; i < Math.min(128, count); i++) {
            const amp = data.levels[i];
            // В демо-режиме (тишина, -128 dBFS) — используем z_shade как базовую яркость
            const isDemo = amp <= -127;
            let amplitudeNorm;
            if (isDemo) {
                // z_shade.id от 0 до 127 → normalised brightness 0.01..0.5
                // Демо-блики: яркие, но не максимальные
                amplitudeNorm = (i / 127) * 0.45 + 0.05;
            } else {
                if (amp < -100) continue;
                amplitudeNorm = Math.max(0, (amp + 100) / 100);
            }
            if (amplitudeNorm > 0.03) {
                // Вычисляем HUE точно как в hologramConfig.js
                const hue = (270 * i) / 127; 
                columnData.push({
                    freq: i,
                    amplitude: amplitudeNorm,
                    color: `hsl(${hue}, 100%, 60%)`, // Строка HSL для glassSpecularManager
                    panX: data.angles ? data.angles[i] : 0
                });
            }
        }
        
        if (columnData.length > 0) {
            this.updateSpectralLighting(columnData);
        } else {
            // Очистка если тишина
            this.elements.forEach(el => {
                el.style.setProperty('--glass-specular', 'transparent');
            });
        }
    }
    
    updateSpectralLighting(columnData) {
        // Топ-3 доминирующих частоты для расчёта бликов
        const topColumns = columnData
            .sort((a, b) => b.amplitude - a.amplitude)
            .slice(0, 3);

        this.elements.forEach(el => {
            const cache = this.rectCache.get(el);
            if (!cache) return;

            let maxInfluence = 0;
            let dominantCol = null;

            topColumns.forEach(col => {
                const colScreenX = (col.panX + 1) / 2;
                const dx = colScreenX - cache.centerX;
                const dist = Math.abs(dx) + 0.25; 
                
                const influence = col.amplitude / (dist * dist);
                if (influence > maxInfluence) {
                    maxInfluence = influence;
                    dominantCol = col;
                }
            });

            if (dominantCol && maxInfluence > 0.15) {
                // Множитель 5.0 для сочности бликов
                const mix = Math.min(1, maxInfluence * 5.0);
                glassSpecularManager.applyGlint(el, mix, dominantCol.color, dominantCol.panX);
            } else {
                el.style.setProperty('--glass-specular', 'transparent');
            }
        });
    }

    updateSpectralColors() {}
}

export const lightingManager = new LightingManager();
export default lightingManager;
