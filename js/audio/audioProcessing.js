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
// This allows synchronous graph connection even before WASM is ready
let inputProxyNode = null;
let proxyConnectedToWorklet = false;

/**
 * Initializes or retrieves the global AudioContext.
 */
export function getAudioContext() {
    return audioService.getAudioContext() || new (window.AudioContext || window.webkitAudioContext)();
}

/**
 * Gets or creates the input proxy node.
 * This node collects ALL audio sources and routes them to the CQT worklet.
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
 * Connects the proxy node to the worklet (called after worklet is ready).
 */
function connectProxyToWorklet() {
    if (inputProxyNode && cwtWorkletNode && !proxyConnectedToWorklet) {
        inputProxyNode.connect(cwtWorkletNode);
        proxyConnectedToWorklet = true;
        console.log('[AudioProcessing] 🔗 Proxy node connected to CQT worklet. Audio will now flow!');
    }
}

/**
 * Initializes the CQT AudioWorklet with WASM.
 */
export async function initializeCwtWorklet(audioContext) {
    if (cwtWorkletReady) {
        console.log('[AudioProcessing] CQT Worklet already initialized.');
        connectProxyToWorklet(); // Ensure proxy is connected
        return true;
    }

    // Ensure we are using the service's context if available
    if (!audioContext) {
        audioContext = audioService.getAudioContext();
    }
    // If logic: if audioService is initialized, use it to ensure everything is sync

    console.log('[AudioProcessing] ========================================');
    console.log('[AudioProcessing] INITIALIZING WASM CQT ENGINE');
    console.log('[AudioProcessing] ========================================');

    // Ensure proxy node exists
    getInputProxyNode(audioContext);

    const caps = await deviceCapabilities.detect();
    const { sampleRate, chunkSize, numBins, channelCount } = caps.optimal;

    console.log(`[AudioProcessing] CQT Config: sampleRate=${sampleRate}, chunkSize=${chunkSize}, numBins=${numBins}`);

    // 1. AudioWorklet is mainly managed by AudioService now, but we need to ensure it's loaded.
    // AudioService.initialize() loads it. We assume it's done or we wait for it?
    // Let's assume initializeCwtWorklet is called AFTER init.js calls audioService.initialize().

    // 2. Get WASM Module from Service
    let wasmModule = audioService.getWasmModule();
    if (!wasmModule) {
        console.warn('[AudioProcessing] WASM Module not found in AudioService. Attempting to force load (should not happen if init sequence is correct).');
        // Could force init here, but safer to just warn
    }

    // 3. Create worklet node with flexible channel handling
    // Note: We create a NEW node here specific for CQT logic as mapped in this file?
    // Or should we use AudioService.createWorkletNode()?
    // AudioProcessing.js has specific message handling logic (Gesture Modulation).
    // AudioService has generic message handling.
    // For Phase 2, let's keep logic here but use the resources.

    cwtWorkletNode = new AudioWorkletNode(audioContext, 'cwt-processor', {
        processorOptions: {
            sampleRate: sampleRate,
            numBins: numBins,
            chunkSize: chunkSize,
            channelCount: channelCount
        },
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers'
    });

    // 4. Send WASM module if available, otherwise signal JS mode
    if (wasmModule) {
        cwtWorkletNode.port.postMessage({ type: 'WASM_MODULE', module: wasmModule });
    } else {
        // Explicitly trigger JS mode
        cwtWorkletNode.port.postMessage({ type: 'FORCE_JS_MODE' });
        cwtWorkletReady = true;
        engineMode = 'JS_GOERTZEL';
        console.log('[AudioProcessing] ℹ️ Running in JS Architecture Mode (Digital Basilar Membrane)');
    }

    // CRITICAL: Connect proxy to worklet NOW
    connectProxyToWorklet();

    // 4. Wait for WASM_READY (only if WASM was loaded)
    if (wasmModule) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.warn('[AudioProcessing] ⚠ WASM init timeout (5s). Using JS Goertzel fallback.');
                cwtWorkletReady = true;
                engineMode = 'JS_GOERTZEL';
                resolve(true);
            }, 5000);

            cwtWorkletNode.port.onmessage = (event) => {
                const { type } = event.data;

                if (type === 'WASM_READY') {
                    clearTimeout(timeoutId);
                    cwtWorkletReady = true;
                    engineMode = 'CQT_WASM';
                    console.log('[AudioProcessing] ✅ CQT WASM engine ready.');
                    console.log(`[AudioProcessing] 🚀 Engine ACTIVE. Mode: ${engineMode}`);
                    resolve(true);
                } else if (type === 'AUDIO_DATA') {
                    // ... (same data handling)
                    // --- GESTURE MIXER BRIDGE ---
                    // Modulate raw analysis data with hand gestures before visualization/synthesis
                    const modulationData = state.multimodal?.gestureModulationData;
                    const isSynthMode = state.audio?.isGestureSynthMode === true;

                    const rawData = { levels: event.data.levels, pans: event.data.angles };
                    const modulatedData = AudioGestureBridge.applyModulation(rawData, modulationData, isSynthMode);

                    // --- EMIT DATA ---
                    const levels = modulatedData.levels;
                    const pans = modulatedData.pans;

                    const fullPans = new Float32Array(256);
                    if (pans && pans.length === 128) {
                        fullPans.set(pans, 0);
                        fullPans.set(pans, 128);
                    } else if (pans && pans.length >= 256) {
                        fullPans.set(pans.subarray(0, 256));
                    }

                    const payload = { levels: levels, pans: fullPans };
                    eventBus.emit('audioData', payload);

                    state.audio.latestAudioData = {
                        ...payload,
                        timestamp: performance.now()
                    };
                } else if (type === 'WASM_ERROR') {
                    clearTimeout(timeoutId);
                    console.warn('[AudioProcessing] ⚠ WASM error, using JS fallback.');
                    cwtWorkletReady = true;
                    engineMode = 'JS_GOERTZEL';
                    resolve(true);
                }
            };

            // Send WASM module to worklet
            cwtWorkletNode.port.postMessage({
                type: 'WASM_MODULE',
                module: wasmModule
            });
        });
    } else {
        // Immediate resolve for JS mode
        // Attach data listener for JS mode too
        cwtWorkletNode.port.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'AUDIO_DATA') {
                // Duplicate data handling logic for JS mode
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

                const payload = { levels: levels, pans: fullPans };
                eventBus.emit('audioData', payload);

                state.audio.latestAudioData = {
                    ...payload,
                    timestamp: performance.now()
                };
            }
        };
        return Promise.resolve(true);
    }
}

