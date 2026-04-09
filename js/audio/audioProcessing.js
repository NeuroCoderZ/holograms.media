// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

export function getAudioContext() { return audioService.getAudioContext(); }

// ВАЖНО: Мы не перезаписываем onmessage, а подписываемся на событие из шины данных
let _lastSpectralLog = 0;
const _LOG_INTERVAL = 3000; // Логируем каждые 3 секунды

eventBus.on('audio:spectralData', (data) => {
    const now = Date.now();
    const shouldLog = !window._spectralDataHandlerLog || (now - _lastSpectralLog > _LOG_INTERVAL);
    
    if (shouldLog) {
        console.log('[AudioProcessing] ⚡ audio:spectralData handler:', {
            hasData: !!data,
            hasLevels: !!(data?.levels),
            hasAngles: !!(data?.angles),
            levelsLen: data?.levels?.length,
            anglesLen: data?.angles?.length,
            levelsSample: data?.levels ? Array.from(data.levels.slice(0, 3)) : 'N/A',
            anglesSample: data?.angles ? Array.from(data.angles.slice(0, 3)) : 'N/A'
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
    const fullLevels = new Float32Array(256).fill(-128); // Default silence
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
 * Замеряет интервал между 20 кадрами rAF.
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
            if (frameCount < 20) {
                requestAnimationFrame(check);
            } else {
                // Убираем первый замер (он часто неточный)
                const avgInterval = samples.slice(1).reduce((a, b) => a + b, 0) / (samples.length - 1);
                const fps = Math.round(1000 / avgInterval);
                // Стандартные затыки: 60, 75, 90, 120, 144, 240
                const commonRates = [60, 75, 90, 120, 144, 240];
                const closest = commonRates.reduce((prev, curr) => 
                    Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
                );
                resolve(closest || fps);
            }
        }
        requestAnimationFrame(check);
    });
}

let silentGainNode = null;

export async function initializeCwtWorklet(audioContext) {
    console.log('[AudioProcessing] 🚀 Requesting CQT initialization...');
    
    // 1. Детектируем FPS экрана ПЕРЕД запуском ворклета
    const screenFps = await estimateScreenFPS();
    console.log(`[AudioProcessing] 🖥️ Detected Screen FPS: ${screenFps}`);
    state.performance = { ...state.performance, screenFps };

    await audioService.initialize();
    
    // Передаем FPS в опции создания ноды
    const node = audioService.createWorkletNode('file', { targetFps: screenFps });
    const ctx = audioContext || audioService.getAudioContext();

    // Ensure context is running (Non-blocking to prevent init hang)
    if (ctx.state === 'suspended') {
        console.log('[AudioProcessing] ⚠ AudioContext suspended. Resuming in background...');
        ctx.resume().catch(err => {
            console.warn('[AudioProcessing] Could not resume context during init:', err.message);
        });
    }


    return node;
}

export async function setupAudioProcessing(audioContext) {
    const workletNode = await initializeCwtWorklet(audioContext);
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
    console.log('[AudioProcessing] 🔄 Performing Hard Reset of CWT Analyzer...');
    audioService.resetWorklet();
    window._cwtLinked = false;   // новый воркер может подсоединиться к proxy
    window._cqtConnected = false; // [BUG-FIX] источник должен переподключиться к proxy!
    window._pipelineVerified = false; // сбрасываем маркер первых данных
    
    // Уведомляем рендерер чтобы сбросил stale данные
    eventBus.emit('audioReset', {});
    console.log('[AudioProcessing] ✅ Full reset complete. _cqtConnected=false, proxy=null');
}
