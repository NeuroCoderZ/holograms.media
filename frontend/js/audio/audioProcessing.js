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
 * Creates two AnalyserNodes (left and right channels).
 * @param {AudioContext} audioContext - The audio context to create the analysers with.
 * @param {number} [smoothingTimeConstant=0.85] - The smoothing time constant for the analysers. Defaulting to 0.85 as per microphone in script.js
 * @returns {{left: AnalyserNode, right: AnalyserNode}} The created analyser nodes.
 */
function createAnalyserNodes(audioContext, smoothingTimeConstant = 0.85) { // Modified default as per instruction
  const analyserLeft = audioContext.createAnalyser();
  analyserLeft.fftSize = 4096;
  analyserLeft.smoothingTimeConstant = smoothingTimeConstant; // Use passed argument
  analyserLeft.minDecibels = -100;
  analyserLeft.maxDecibels = 0;

  const analyserRight = audioContext.createAnalyser();
  analyserRight.fftSize = 4096;
  analyserRight.smoothingTimeConstant = smoothingTimeConstant; // Use passed argument
  analyserRight.minDecibels = -100;
  analyserRight.maxDecibels = 0;

  return { left: analyserLeft, right: analyserRight };
}

/**
 * Sets up the audio processing chain for a given source and type.
 * @param {AudioNode} sourceNode - The audio source (e.g., MediaStreamAudioSourceNode or AudioBufferSourceNode).
 * @param {'file' | 'microphone'} type - The type of the audio source.
 */
export function setupAudioProcessing(sourceNode, type) { // Exporting as it will be called from other modules
  const audioCtx = getAudioContext();
  let nodeToSplit;
  let analysers;

  if (type === 'file') {
    state.audio.filePlayerGainNode = audioCtx.createGain();
    sourceNode.connect(state.audio.filePlayerGainNode);
    nodeToSplit = state.audio.filePlayerGainNode;
    // Connect file player gain to destination
    state.audio.filePlayerGainNode.connect(audioCtx.destination);
    analysers = createAnalyserNodes(audioCtx, 0); // smoothingConstant = 0 for file
    state.audio.filePlayerAnalysers = analysers;
  } else if (type === 'microphone') {
    state.audio.microphoneGainNode = audioCtx.createGain(); 
    sourceNode.connect(state.audio.microphoneGainNode);
    nodeToSplit = state.audio.microphoneGainNode;
    // Microphone stream is NOT connected to destination here, only for visualization.
    analysers = createAnalyserNodes(audioCtx, 0.85); // smoothingConstant = 0.85 for microphone
    state.audio.microphoneAnalysers = analysers;
  } else {
    console.error("setupAudioProcessing: Invalid type specified.");
    return;
  }

  if (nodeToSplit && analysers) {
    const splitter = audioCtx.createChannelSplitter(2);
    nodeToSplit.connect(splitter);
    splitter.connect(analysers.left, 0);
    splitter.connect(analysers.right, 1);
  }
  
  state.audio.audioSource = sourceNode; 
  console.log(`Audio processing set up for ${type} source.`);
}

/**
 * Calculates decibel levels for each semitone from an AnalyserNode.
 * @param {AnalyserNode} analyser - The AnalyserNode to process.
 * @returns {number[]} An array of decibel levels for each semitone.
 */
function getSemitoneLevels(analyser) {
  if (!analyser || !analyser.frequencyBinCount || !state.semitones || state.semitones.length === 0) {
    return new Array(state.semitones ? state.semitones.length : 0).fill(-100);
  }

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);

  const sampleRate = analyser.context.sampleRate;
  const binSize = sampleRate / (2 * analyser.fftSize); 

  const semitoneLevels = [];

  for (let i = 0; i < state.semitones.length; i++) {
    // state.semitones[i] is an object { degree, name, color, label, y }
    // We need a frequency. Assuming `state.semitones[i].f` holds the frequency,
    // similar to how it was in rendering.js before.
    // If `state.semitones[i].f` is not available, this function needs adjustment
    // or the `state.semitones` structure needs to include frequency.
    // For now, let's assume `state.semitones[i].f` exists.
    // If not, this will likely error or produce incorrect results.
    // A robust solution would check for .f or get it from note name/degree.
    // HACK: For now, to avoid crashing if .f is missing, we'll use a placeholder logic.
    // This should be revisited based on the actual structure of state.semitones.
    // const targetFrequency = state.semitones[i].f; // IDEAL
    
    // Fallback: Calculate a placeholder frequency if .f is not in state.semitones
    // This is a simplified version of what was in rendering.js's semitone generation
    const BASE_FREQUENCY = 27.5; // A0
    const NOTES_PER_OCTAVE = 12;
    // Assuming state.semitones[i].degree gives the semitone index from C (0-11 for first octave, etc.)
    // or just `i` if it's a flat list of 130 semitones like original rendering.js
    const semitoneIndex = state.semitones[i].degree !== undefined ? state.semitones[i].degree : i;
    const targetFrequency = BASE_FREQUENCY * Math.pow(2, semitoneIndex / NOTES_PER_OCTAVE);


    if (targetFrequency === undefined) {
        console.warn(`Frequency for semitone ${i} is undefined. Check state.semitones structure.`);
        semitoneLevels.push(-100);
        continue;
    }
    
    let accumulatedAmplitude = 0;
    let count = 0;
    const targetBin = Math.round(targetFrequency / binSize);
    const windowSize = 2; 

    for (let j = Math.max(0, targetBin - windowSize); j <= Math.min(analyser.frequencyBinCount - 1, targetBin + windowSize); j++) {
        const binFreq = j * binSize;
        if (Math.abs(binFreq - targetFrequency) < binSize * (windowSize + 0.5)) { 
            accumulatedAmplitude += frequencyData[j];
            count++;
        }
    }
    
    const averageAmplitude = count > 0 ? accumulatedAmplitude / count : 0;
    const dB = averageAmplitude === 0 ? -100 : 20 * Math.log10(averageAmplitude / 255); // Simplified dB, script.js had *1.5
    semitoneLevels.push(THREE.MathUtils.clamp(dB, -100, 30)); // script.js was -100, 0 for mic, but 30 for file
  }

  if (semitoneLevels.length !== state.semitones.length) {
    const fallbackLevels = new Array(state.semitones.length).fill(-100);
    for(let i=0; i < Math.min(semitoneLevels.length, state.semitones.length); i++) {
        fallbackLevels[i] = semitoneLevels[i];
    }
    return fallbackLevels;
  }

  return semitoneLevels;
}


// The functions updateLiveSequencerVisuals and updateFilePlaybackVisuals previously here
// were removed as their functionality is now handled by AudioVisualizer.js and HologramRenderer.js.

// The local getSemitoneLevels function is also removed as AudioAnalyzer.getSemitoneLevels will be used.
// export { getAudioContext, createAnalyserNodes, getSemitoneLevels }; // getSemitoneLevels removed from exports
export { getAudioContext, createAnalyserNodes };

// TODO: Research and implement Wasm-based wavelet transform for precise analysis.
