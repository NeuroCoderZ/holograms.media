// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

let inputProxyNode = null;
let _cqtConnectedSource = null; // ссылка на текущий source для корректного отключения

export function getAudioContext() { return audioService.getAudioContext(); }

/**
 * Проверяет, активен ли CWT-анализатор (AudioWorklet).
 * @returns {boolean}
 */
export function isCwtActive() {
    return !!audioService.workletNode;
}

function getInputProxyNode(ctx) {
    if (!inputProxyNode) {
        inputProxyNode = ctx.createGain();
        inputProxyNode.gain.value = 1.0;
        console.log('[AudioProcessing] 🔗 Proxy Gain Node created');
    }
    return inputProxyNode;
}

/**
 * Сбрасывает proxy-ноду для корректного пересоздания при следующем воспроизведении.
 * КРИТИЧНО: без этого старый proxy остаётся подключён к мёртвому воркеру.
 */
export function resetInputProxy() {
    if (inputProxyNode) {
        try { inputProxyNode.disconnect(); } catch (_) {}
        inputProxyNode = null;
    }
    if (silentGainNode) {
        try { silentGainNode.disconnect(); } catch (_) {}
        silentGainNode = null;
    }
    _cqtConnectedSource = null;
}

// ВАЖНО: Мы не перезаписываем onmessage, а подписываемся на событие из шины данных
eventBus.on('audio:spectralData', (data) => {
    // Если данных нет, даже не тратим время
    if (!data.levels || data.levels[0] === undefined) return;

    // DEBUG: Один раз подтверждаем связь
    if (!window._pipelineVerified) {
        console.log('[AudioProcessing] 🟢 First Spectral Data received from EventBus!');
        window._pipelineVerified = true;
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
    const node = audioService.createWorkletNode({ targetFps: screenFps });
    const ctx = audioContext || audioService.getAudioContext();

    // Ensure context is running (Non-blocking to prevent init hang)
    if (ctx.state === 'suspended') {
        console.log('[AudioProcessing] ⚠ AudioContext suspended. Resuming in background...');
        ctx.resume().catch(err => {
            console.warn('[AudioProcessing] Could not resume context during init:', err.message);
        });
    }

    const proxy = getInputProxyNode(ctx);
    if (node && proxy && !window._cwtLinked) {
        proxy.connect(node);

        // FORCING DATA FLOW: Connect to destination via silent gain (синглтон)
        // This ensures the browser calls process() even if the output isn't used for audio.
        if (!silentGainNode) {
            silentGainNode = ctx.createGain();
            silentGainNode.gain.value = 0;
            node.connect(silentGainNode);
            silentGainNode.connect(ctx.destination);
        }

        window._cwtLinked = true;
        console.log('[AudioProcessing] ✅ Pipeline Linked: Proxy -> Worklet -> Silent Output');
    }
    return true;
}

export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    const proxy = getInputProxyNode(audioContext);
    sourceNode.connect(proxy);
    await initializeCwtWorklet(audioContext);
    // УБРАНО: sourceNode.connect(destination) — дублирует звук через gainNode в audioFilePlayer
    return proxy;
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
    resetInputProxy();            // [BUG-FIX] убиваем старый proxy (он висит на мёртвом воркере)
    window._pipelineVerified = false; // сбрасываем маркер первых данных
    
    // Уведомляем рендерер чтобы сбросил stale данные
    eventBus.emit('audioReset', {});
    console.log('[AudioProcessing] ✅ Full reset complete. _cqtConnected=false, proxy=null');
}
