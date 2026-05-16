/**
 * pipelineSelfTest.js — Runtime-диагностика BasilaQ-256
 * ======================================================
 * Запускается ОДИН РАЗ при инициализации ядра.
 * Проверяет 5 шагов аудио-визуализационного конвейера.
 *
 * Результат:
 *   ✅ 5/5 — Pipeline VERIFIED
 *   ❌ X/5 — Pipeline FAILED (с деталями)
 *
 * Визуальный индикатор при фейле: красный бейдж в правом нижнем углу.
 */

import eventBus from '../core/eventBus.js';

export class PipelineSelfTest {
    constructor() {
        this.results = {};
        this.totalSteps = 5;
        this.startTime = null;
    }

    async run() {
        this.startTime = performance.now();
        console.log('[PipelineSelfTest] 🧪 Starting self-test...');

        // Шаг 1: AudioContext
        await this._step1_AudioContext();

        // Шаг 2: WASM
        await this._step2_WASM();

        // Шаг 3: Worklet
        await this._step3_Worklet();

        // Шаг 4: Данные от CWT
        await this._step4_DataFlow();

        // Шаг 5: Рендерер
        await this._step5_Renderer();

        // Итог
        this._report();
    }

    async _step1_AudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const ok = ctx.state === 'running' && ctx.sampleRate === 48000;
            this.results.audioContext = ok ? 'pass' : 'warn';
            this.results.audioContextDetail = `state=${ctx.state}, rate=${ctx.sampleRate}`;
            console.log(`[PipelineSelfTest] Step 1: AudioContext — ${this.results.audioContext} (${this.results.audioContextDetail})`);
            ctx.close();
        } catch (e) {
            this.results.audioContext = 'fail';
            this.results.audioContextDetail = e.message;
            console.error(`[PipelineSelfTest] Step 1: AudioContext — FAIL (${e.message})`);
        }
    }

    async _step2_WASM() {
        try {
            const response = await fetch('/wasm/cwt_analyzer.wasm');
            if (!response.ok) {
                this.results.wasm = 'fail';
                this.results.wasmDetail = `HTTP ${response.status}`;
                return;
            }
            const contentType = response.headers.get('Content-Type');
            const buffer = await response.arrayBuffer();
            const size = buffer.byteLength;
            const ok = size > 1000 && (contentType === 'application/wasm' || contentType === 'application/octet-stream');
            this.results.wasm = ok ? 'pass' : 'warn';
            this.results.wasmDetail = `${Math.round(size / 1024)} KB, MIME: ${contentType}`;
        } catch (e) {
            this.results.wasm = 'fail';
            this.results.wasmDetail = e.message;
        }
        console.log(`[PipelineSelfTest] Step 2: WASM — ${this.results.wasm} (${this.results.wasmDetail})`);
    }

    async _step3_Worklet() {
        // Проверяем что AudioWorklet загружен и WASM инициализирован
        // Ждём до 3 секунд
        const timeout = 3000;
        const start = Date.now();

        return new Promise((resolve) => {
            const check = () => {
                if (Date.now() - start > timeout) {
                    this.results.worklet = 'fail';
                    this.results.workletDetail = `Timeout ${timeout}ms — WORKLET_READY not received`;
                    console.log(`[PipelineSelfTest] Step 3: Worklet — ${this.results.worklet} (${this.results.workletDetail})`);
                    resolve();
                    return;
                }

                // Проверяем что AudioService инициализирован
                const { default: audioService } = window._audioServiceForTest || {};
                if (audioService && audioService.workletNode) {
                    this.results.worklet = 'pass';
                    this.results.workletDetail = 'WorkletNode created';
                    console.log(`[PipelineSelfTest] Step 3: Worklet — ${this.results.worklet} (${this.results.workletDetail})`);
                    resolve();
                    return;
                }

                // Проверяем window флаги
                if (window._cwtLinked) {
                    this.results.worklet = 'pass';
                    this.results.workletDetail = '_cwtLinked=true';
                    console.log(`[PipelineSelfTest] Step 3: Worklet — ${this.results.worklet} (${this.results.workletDetail})`);
                    resolve();
                    return;
                }

                setTimeout(check, 200);
            };
            check();
        });
    }

    async _step4_DataFlow() {
        return new Promise((resolve) => {
            const timeout = 5000;
            let resolved = false;

            const timer = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.results.dataFlow = 'fail';
                this.results.dataFlowDetail = `Timeout ${timeout}ms — no audioData received`;
                console.log(`[PipelineSelfTest] Step 4: DataFlow — ${this.results.dataFlow} (${this.results.dataFlowDetail})`);
                eventBus.off('audioData', listener);
                resolve();
            }, timeout);

            const listener = (data) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timer);
                eventBus.off('audioData', listener);

                const hasLevels = data && data.levels && data.levels.length === 256;
                const hasPans = data && data.pans && data.pans.length === 256;
                const ok = hasLevels && hasPans;

                this.results.dataFlow = ok ? 'pass' : 'warn';
                this.results.dataFlowDetail = `levels=${data?.levels?.length}, pans=${data?.pans?.length}, maxLevel=${data?.levels ? Math.max(...data.levels).toFixed(1) : 'N/A'}dB`;
                console.log(`[PipelineSelfTest] Step 4: DataFlow — ${this.results.dataFlow} (${this.results.dataFlowDetail})`);
                resolve();
            };

            eventBus.on('audioData', listener);
        });
    }

    async _step5_Renderer() {
        // Проверяем что HologramRenderer получил данные
        await new Promise(r => setTimeout(r, 500)); // Небольшая задержка

        const renderer = window._hologramRendererForTest;
        if (renderer && renderer.latestCwtData) {
            const d = renderer.latestCwtData;
            const ok = d.levels && d.levels.length >= 256;
            this.results.renderer = ok ? 'pass' : 'warn';
            this.results.rendererDetail = `latestCwtData: levels=${d.levels?.length}, max=${d.levels ? Math.max(...d.levels).toFixed(1) : 'N/A'}dB`;
        } else {
            this.results.renderer = 'fail';
            this.results.rendererDetail = 'HologramRenderer not receiving data';
        }
        console.log(`[PipelineSelfTest] Step 5: Renderer — ${this.results.renderer} (${this.results.rendererDetail})`);
    }

    _report() {
        const elapsed = Math.round(performance.now() - this.startTime);
        const passCount = Object.values(this.results).filter(v => v === 'pass').length;
        const failCount = Object.values(this.results).filter(v => v === 'fail').length;
        const warnCount = Object.values(this.results).filter(v => v === 'warn').length;

        console.log('\n' + '='.repeat(60));
        console.log(`[PipelineSelfTest] 📊 Results (${elapsed}ms):`);
        console.log(`  Steps: ✅ ${passCount} | ❌ ${failCount} | ⚠️  ${warnCount}`);

        for (const [step, status] of Object.entries(this.results)) {
            if (status === 'pass') continue;
            const detail = this.results[step + 'Detail'] || '';
            console.log(`  ${step}: ${status.toUpperCase()} — ${detail}`);
        }

        if (failCount === 0) {
            console.log(`\n[PipelineSelfTest] ✅ Pipeline VERIFIED (${passCount}/${this.totalSteps} passed)`);
        } else {
            console.error(`\n[PipelineSelfTest] ❌ Pipeline FAILED (${failCount} failures)`);
            this._showErrorBadge();
        }
    }

    _showErrorBadge() {
        const badge = document.createElement('div');
        badge.id = 'pipeline-test-error';
        badge.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 99999;
            background: #c62828; color: white; padding: 12px 20px; border-radius: 8px;
            font-family: monospace; font-size: 13px; cursor: pointer; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        `;

        const fails = Object.entries(this.results)
            .filter(([_, v]) => v === 'fail')
            .map(([k, _]) => {
                const detail = this.results[k + 'Detail'] || 'unknown';
                return `${k}: ${detail}`;
            })
            .join('<br>');

        badge.innerHTML = `⚠️ AUDIO PIPELINE FAILED<br><small style="opacity:0.8">${fails}</small>`;
        badge.title = 'Click for details';
        badge.addEventListener('click', () => {
            alert(`BasilaQ-256 Pipeline Self-Test\n\n${JSON.stringify(this.results, null, 2)}`);
        });

        document.body.appendChild(badge);

        // Автоудаление через 30 секунд
        setTimeout(() => {
            if (badge.parentNode) badge.parentNode.removeChild(badge);
        }, 30000);
    }
}

// Singleton
const selfTest = new PipelineSelfTest();
export { selfTest };
export default selfTest;
