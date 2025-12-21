// frontend/js/audio/audioProcessing.js
// CWT-based audio processing with AudioWorklet and WASM

import { state } from '../core/init.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';
import eventBus from '../core/eventBus.js';

let cwtWorkletNode = null;
let cwtWorkletReady = false;

/**
 * Initializes or retrieves the global AudioContext.
 * @returns {AudioContext} The application's AudioContext.
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
 * Initializes the CWT AudioWorklet.
 * Should be called once during app initialization.
 * @param {AudioContext} audioContext 
 */
export async function initializeCwtWorklet(audioContext) {
    if (cwtWorkletReady) {
        console.log('[AudioProcessing] CWT Worklet already initialized.');
        return;
    }

    try {
        // Detect device capabilities for optimal parameters
        const caps = await deviceCapabilities.detect();
        const { sampleRate, chunkSize, numBins, channelCount } = caps.optimal;

        console.log(`[AudioProcessing] Initializing CWT Worklet with: 
      sampleRate=${sampleRate}, chunkSize=${chunkSize}, numBins=${numBins}, channels=${channelCount}`);

        // Load the AudioWorklet module
        await audioContext.audioWorklet.addModule('/js/audio/waveletAnalyzer.js');
        console.log('[AudioProcessing] AudioWorklet module loaded.');

        // Create the CWT processor node
        cwtWorkletNode = new AudioWorkletNode(audioContext, 'cwt-processor', {
            processorOptions: {
                sampleRate: sampleRate,
                numBins: numBins,
                chunkSize: chunkSize,
                channelCount: channelCount
            },
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2] // Stereo output for pass-through
        });

        // Handle messages from the worklet
        cwtWorkletNode.port.onmessage = (event) => {
            const { type } = event.data;

            if (type === 'WASM_READY') {
                cwtWorkletReady = true;
                console.log('[AudioProcessing] CWT WASM module ready in AudioWorklet.');
            } else if (type === 'AUDIO_DATA') {
                // Emit CWT results to the application via eventBus
                eventBus.emit('cwtResult', {
                    dbLevels: event.data.levels,
                    panAngles: event.data.angles
                });

                // Also store in global state for direct access
                state.audio.latestCwtData = {
                    dbLevels: event.data.levels,
                    panAngles: event.data.angles,
                    timestamp: performance.now()
                };
            }
        };

        // Connect worklet to destination for audio pass-through
        cwtWorkletNode.connect(audioContext.destination);

        console.log('[AudioProcessing] CWT AudioWorklet initialized and ready.');

    } catch (error) {
        console.error('[AudioProcessing] Failed to initialize CWT Worklet:', error);
        console.log('[AudioProcessing] Falling back to native FFT analyzer.');
        // Fallback will use the existing AudioAnalyzer
    }
}

/**
 * Sets up the audio processing pipeline.
 * Uses CWT AudioWorklet if available, falls back to native FFT.
 *
 * @param {AudioNode} sourceNode - The audio source.
 * @param {AudioContext} audioContext - The global AudioContext.
 * @param {boolean} connectToOutput - Whether to connect source to speakers.
 * @returns {AudioAnalyzer|AudioWorkletNode} The analyzer being used.
 */
export function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    // Ensure CWT worklet is initialized
    if (!cwtWorkletReady && cwtWorkletNode === null) {
        // Try async initialization (won't block, but will enable for future sources)
        initializeCwtWorklet(audioContext);
    }

    // If CWT worklet is ready, use it
    if (cwtWorkletReady && cwtWorkletNode) {
        // Connect source → CWT Worklet → destination
        sourceNode.connect(cwtWorkletNode);
        console.log('[AudioProcessing] Source connected to CWT AudioWorklet.');

        // Note: connectToOutput is handled by the worklet's pass-through
        return cwtWorkletNode;
    }

    // Fallback: Use native FFT analyzer
    console.log('[AudioProcessing] Using native FFT analyzer (CWT not ready).');

    if (!state.audio.globalAnalyzer) {
        state.audio.globalAnalyzer = new AudioAnalyzer(audioContext);
    }

    // Connect source to the analyzer
    state.audio.globalAnalyzer.connectSource(sourceNode);

    // Connect source to destination so we can hear it (if it's a file player)
    if (connectToOutput) {
        sourceNode.connect(audioContext.destination);
    }

    console.log('[AudioProcessing] Audio processing pipeline connected using Native FFT AudioAnalyzer.');
    return state.audio.globalAnalyzer;
}

/**
 * Disconnects a source from the CWT worklet.
 * @param {AudioNode} sourceNode 
 */
export function disconnectFromCwt(sourceNode) {
    if (cwtWorkletNode) {
        try {
            sourceNode.disconnect(cwtWorkletNode);
        } catch (e) {
            // Already disconnected
        }
    }
}

/**
 * Returns whether CWT processing is active.
 */
export function isCwtActive() {
    return cwtWorkletReady && cwtWorkletNode !== null;
}

/**
 * Gets the CWT worklet node for direct connection.
 */
export function getCwtWorkletNode() {
    return cwtWorkletNode;
}
