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

export async function initializeCwtWorklet(audioContext) {
    if (audioService.workletNode) return true;
    console.log('[AudioProcessing] 🚀 Booting via AudioService...');
    
    await audioService.initialize();
    const node = audioService.createWorkletNode();

    node.port.onmessage = (e) => {
        if (e.data.type === 'AUDIO_DATA') processSpectralData(e.data.levels, e.data.angles);
        if (e.data.type === 'LOG') console.log('[Worklet Log]', e.data.msg);
        if (e.data.type === 'WASM_READY') console.log('[AudioProcessing] ✅ Engine ONLINE');
    };

    if (inputProxyNode) inputProxyNode.connect(node);
    return true;
}

function processSpectralData(rawLevels, rawAngles) {
    const modulation = state.multimodal?.gestureModulationData;
    const isSynth = state.audio?.isGestureSynthMode;

    const data = AudioGestureBridge.applyModulation({ levels: rawLevels, pans: rawAngles }, modulation, isSynth);
    const fullPans = new Float32Array(256);
    if (data.pans.length === 128) {
        fullPans.set(data.pans, 0);
        fullPans.set(data.pans, 128);
    } else {
        fullPans.set(data.pans);
    }

    const payload = { levels: data.levels, pans: fullPans };
    
    // Diagnostic log every 60 frames
    if (!processSpectralData._dbg) processSpectralData._dbg = 0;
    if (processSpectralData._dbg++ % 60 === 0) {
        console.log(`[AudioData] RMS: ${Math.max(...data.levels).toFixed(1)} dB`);
    }

    eventBus.emit('audioData', payload);
}

export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    const proxy = getInputProxyNode(audioContext);
    sourceNode.connect(proxy);
    await initializeCwtWorklet(audioContext);
    if (connectToOutput) sourceNode.connect(audioContext.destination);
    return proxy;
}
