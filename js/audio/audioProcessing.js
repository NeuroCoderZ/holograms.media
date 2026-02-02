// frontend/js/audio/audioProcessing.js
// CQT-based audio processing with AudioWorklet and WASM
// STRICT WASM ONLY MODE (BasilaQ-127)

import { state } from '../core/init.js';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';
import eventBus from '../core/eventBus.js';
import audioService from '../services/AudioService.js';
import { AudioGestureBridge } from './AudioGestureBridge.js';

// Global state
let engineMode = 'WASM_PENDING';

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
 * Connects the proxy node to the worklet provided by AudioService.
 */
function connectProxyToWorklet() {
    const workletNode = audioService.workletNode;
    if (inputProxyNode && workletNode && !proxyConnectedToWorklet) {
        inputProxyNode.connect(workletNode);
        proxyConnectedToWorklet = true;
        console.log('[AudioProcessing] 🔗 Proxy node connected to CQT worklet (AudioService). Audio will now flow!');
        engineMode = 'WASM_LINKED';
    }
}

/**
 * Initializes the CQT AudioWorklet via AudioService.
 */
export async function initializeCwtWorklet(audioContext) {
    if (audioService.workletNode) {
        connectProxyToWorklet();
        return true;
    }

    console.log('[AudioProcessing] Requesting CQT Engine from AudioService...');

    // Ensure AudioService is initialized
    await audioService.initialize();

    // Create/Get the node
    const workletNode = audioService.createWorkletNode();

    // Listen to data from AudioService (which emits it from worklet)
    // We bind once to avoid duplicates if called multiple times, 
    // but AudioService acts as the source of truth.
    // Actually, handleWorkletMessage needs to be called. 
    // We can subscribe to eventBus 'audio:spectralData'.

    if (!initializeCwtWorklet.listening) {
        eventBus.on('audio:spectralData', handleWorkletMessage);
        initializeCwtWorklet.listening = true;
    }

    connectProxyToWorklet();
    return true;
}

/**
 * Handles spectral data events from AudioService.
 */
function handleWorkletMessage(data) {
    // data is { levels, angles }
    const modulationData = state.multimodal?.gestureModulationData;
    const isSynthMode = state.audio?.isGestureSynthMode === true;

    // Use raw data directly
    const rawData = { levels: data.levels, pans: data.angles };
    const modulatedData = AudioGestureBridge.applyModulation(rawData, modulationData, isSynthMode);

    const levels = modulatedData.levels;
    const pans = modulatedData.pans;

    const fullPans = new Float32Array(256);
    if (pans && pans.length === 128) {
        fullPans.set(pans, 0);
        fullPans.set(pans, 128); // Duplicate logic for stereo pair
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
        // Verify we are not in JS mode (impossible now, but checking levels)
        console.log(`[AudioProcessing] 📡 (WASM) Spectrum Variance: ${variance.toFixed(4)}. Max: ${Math.max(...first128).toFixed(1)} dB.`);
    }

    eventBus.emit('audioData', payload);
    if (state.audio) {
        state.audio.latestAudioData = { ...payload, timestamp: performance.now() };
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

    // Ensure CWT is ready
    await initializeCwtWorklet(audioContext);

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

export function isCwtActive() { return proxyConnectedToWorklet; }
export function getEngineMode() { return engineMode; }
export function getCwtWorkletNode() { return audioService.workletNode; }

