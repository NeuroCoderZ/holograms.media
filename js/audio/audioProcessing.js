// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

// ═══ Proxy-архитектура BasilaQ-256 ═══
// Единая точка входа для всех аудио-источников (файл, микрофон, голос Триа)
let inputProxyNode = null;
let _cqtConnectedSource = null;

export function getAudioContext() { return audioService.getAudioContext(); }

/**
 * Проверяет, активен ли CWT-анализатор (AudioWorklet + WASM).
 * @returns {boolean}
 */
export function isCwtActive() {
    return !!audioService.workletNode;
}

/**
 * Возвращает или создаёт Proxy Gain Node — единую точку входа
 * для всех аудио-источников, которые должны пройти через BasilaQ-256.
 */
function getInputProxyNode(ctx) {
    if (!inputProxyNode) {
        inputProxyNode = ctx.createGain();
        inputProxyNode.gain.value = 1.0;
        console.log('[AudioProcessing] 🔗 Proxy Gain Node created');
    }
    return inputProxyNode;
}

/**
 * Экспорт getInputProxyNode для внешнего использования (LiveAudioService).
 */
export { getInputProxyNode };

/**
 * Сбрасывает proxy-ноду для корректного пересоздания при следующем воспроизведении.
 * КРИТИЧНО: без этого старый proxy остаётся подключён к мёртвому воркеру.
 */
export function resetInputProxy() {
    if (inputProxyNode) {
        try { inputProxyNode.disconnect(); } catch (_) {}
        inputProxyNode = null;
    }
    if (typeof silentGainNode !== 'undefined' && silentGainNode) {
        try { silentGainNode.disconnect(); } catch (_) {}
        silentGainNode = null;
    }
    _cqtConnectedSource = null;
}

// ВАЖНО: Мы не перезаписываем onmessage, а подписываемся на событие из шины данных
let _lastSpectralLog = 0;
const _LOG_INTERVAL = 30000; // Логируем каждые 30 секунд (было 10с)

eventBus.on('audio:spectralData', (data) => {
    const now = Date.now();
    const shouldLog = (window.__debugSpectral || !window._spectralDataHandlerLog) && (now - _lastSpectralLog > _LOG_INTERVAL);
    
    if (shouldLog) {
        console.log('[AudioProcessing] ⚡ spectralData:', {
            levelsLen: data?.levels?.length,
            anglesLen: data?.angles?.length
        });
        if (!window._spectralDataHandlerLog) window._spectralDataHandlerLog = true;
        _lastSpectralLog = now;
    }

    // Если данных нет, даже не тратим время
    if (!data.levels || data.levels[0] === undefined) {
        if (shouldLog) {
            console.warn('[AudioProcessing] ⚠️ Empty audio:spectralData - SKIPPING');
        }
        return;
    }

    // DIAGNOSTIC: Что приходит от CWT Worklet?
    if (!window._cwtInputLog) {
        const maxLv = Math.max(...data.levels);
        const minLv = Math.min(...data.levels);
        console.log('[AudioProcessing] 📥 CWT Input raw:', {
            levelsSample: Array.from(data.levels.slice(0, 5)),
            anglesSample: data.angles ? Array.from(data.angles.slice(0, 5)) : 'no angles',
            maxLevel: maxLv,
            minLevel: minLv,
            isFallback: data.isFallback || false
        });
        window._cwtInputLog = true;
    }

    const modulation = state.multimodal?.gestureModulationData;
    const isSynth = state.audio?.isGestureSynthMode;

    // Обработка жестов
    const modulated = AudioGestureBridge.applyModulation(
        { levels: data.levels, pans: data.angles },
        modulation,
        isSynth
    );

    const fullPans = new Float32Array(256);
    if (modulated.pans.length === 128) {
        fullPans.set(modulated.pans, 0);
        fullPans.set(modulated.pans, 128);
    } else {
        fullPans.set(modulated.pans);
    }

    // FIX: Ensure Levels are also 256 length (Stereo duplication if Mono)
    // The Renderer expects indices i+128 to exist.
    // dB SPL: 0 = тишина, 128 = максимум
    const fullLevels = new Float32Array(256).fill(0); // Default silence (0 dB SPL)
    if (modulated.levels.length === 128) {
        fullLevels.set(modulated.levels, 0);
        fullLevels.set(modulated.levels, 128);
    } else if (modulated.levels.length === 256) {
        fullLevels.set(modulated.levels);
    } else {
        // Fallback for unexpected lengths
        fullLevels.set(modulated.levels.slice(0, 256));
    }

    const payload = { levels: fullLevels, pans: fullPans };

    // Store in state for fallback/recovery
    if (state.audio) {
        state.audio.latestAudioData = payload;
    }

    // DIAGNOSTIC: Log payload before emit
    if (!window._audioDataEmittedLog) {
        console.log('[AudioProcessing] 📤 Emit audioData:', {
            levelsSample: payload.levels.slice(0, 5),
            pansSample: payload.pans.slice(0, 5),
            maxLevel: Math.max(...payload.levels),
            minLevel: Math.min(...payload.levels),
            stateAudioIsPlaying: state.audio?.isPlaying,
            stateAudioActiveSource: state.audio?.activeSource
        });
        window._audioDataEmittedLog = true;
    }

    // Отправляем в рендерер
    eventBus.emit('audioData', payload);
});
/**
 * Оценка частоты обновления экрана (FPS) для синхронизации AudioWorklet.
 * Замеряет интервал между 60 кадрами rAF для точности (поддержка 24-240 Гц).
 */
