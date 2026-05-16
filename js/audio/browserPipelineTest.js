/**
 * browserPipelineTest.js — Диагностика BasilaQ-256 (первые 10 кадров)
 */

import eventBus from '../core/eventBus.js';

export class BrowserPipelineTest {
    constructor() {
        this._frameCount = 0;
        this._maxFrames = 10;
    }

    start() {
        this._listener = (data) => {
            if (this._frameCount >= this._maxFrames) {
                eventBus.off('audioData', this._listener);
                return;
            }
            this._frameCount++;
            if (data?.levels) {
                const maxDb = Math.max(...data.levels);
                const minDb = Math.min(...data.levels);
                console.log(`[BrowserPipelineTest] Кадр #${this._frameCount}: min=${minDb.toFixed(1)}, max=${maxDb.toFixed(1)} dB`);
            }
        };
        eventBus.on('audioData', this._listener);
        console.log('[BrowserPipelineTest] 🧪 Диагностика запущена (10 кадров)');
    }
}

export const browserPipelineTest = new BrowserPipelineTest();
