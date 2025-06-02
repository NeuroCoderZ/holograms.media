import { state } from '../core/init.js';
import { semitones } from '../3d/rendering.js';
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


/**
 * Updates sequencer column visuals based on live audio input (e.g., microphone).
 * @param {AnalyserNode} analyserLeft - The AnalyserNode for the left channel.
 * @param {AnalyserNode} analyserRight - The AnalyserNode for the right channel.
 */
export function updateLiveSequencerVisuals(analyserLeft, analyserRight) {
  if (!state.columns || state.columns.length === 0 || !state.semitones || state.semitones.length === 0) {
    return;
  }

  const leftLevels = getSemitoneLevels(analyserLeft);
  const rightLevels = getSemitoneLevels(analyserRight);

  state.columns.forEach((columnPair, i) => {
    if (i >= state.semitones.length) return; // Ensure we don't exceed semitones data

    const leftDb = leftLevels[i];
    const rightDb = rightLevels[i];
    const semitoneColor = state.semitones[i].color; // Get color from state.semitones

    // Update left column
    if (columnPair.left && columnPair.left.children[0]) {
      const leftMesh = columnPair.left.children[0];
      const leftNormalizedDB = THREE.MathUtils.clamp((leftDb + 100) / 100, 0, 1); // Normalize from -100dB to 0dB range to 0-1
      const targetLeftHeight = leftNormalizedDB * state.config.GRID.HEIGHT; // Max height is GRID_HEIGHT

      leftMesh.scale.y = Math.max(0.001, targetLeftHeight); // Use scale.y for height as per original column setup
      leftMesh.position.y = targetLeftHeight / 2 - state.config.GRID.HEIGHT / 2; // Adjust position based on new height
      
      // Update color and opacity (similar to script.js updateSequencerColumns)
      leftMesh.material.color.set(semitoneColor);
      leftMesh.material.opacity = leftDb > -100 ? 1.0 : 0.5; // More opaque if active
      leftMesh.material.transparent = leftDb <= -100;
    }

    // Update right column
    if (columnPair.right && columnPair.right.children[0]) {
      const rightMesh = columnPair.right.children[0];
      const rightNormalizedDB = THREE.MathUtils.clamp((rightDb + 100) / 100, 0, 1);
      const targetRightHeight = rightNormalizedDB * state.config.GRID.HEIGHT;

      rightMesh.scale.y = Math.max(0.001, targetRightHeight);
      rightMesh.position.y = targetRightHeight / 2 - state.config.GRID.HEIGHT / 2;

      rightMesh.material.color.set(semitoneColor);
      rightMesh.material.opacity = rightDb > -100 ? 1.0 : 0.5;
      rightMesh.material.transparent = rightDb <= -100;
    }
  });
}

/**
 * Updates sequencer column visuals based on file playback audio.
 */
export function updateFilePlaybackVisuals() {
  if (!state.audio.filePlayerAnalysers || !state.columns || state.columns.length === 0 || !state.semitones || state.semitones.length === 0) {
    return;
  }

  const leftLevels = getSemitoneLevels(state.audio.filePlayerAnalysers.left);
  const rightLevels = getSemitoneLevels(state.audio.filePlayerAnalysers.right);

  state.columns.forEach((columnPair, i) => {
    if (i >= state.semitones.length) return;

    const leftDb = leftLevels[i];
    const rightDb = rightLevels[i];
    const semitoneColor = state.semitones[i].color;

    // Update left column
    if (columnPair.left && columnPair.left.children[0]) {
      const leftMesh = columnPair.left.children[0];
      let targetLeftHeight;
      if (leftDb <= -100) { // Snap to zero
        targetLeftHeight = 0.001; 
      } else {
        const leftNormalizedDB = THREE.MathUtils.clamp((leftDb + 60) / 90, 0, 1); // Normalize from -60dB to +30dB range to 0-1 (as per script.js processAudio)
        targetLeftHeight = leftNormalizedDB * state.config.GRID.HEIGHT;
      }
      leftMesh.scale.y = Math.max(0.001, targetLeftHeight);
      leftMesh.position.y = targetLeftHeight / 2 - state.config.GRID.HEIGHT / 2;
      leftMesh.material.color.set(semitoneColor); // Set color
      // Opacity can be handled similarly to live visuals if desired, or kept fully opaque
      leftMesh.material.opacity = targetLeftHeight > 0.001 ? 1.0 : 0.5; 
      leftMesh.material.transparent = targetLeftHeight <= 0.001;
    }

    // Update right column
    if (columnPair.right && columnPair.right.children[0]) {
      const rightMesh = columnPair.right.children[0];
      let targetRightHeight;
      if (rightDb <= -100) { // Snap to zero
        targetRightHeight = 0.001;
      } else {
        const rightNormalizedDB = THREE.MathUtils.clamp((rightDb + 60) / 90, 0, 1);
        targetRightHeight = rightNormalizedDB * state.config.GRID.HEIGHT;
      }
      rightMesh.scale.y = Math.max(0.001, targetRightHeight);
      rightMesh.position.y = targetRightHeight / 2 - state.config.GRID.HEIGHT / 2;
      rightMesh.material.color.set(semitoneColor); // Set color
      rightMesh.material.opacity = targetRightHeight > 0.001 ? 1.0 : 0.5;
      rightMesh.material.transparent = targetRightHeight <= 0.001;
    }
  });
}


export { getAudioContext, createAnalyserNodes, getSemitoneLevels, setupAudioProcessing };