/**
 * Sets up audio processing for a source node.
 * SYNCHRONOUS GRAPH CONNECTION via proxy node.
 * Async WASM loading happens in background.
 */
export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    // Ensure AudioContext is running
    if (audioContext.state === 'suspended') {
        console.log('[AudioProcessing] ⚠ AudioContext suspended. Resuming...');
        await audioContext.resume();
        console.log(`[AudioProcessing] ✅ AudioContext state: ${audioContext.state}`);
    }

    // Get proxy node (creates if doesn't exist)
    const proxy = getInputProxyNode(audioContext);

    // SYNCHRONOUS CONNECTION: Source -> Proxy
    // This happens IMMEDIATELY, no waiting for WASM
    sourceNode.connect(proxy);
    console.log(`[AudioProcessing] ✅ Source connected to proxy. Type: ${sourceNode.constructor.name}`);

    // Start WASM initialization if not already running
    if (!cwtWorkletReady && !cwtWorkletNode) {
        // Fire and forget - don't block
        initializeCwtWorklet(audioContext)
            .then(() => {
                console.log('[AudioProcessing] ✅ CQT engine ready (background init).');
            })
            .catch((err) => {
                console.warn('[AudioProcessing] ⚠ CQT init failed:', err.message);
            });
    } else {
        // Worklet already exists, ensure proxy is connected
        connectProxyToWorklet();
    }

    // Connect source directly to output if requested (for hearing audio)
    if (connectToOutput) {
        sourceNode.connect(audioContext.destination);
    }

    console.log('[AudioProcessing] ✅ Audio source connected to processing pipeline.');
    return proxy;
}

/**
 * Disconnects a source from the CQT worklet.
 */
export function disconnectFromCwt(sourceNode) {
    if (inputProxyNode) {
        try {
            sourceNode.disconnect(inputProxyNode);
        } catch (e) {
            // Already disconnected
        }
    }
}

/**
 * Returns whether CQT processing is active.
 */
export function isCwtActive() {
    return cwtWorkletReady && cwtWorkletNode !== null;
}

/**
 * Gets the current engine mode.
 */
export function getEngineMode() {
    return engineMode;
}

/**
 * Gets the CQT worklet node for direct connection.
 */
export function getCwtWorkletNode() {
    return cwtWorkletNode;
}
