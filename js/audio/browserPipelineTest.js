/**
 * browserPipelineTest.js — Диагностика BasilaQ-128 в браузере
 * ============================================================
 * Запускается при инициализации. Записывает RMS входного сигнала
 * каждого кадра Worklet и выявляет разрывы в цепи AudioNode.
 * 
 * Как читать результат в консоли:
 * - "inputRMS >= 0.01"  → сигнал доходит ✅
 * - "inputRMS < 0.01"   → ТИШИНА — AudioNode цепочка разорвана ❌
 * - "levels max > -30"  → WASM анализирует ✅
 * - "levels max < -80"  → WASM получает тишину ❌
 */

import eventBus from '../core/eventBus.js';
import audioService from '../services/AudioService.js';

export class BrowserPipelineTest {
    constructor() {
        this._frameCount = 0;
        this._maxRmsSeen = 0;
        this._maxDbSeen = -Infinity;
        this._isLogging = false;
    }

    start() {
        console.log('[BrowserPipelineTest] 🧪 Starting browser diagnostic...');

        // Слушаем AUDIO_DATA из AudioService (ДО audioProcessing)
        this._onAudioData = this._onAudioData.bind(this);

        // Перехватываем onmessage workletNode для логов inputRMS
        this._interceptWorklet();

        // Слушаем результаты после audioProcessing
        eventBus.on('audioData', this._onAudioData);
    }

    _interceptWorklet() {
        // Ждём пока workletNode создастся
        const checkWorklet = () => {
            const node = audioService.workletNode;
            if (!node) {
                setTimeout(checkWorklet, 500);
                return;
            }

            // Перехватываем port.onmessage для логирования input
            const originalHandler = node.port.onmessage;
            node.port.onmessage = (event) => {
                if (originalHandler) originalHandler.call(node.port, event);

                const data = event.data;
                if (data.type === 'AUDIO_DATA' && data._inputRms !== undefined) {
                    this._frameCount++;
                    if (data._inputRms > this._maxRmsSeen) this._maxRmsSeen = data._inputRms;

                    // Логируем каждый 30-й кадр
                    if (this._frameCount % 30 === 1) {
                        const dbfs = 20 * Math.log10(data._inputRms + 1e-10);
                        const status = data._inputRms >= 0.01 ? '✅' : '❌ ТИШИНА!';
                        console.log(`[BrowserPipelineTest] Кадр #${this._frameCount}: inputRMS=${data._inputRms.toFixed(6)} (${dbfs.toFixed(1)} dBFS) ${status}`);
                    }
                }
            };

            console.log('[BrowserPipelineTest] ✅ Worklet intercept active');
        };

        checkWorklet();
    }

    _onAudioData(data) {
        if (!data || !data.levels) return;

        const maxDb = Math.max(...data.levels);
        if (maxDb > this._maxDbSeen) this._maxDbSeen = maxDb;

        // Логируем первый кадр и каждые 60
        if (!this._logged || this._frameCount % 60 === 0) {
            const status = maxDb > -30 ? '✅ РЕАЛЬНЫЙ' : maxDb > -80 ? '⚠️ ТИХИЙ' : '❌ ТИШИНА';
            console.log(`[BrowserPipelineTest] 📊 audioData: max_dB=${maxDb.toFixed(1)} ${status}`);
            if (!this._logged) this._logged = true;
        }
    }

    report() {
        const rmsDb = 20 * Math.log10(this._maxRmsSeen + 1e-10);
        console.log('\n' + '='.repeat(60));
        console.log('[BrowserPipelineTest] 📊 DIAGNOSTIC REPORT');
        console.log(`  Frames processed: ${this._frameCount}`);
        console.log(`  Max input RMS: ${this._maxRmsSeen.toFixed(6)} (${rmsDb.toFixed(1)} dBFS)`);
        console.log(`  Max dB seen: ${this._maxDbSeen.toFixed(1)}`);
        console.log('='.repeat(60));

        if (this._maxRmsSeen >= 0.05) {
            console.log('🎉 Worklet получает РЕАЛЬНЫЙ сигнал — маршрутизация ОК!');
        } else if (this._maxRmsSeen >= 0.01) {
            console.log('⚠️ Worklet получает СЛАБЫЙ сигнал — возможна потеря');
        } else {
            console.log('❌ Worklet получает ТИШИНУ! AudioNode chain РАЗОРВАН!');
            console.log('   Проверяй: BufferSource → GainNode → Proxy → Worklet');
        }
    }
}

// Singleton
export const browserPipelineTest = new BrowserPipelineTest();
