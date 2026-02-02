// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';
import audioService from '../services/AudioService.js';

let inputProxyNode = null;

export function getAudioContext() { return audioService.getAudioContext(); }

function getInputProxyNode(ctx) {
    if (!inputProxyNode) {
        inputProxyNode = ctx.createGain();
        inputProxyNode.gain.value = 1.0;
    }
    return inputProxyNode;
}

// Подписываемся на события от AudioService
// AudioService.js внутри себя делает: eventBus.emit('audio:spectralData', event.data)
eventBus.on('audio:spectralData', (data) => {
    if (!data.levels) return;
    
    const modulation = state.multimodal?.gestureModulationData;
    const isSynth = state.audio?.isGestureSynthMode;

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
    
    // Лог для проверки: если Max dB > -100, значит данные живые
    if (!window._dbgAudio) window._dbgAudio = 0;
    if (window._dbgAudio++ % 60 === 0) {
        console.log(`[Flow Check] Spectral Data OK. Max level: ${Math.max(...payload.levels).toFixed(1)} dB`);
    }

    eventBus.emit('audioData', payload);
});

export async function initializeCwtWorklet(audioContext) {
    await audioService.initialize();
    const node = audioService.createWorkletNode();
    if (inputProxyNode && node) {
        // Проверяем, не подключены ли мы уже
        try {
            inputProxyNode.disconnect(node);
        } catch(e) {}
        inputProxyNode.connect(node);
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