async function estimateScreenFPS() {
    return new Promise(resolve => {
        let frameCount = 0;
        let samples = [];
        let lastTime = performance.now();

        function check(time) {
            samples.push(time - lastTime);
            lastTime = time;
            frameCount++;
            if (frameCount < 60) {
                requestAnimationFrame(check);
            } else {
                // Убираем первые 2 замера (нестабильные)
                const avgInterval = samples.slice(2).reduce((a, b) => a + b, 0) / (samples.length - 2);
                const fps = Math.round(1000 / avgInterval);
                // Стандартные частоты: 24, 25, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 200, 240
                const commonRates = [24, 25, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 200, 240];
                const closest = commonRates.reduce((prev, curr) =>
                    Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
                );
                const snapped = closest || fps;
                // Clamp to valid range
                const result = Math.max(24, Math.min(240, snapped));
                console.log(`[AudioProcessing] 🖥️ FPS detection: raw=${fps}, snapped=${snapped}, final=${result}`);
                resolve(result);
            }
        }
        requestAnimationFrame(check);
    });
}

let silentGainNode = null;

export async function initializeCwtWorklet(audioContext) {
    const ctx = audioContext || audioService.getAudioContext();

    // Если worklet уже создан — просто вернём его (синглтон в AudioService)
    if (audioService.workletNode) {
        window._cwtLinked = true;
        return audioService.workletNode;
    }

    console.log('[AudioProcessing] 🚀 Creating CWT Worklet...');

    // Детектируем FPS экрана (24-240 Гц)
    const screenFps = await estimateScreenFPS();
    console.log(`[AudioProcessing] 🖥️ Detected Screen FPS: ${screenFps}`);
    state.performance = { ...state.performance, screenFps };

    await audioService.initialize();

    // Создаём worklet с целевым FPS
    const node = audioService.createWorkletNode('file', { targetFps: screenFps });

    // Ensure context is running (Non-blocking)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(err => {
            console.warn('[AudioProcessing] Could not resume context during init:', err.message);
        });
    }

    // Подключаем worklet к destination — звук проходит через WASM-анализ
    node.connect(ctx.destination);

    window._cwtLinked = true;
    console.log('[AudioProcessing] ✅ Worklet created and linked to destination');

    return node;
}

/**
 * Подключает аудио-источник к BasilaQ-256 через Proxy-архитектуру.
 * Цепочка: sourceNode -> Proxy -> Worklet(WASM) -> Destination
 *
 * При первом вызове создаёт полный pipeline.
 * При повторных — только подключает sourceNode к существующему proxy.
 *
 * @param {AudioNode} sourceNode - Источник (GainNode, MediaStreamSource, BufferSource)
 * @param {AudioContext} audioContext
 */
