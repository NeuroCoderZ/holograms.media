// frontend/js/audio/audioProcessing.js
import { eventBus } from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

let inputProxyNode = null;

export function getAudioContext() { return audioService.getAudioContext(); }

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
    if (!window._lastAudioLog || Date.now() - window._lastAudioLog > 1000) {
        const max = Math.max(...payload.levels);
        console.log(`[Flow Check] Data in EventBus. Max: ${max.toFixed(1)} dB`);
        window._lastAudioLog = Date.now();
    }

    // Отправляем в рендерер
    eventBus.emit('audioData', payload);
});

export async function initializeCwtWorklet(audioContext) {
    console.log('[AudioProcessing] 🚀 Requesting CQT initialization from AudioService...');
    await audioService.initialize();
    const node = audioService.createWorkletNode();
    
    const proxy = getInputProxyNode(audioContext || audioService.getAudioContext());
    if (node && proxy) {
        try { proxy.connect(node); } catch(e) {}
        console.log('[AudioProcessing] ✅ Pipeline Linked: Proxy -> Worklet');
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
