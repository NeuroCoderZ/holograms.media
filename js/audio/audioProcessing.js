// frontend/js/audio/audioProcessing.js
// CQT-based audio processing with AudioWorklet and WASM
// PROXY NODE ARCHITECTURE: Synchronous graph, async WASM loading

import { state } from '../core/init.js';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';
import eventBus from '../core/eventBus.js';
// Import WASM URL explicitly for Vite - REMOVED to prevent modulepreload error
// import wasmUrl from '../../public/wasm/holographic_core_bg.wasm?url';
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
    if (state.audio && state.audio.audioContext && state.audio.audioContext.state !== 'closed') {
        return state.audio.audioContext;
    }
    if (!state.audio) state.audio = {};
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return state.audio.audioContext;
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
 * Attempts to fetch WASM from multiple possible paths.
 */
async function fetchWasmWithFallbackPaths() {
    const possiblePaths = [
        '/holographic_core_bg.wasm', // Root path (moved from public/wasm/)
        '/wasm/holographic_core_bg.wasm' // Legacy fallback
    ];
    for (const path of possiblePaths) {
        try {
            console.log(`[AudioProcessing] Trying WASM path: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                const bytes = await response.arrayBuffer();

                // CRITICAL: Check if this is actually a WASM file (magic number: 00 61 73 6d)
                const header = new Uint8Array(bytes.slice(0, 4));
                const isWasm = header[0] === 0x00 && header[1] === 0x61 && header[2] === 0x73 && header[3] === 0x6d;

                if (!isWasm) {
                    console.warn(`[AudioProcessing] ⚠ Path ${path} returned non-WASM data (likely HTML fallback). Skipping.`);
                    continue;
                }

                console.log(`[AudioProcessing] ✅ WASM loaded from: ${path} (${bytes.byteLength} bytes)`);
                return bytes;
            }
        } catch (e) {
            // Continue to next path
        }
    }
    throw new Error('[AudioProcessing] WASM file not found in any location.');
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

    console.log('[AudioProcessing] ========================================');
    console.log('[AudioProcessing] INITIALIZING WASM CQT ENGINE');
    console.log('[AudioProcessing] ========================================');

    // Ensure proxy node exists
    getInputProxyNode(audioContext);

    const caps = await deviceCapabilities.detect();
    const { sampleRate, chunkSize, numBins, channelCount } = caps.optimal;

    console.log(`[AudioProcessing] CQT Config: sampleRate=${sampleRate}, chunkSize=${chunkSize}, numBins=${numBins}`);

    // 1. Load AudioWorklet module
    try {
        await audioContext.audioWorklet.addModule('/js/audio/waveletAnalyzer.js');
        console.log('[AudioProcessing] ✅ AudioWorklet module loaded.');
    } catch (e) {
        throw new Error(`[AudioProcessing] Failed to load AudioWorklet: ${e.message}`);
    }

    // 2. Fetch and compile WASM
    console.log('[AudioProcessing] Loading WASM module...');
    const wasmBytes = await fetchWasmWithFallbackPaths();
    const wasmModule = await WebAssembly.compile(wasmBytes);
    console.log('[AudioProcessing] ✅ WASM compiled.');

    // 3. Create worklet node with flexible channel handling
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

    // 4. Send WASM module to the worklet for acceleration
    if (wasmModule) {
        cwtWorkletNode.port.postMessage({ type: 'WASM_MODULE', module: wasmModule });
    }

    // Connect worklet to destination (passthrough audio)
    // CRITICAL FIX: Disconnect / Comment out to prevent feedback loop
    // cwtWorkletNode.connect(audioContext.destination);

    // CRITICAL: Connect proxy to worklet NOW
    connectProxyToWorklet();

    // 4. Wait for WASM_READY
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