export async function setupAudioProcessing(sourceNode, audioContext) {
    const ctx = audioContext || audioService.getAudioContext();

    // Подключаем source к proxy
    const proxy = getInputProxyNode(ctx);
    sourceNode.connect(proxy);

    if (!audioService.workletNode) {
        // Первый вызов — создаём полный pipeline
        const workletNode = await initializeCwtWorklet(audioContext);
        proxy.connect(workletNode);
        window._cqtConnected = true;
        return workletNode;
    }

    // Повторный вызов — worklet уже существует, НО нужно подключить proxy к нему!
    const workletNode = audioService.workletNode;
    proxy.connect(workletNode);
    window._cwtLinked = true;
    window._cqtConnected = true;
    console.log('[AudioProcessing] ♻️ Reusing existing CWT pipeline, proxy connected');
    return workletNode;
}

/**
 * Диагностический модуль: pipeline health check.
 * Запускается после старта воспроизведения для контроля Audio → WASM → 3D Pipeline.
 */
export function runBasilaQHealthCheck() {
    console.log('[BasilaQ-HEALTH] 🔍 Initiating pipeline diagnostics...');
    
    // 1. WASM / Worklet Status
    const isWasmActive = isCwtActive();
    console.log(`[BasilaQ-HEALTH] WASM/Worklet: ${isWasmActive ? '✅ ACTIVE (Pure Rust CWT)' : '❌ DISCONNECTED'}`);
    
    // 2. Proxy Connection
    const proxyConnected = !!inputProxyNode && window._cwtLinked;
    console.log(`[BasilaQ-HEALTH] Pipeline Proxy: ${proxyConnected ? '✅ CONNECTED (Source -> Proxy -> Worklet)' : '❌ BROKEN'}`);

    // 3. Data Flow / Levels Range
    if (isWasmActive && proxyConnected) {
        let hasMonitored = false;
        const healthListener = (data) => {
            if (hasMonitored) return;
            hasMonitored = true;
            
            // Unsubscribe immediately to prevent memory leaks / overhead
            eventBus.off('audioData', healthListener);
            
            if (data && data.levels && data.levels.length > 0) {
                // Calculate min/max to verify data isn't crushed to -128
                let min = Infinity, max = -Infinity;
                for(let i=0; i<data.levels.length; i++) {
                    if(data.levels[i] < min) min = data.levels[i];
                    if(data.levels[i] > max) max = data.levels[i];
                }
                const isSilent = max <= -128;
                console.log(`[BasilaQ-HEALTH] Spectral Data: ${isSilent ? '⚠️ SILENT FRAME (-128dB flatine)' : '✅ FLOWING'} (Range: ${min.toFixed(1)}dB to ${max.toFixed(1)}dB, Length: ${data.levels.length})`);
            } else {
                console.log('[BasilaQ-HEALTH] Spectral Data: ❌ NO METRICS IN PAYLOAD');
            }
        };
        
        // Listen for exactly one audio-visual data chunk
        eventBus.on('audioData', healthListener);
        
        // Timeout if no data comes within 2 seconds
        setTimeout(() => {
            if (!hasMonitored) {
                hasMonitored = true;
                eventBus.off('audioData', healthListener);
                console.log('[BasilaQ-HEALTH] Spectral Data: ❌ TIMEOUT (Pipeline is stalled!)');
            }
        }, 2000);
    }
}

/**
 * Сбрасывает буферы CWT-анализатора в WASM.
 * Вызывается при смене трека или нажатии Stop.
 * Performs a hard reset by destroying the WorkletNode via AudioService.
 */
export function resetCwtAnalyzer() {
    console.log('[AudioProcessing] 🔄 Performing Soft Reset of CWT Analyzer...');
    audioService.resetCwtBuffers();  // НЕ уничтожаем worklet, только сброс буферов
    window._cwtLinked = false;   // следующий source переподключится к proxy
    window._cqtConnected = false; // [BUG-FIX] источник должен переподключиться к proxy!
    resetInputProxy();            // [BUG-FIX] убиваем старый proxy (он висит на мёртвом воркере)
    window._pipelineVerified = false; // сбрасываем маркер первых данных

    // Уведомляем рендерер чтобы сбросил stale данные
    eventBus.emit('audioReset', {});
    console.log('[AudioProcessing] ✅ Soft reset complete. Worklet preserved.');
}
