// frontend/js/audio/audioProcessing.js
// CQT-based audio processing with AudioWorklet and WASM
// PROXY NODE ARCHITECTURE: Synchronous graph, async WASM loading

import { state } from '../core/init.js';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';
import eventBus from '../core/eventBus.js';
import audioService from '../services/AudioService.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';

// Global state
let cwtWorkletNode = null;
let cwtWorkletReady = false;
let engineMode = 'INITIALIZING';

// PROXY NODE: Always-available input collector
let inputProxyNode = null;
let proxyConnectedToWorklet = false;

/**
 * Initializes or retrieves the global AudioContext from AudioService.
 */
export function getAudioContext() {
    return audioService.getAudioContext();
}

/**
 * Gets or creates the input proxy node.
 */
function getInputProxyNode(audioContext) {
    if (!inputProxyNode) {
        inputProxyNode = audioContext.createGain();
        inputProxyNode.gain.value = 1.0;
        console.log('[AudioProcessing] 🔗 Input proxy node created.');
    }
    return inputProxyNode;
}

/**
 * Connects the proxy node to the worklet.
 */
function connectProxyToWorklet() {
    if (inputProxyNode && cwtWorkletNode && !proxyConnectedToWorklet) {
        inputProxyNode.connect(cwtWorkletNode);
        proxyConnectedToWorklet = true;
        console.log('[AudioProcessing] 🔗 Proxy node connected to CQT worklet. Audio will now flow!');
    }
}

/**
 * Initializes the CQT AudioWorklet.
 */
export async function initializeCwtWorklet(audioContext) {
    if (cwtWorkletReady && cwtWorkletNode) {
        console.log('[AudioProcessing] CQT Worklet already initialized.');
        connectProxyToWorklet();
        return true;
    }

    if (!audioContext) audioContext = audioService.getAudioContext();

    console.log('[AudioProcessing] ========================================');
    console.log('[AudioProcessing] INITIALIZING CQT ENGINE');
    console.log('[AudioProcessing] ========================================');

    getInputProxyNode(audioContext);
    const caps = await deviceCapabilities.detect();
    const { sampleRate, chunkSize, numBins, channelCount } = caps.optimal;

    console.log(`[AudioProcessing] CQT Config: sampleRate=${sampleRate}, chunkSize=${chunkSize}, numBins=${numBins}`);

    cwtWorkletNode = new AudioWorkletNode(audioContext, 'cwt-processor', {
        processorOptions: { sampleRate, numBins, chunkSize, channelCount },
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers'
    });

    // ATTACH LISTENER BEFORE SENDING ANY MESSAGES
    cwtWorkletNode.port.onmessage = (event) => {
        handleWorkletMessage(event);
    };

    connectProxyToWorklet();

    const wasmModule = audioService.getWasmModule();

    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
            if (!cwtWorkletReady) {
                console.warn('[AudioProcessing] ⚠ WASM init timeout (5s). Switching to JS mode.');
                cwtWorkletReady = true;
                engineMode = 'JS_GOERTZEL';
                cwtWorkletNode.port.postMessage({ type: 'FORCE_JS_MODE' });
                resolve(true);
            }
        }, 5000);

        // Internal handler extension for resolution
        const originalOnMessage = cwtWorkletNode.port.onmessage;
        cwtWorkletNode.port.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'WASM_READY') {
                clearTimeout(timeoutId);
                cwtWorkletReady = true;
                engineMode = 'CQT_WASM';
                console.log('[AudioProcessing] ✅ CQT WASM engine ready.');
                resolve(true);
            } else if (type === 'WASM_ERROR') {
                clearTimeout(timeoutId);
                console.warn('[AudioProcessing] ⚠ WASM error, using JS fallback.');
                cwtWorkletReady = true;
                engineMode = 'JS_GOERTZEL';
                cwtWorkletNode.port.postMessage({ type: 'FORCE_JS_MODE' });
                resolve(true);
            }
            handleWorkletMessage(event);
        };

        if (wasmModule) {
            console.log('[AudioProcessing] Sending WASM module to worklet...');
            cwtWorkletNode.port.postMessage({ type: 'WASM_MODULE', module: wasmModule });
        } else {
            console.log('[AudioProcessing] No WASM module found. Forcing JS mode.');
            clearTimeout(timeoutId);
            cwtWorkletReady = true;
            engineMode = 'JS_GOERTZEL';
            cwtWorkletNode.port.postMessage({ type: 'FORCE_JS_MODE' });
            resolve(true);
        }
    });
}

/**
 * Handles all messages from the AudioWorklet.
 */
function handleWorkletMessage(event) {
    const { type } = event.data;

    if (type === 'AUDIO_DATA') {
        const modulationData = state.multimodal?.gestureModulationData;
        const isSynthMode = state.audio?.isGestureSynthMode === true;

        const rawData = { levels: event.data.levels, pans: event.data.angles };
        const modulatedData = AudioGestureBridge.applyModulation(rawData, modulationData, isSynthMode);

        const levels = modulatedData.levels;
        const pans = modulatedData.pans;

        const fullPans = new Float32Array(256);
        if (pans && pans.length === 128) {
            fullPans.set(pans, 0);
            fullPans.set(pans, 128);
        } else if (pans && pans.length >= 256) {
            fullPans.set(pans.subarray(0, 256));
        }

        const payload = { levels, pans: fullPans };

        // Diagnostic logging (once per 300 frames ~ 5s)
        if (typeof handleWorkletMessage.dbgCount === 'undefined') handleWorkletMessage.dbgCount = 0;
        if (handleWorkletMessage.dbgCount++ % 300 === 0) {
            const first128 = Array.from(payload.levels).slice(0, 128);
            const mean = first128.reduce((a, b) => a + b, 0) / 128;
            const variance = first128.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 128;
            console.log(`[AudioProcessing] 📡 (${engineMode}) Spectrum Variance: ${variance.toFixed(4)}. Max: ${Math.max(...first128).toFixed(1)} dB. Mean: ${mean.toFixed(1)} dB`);
        }

        eventBus.emit('audioData', payload);
        if (state.audio) {
            state.audio.latestAudioData = { ...payload, timestamp: performance.now() };
        }
    }
}

/**
 * Sets up audio processing for a source node.
 */
export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    if (!audioContext) audioContext = audioService.getAudioContext();

    if (audioContext.state === 'suspended') {
        console.log('[AudioProcessing] ⚠ Resuming context...');
        await audioContext.resume();
    }

    const proxy = getInputProxyNode(audioContext);
    sourceNode.connect(proxy);
    console.log(`[AudioProcessing] ✅ Source connected to proxy. Type: ${sourceNode.constructor.name}`);

    if (!cwtWorkletReady && !cwtWorkletNode) {
        initializeCwtWorklet(audioContext).catch(err => console.error('[AudioProcessing] Init error:', err));
    } else {
        connectProxyToWorklet();
    }

    if (connectToOutput) sourceNode.connect(audioContext.destination);
    return proxy;
}

/**
 * Disconnects a source from the CQT pipeline.
 */
export function disconnectFromCwt(sourceNode) {
    if (inputProxyNode) {
        try { sourceNode.disconnect(inputProxyNode); } catch (e) { }
    }
}

export function isCwtActive() { return cwtWorkletReady && cwtWorkletNode !== null; }
export function getEngineMode() { return engineMode; }
export function getCwtWorkletNode() { return cwtWorkletNode; }
