// frontend/js/audio/audioProcessing.js (REWRITTEN for new WASM interface)
import { state } from '../core/init.js';
import eventBus from '../core/eventBus.js';

// Define constants for audio processing
const CHUNK_SIZE = 1024; // Standard chunk size for audio processing
const NUM_BINS = 130;    // Number of frequency bins for CWT analysis

/**
 * Initializes or retrieves the global AudioContext.
 * @returns {AudioContext} The application's AudioContext.
 */
export function getAudioContext() {
    if (state.audioContext && state.audioContext.state !== 'closed') {
        return state.audioContext;
    }
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return state.audioContext;
}

/**
 * Sets up the audio processing pipeline using a modern AudioWorklet.
 * This function creates a 'cwt-processor' node from waveletAnalyzer.js,
 * connects it to the audio source, and sets up a communication channel
 * to receive analysis results and publish them to the eventBus.
 *
 * @param {AudioNode} sourceNode - The audio source (e.g., from a microphone or file).
 * @param {AudioContext} audioContext - The global AudioContext.
 */
export async function setupAudioProcessing(sourceNode, audioContext) {
    try {
        // 1. Load the AudioWorklet module.
        await audioContext.audioWorklet.addModule('./waveletAnalyzer.js');
        console.log('AudioWorklet module loaded successfully.');

        // 2. Create the AudioWorkletNode.
        const cwtNode = new AudioWorkletNode(audioContext, 'cwt-processor', {
            processorOptions: {
                chunkSize: CHUNK_SIZE,
                numBins: NUM_BINS,
                sampleRate: audioContext.sampleRate
            }
        });
        console.log('CWT Processor node created.');

        // 3. Set up message handling from the worklet.
        cwtNode.port.onmessage = (event) => {
            if (event.data.type === 'WASM_READY') {
                console.log('WASM module is ready in AudioWorklet. Sending init data...');
                // Once WASM is ready, send the necessary configuration data to initialize the processor.
                cwtNode.port.postMessage({
                    type: 'INIT_PROCESSOR',
                    sampleRate: audioContext.sampleRate,
                    numBins: NUM_BINS,
                    chunkSize: CHUNK_SIZE
                });
            } else if (event.data.type === 'AUDIO_DATA') {
                // 4. Receive analysis results and publish them to the event bus.
                eventBus.emit('cwtResult', {
                    dbLevels: event.data.levels,
                    panAngles: event.data.angles
                });
            }
        };

        cwtNode.port.onmessageerror = (event) => {
            console.error('Error message from CWT Processor:', event);
        };

        // 5. Connect the audio graph: source -> CWT node -> destination.
        // Note: A ScriptProcessorNode is no longer needed with AudioWorklets.
        sourceNode.connect(cwtNode).connect(audioContext.destination);
        console.log('Audio processing pipeline connected using AudioWorklet.');

        // Store the node in the global state for potential future control.
        state.cwtProcessorNode = cwtNode;

    } catch (error) {
        console.error('Failed to set up audio processing pipeline:', error);
        // Optionally, display an error to the user.
    }
}