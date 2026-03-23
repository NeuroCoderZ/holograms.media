// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

let inputProxyNode = null;

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

    const payload = { levels: modulated.levels, pans: fullPans };

    // ПРИНУДИТЕЛЬНЫЙ ЛОГ (раз в секунду)
    // Периодический лог для проверки данных (раз в секунду)
    // if (!window._lastAudioLog || Date.now() - window._lastAudioLog > 1000) {
    //     const max = Math.max(...payload.levels);
    //     const min = Math.min(...payload.levels);
    //     const first5 = Array.from(payload.levels.slice(0, 5)).map(v => v.toFixed(2)).join(', ');
    //     console.log(`[Flow Check] data: max=${max.toFixed(2)}, min=${min.toFixed(2)}, first5=[${first5}]`);
    //     window._lastAudioLog = Date.now();
    // }

    // Отправляем в рендерер
    eventBus.emit('audioData', payload);
});
export async function initializeCwtWorklet(audioContext) {
    console.log('[AudioProcessing] 🚀 Requesting CQT initialization from AudioService...');
    await audioService.initialize();
    const node = audioService.createWorkletNode();
    const ctx = audioContext || audioService.getAudioContext();

    // Ensure context is running (Non-blocking to prevent init hang)
    if (ctx.state === 'suspended') {
        console.log('[AudioProcessing] ⚠ AudioContext suspended. Resuming in background...');
        ctx.resume().catch(err => {
            console.warn('[AudioProcessing] Could not resume context during init:', err.message);
        });
    }

    const proxy = getInputProxyNode(ctx);
    if (node && proxy) {
        try {
            proxy.disconnect(node);
        } catch (e) { }
        proxy.connect(node);

        // FORCING DATA FLOW: Connect to destination via silent gain
        // This ensures the browser calls process() even if the output isn't used for audio.
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        node.connect(silentGain);
        silentGain.connect(ctx.destination);

        console.log('[AudioProcessing] ✅ Pipeline Linked: Proxy -> Worklet -> Silent Output');
    }
    return true;
}

export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    const proxy = getInputProxyNode(audioContext);
    sourceNode.connect(proxy);
    await initializeCwtWorklet(audioContext);
    if (connectToOutput) sourceNode.connect(audioContext.destination);
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
}
