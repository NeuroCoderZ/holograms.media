import { state } from '../core/init.js';
import * as THREE from 'three';

/**
 * Ensures an AudioContext is available and running.
 * @returns {AudioContext} The audio context.
 */
function getAudioContext() {
  if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } else if (state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().catch(err => console.error("Error resuming AudioContext:", err));
  }
  return state.audio.audioContext;
}

/**
 * Sets up the audio processing chain for a given source and type using WebAssembly AudioWorklet.
 * @param {AudioNode} sourceNode - The audio source (e.g., MediaStreamAudioSourceNode or AudioBufferSourceNode).
 * @param {'file' | 'microphone'} type - The type of the audio source.
 */
export async function setupAudioProcessing(sourceNode, type) {
  const audioCtx = getAudioContext();

  // Add the AudioWorklet module
  try {
    await audioCtx.audioWorklet.addModule('js/audio/waveletAnalyzer.js');
    console.log('AudioWorklet module loaded successfully.');
  } catch (e) {
    console.error('Error loading AudioWorklet module:', e);
    return;
  }

  // Create the AudioWorkletNode
  const cwtProcessorNode = new AudioWorkletNode(audioCtx, 'cwt-processor', {
    // Node will handle its own channel interpretation based on input
    outputChannelCount: [2] // We expect 2 channels of output from the worklet (left/right data)
  });

  // Send initial data to the AudioWorklet: sample rate and target frequencies
  cwtProcessorNode.port.postMessage({
      type: 'INIT_DATA',
      sampleRate: audioCtx.sampleRate,
      targetFrequencies: state.audio.targetFrequencies
  });

  cwtProcessorNode.port.onmessage = (event) => {
    if (event.data.type === 'WASM_READY') {
      console.log('WASM module inside AudioWorklet is ready!');
    } else if (event.data.levels && event.data.angles) {
      // Receive processed levels and angles from WASM module
      state.audio.currentDbLevels = event.data.levels; // Float32Array directly
      state.audio.currentPanAngles = event.data.angles; // Float32Array directly
      // console.log('Received levels and angles from WASM:', state.audio.currentDbLevels, state.audio.currentPanAngles); // For debugging
    }
  };

  cwtProcessorNode.port.onmessageerror = (event) => {
    console.error('AudioWorklet port message error:', event);
  };

  // Connect the source to the CWT processor
  sourceNode.connect(cwtProcessorNode);

  // Connect the CWT processor outputs to the gain nodes (for actual audio playback if needed)
  // For visualization, we are primarily interested in the data received via postMessage.
  if (type === 'file') {
    state.audio.filePlayerGainNode = audioCtx.createGain();
    cwtProcessorNode.connect(state.audio.filePlayerGainNode);
    state.audio.filePlayerGainNode.connect(audioCtx.destination); // Connect to speakers
    state.audio.cwtProcessorNodeFile = cwtProcessorNode; // Store the node for file playback
    console.log("File audio processing set up with WASM AudioWorklet.");
  } else if (type === 'microphone') {
    state.audio.microphoneGainNode = audioCtx.createGain();
    cwtProcessorNode.connect(state.audio.microphoneGainNode);
    // Microphone stream is NOT connected to destination here, only for visualization,
    // so no state.audio.microphoneGainNode.connect(audioCtx.destination);
    state.audio.cwtProcessorNodeMicrophone = cwtProcessorNode; // Store the node for microphone
    console.log("Microphone audio processing set up with WASM AudioWorklet.");
  } else {
    console.error("setupAudioProcessing: Invalid type specified.");
    return;
  }

  state.audio.audioSource = sourceNode;
  state.audio.activeSource = type;
  console.log(`Audio processing set up for ${type} source using WASM AudioWorklet.`);
}

export { getAudioContext };
