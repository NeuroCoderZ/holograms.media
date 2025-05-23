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
 * @param {number} [smoothingTimeConstant=0] - The smoothing time constant for the analysers.
 * @returns {{left: AnalyserNode, right: AnalyserNode}} The created analyser nodes.
 */
function createAnalyserNodes(audioContext, smoothingTimeConstant = 0) {
  const analyserLeft = audioContext.createAnalyser();
  analyserLeft.fftSize = 4096;
  analyserLeft.smoothingTimeConstant = smoothingTimeConstant;
  analyserLeft.minDecibels = -100;
  analyserLeft.maxDecibels = 0;

  const analyserRight = audioContext.createAnalyser();
  analyserRight.fftSize = 4096;
  analyserRight.smoothingTimeConstant = smoothingTimeConstant;
  analyserRight.minDecibels = -100;
  analyserRight.maxDecibels = 0;

  return { left: analyserLeft, right: analyserRight };
}

/**
 * Calculates decibel levels for each semitone from an AnalyserNode.
 * @param {AnalyserNode} analyser - The AnalyserNode to process.
 * @returns {number[]} An array of decibel levels for each semitone.
 */
function getSemitoneLevels(analyser) {
  if (!analyser || !analyser.frequencyBinCount) {
    return new Array(semitones.length).fill(-100);
  }

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);

  const sampleRate = analyser.context.sampleRate;
  const binSize = sampleRate / (2 * analyser.fftSize); // fftSize here, not bufferLength from original example as analyser.fftSize is more direct

  const semitoneLevels = [];

  for (let i = 0; i < semitones.length; i++) {
    const targetFrequency = semitones[i];
    let accumulatedAmplitude = 0;
    let count = 0;

    // Find the main bin for the target frequency
    const targetBin = Math.round(targetFrequency / binSize);

    // Consider a small window around the target bin to capture energy
    // This is a simplified approach. More sophisticated methods might use interpolation
    // or wider windows depending on desired accuracy and frequency resolution.
    const windowSize = 2; // Number of bins to check on each side of the target bin

    for (let j = Math.max(0, targetBin - windowSize); j <= Math.min(analyser.frequencyBinCount - 1, targetBin + windowSize); j++) {
        // Check if the frequency of the current bin is close enough to the target semitone frequency
        // This helps to average relevant frequencies for a given semitone
        const binFreq = j * binSize;
        if (Math.abs(binFreq - targetFrequency) < binSize * (windowSize + 0.5)) { // Check within a range
            accumulatedAmplitude += frequencyData[j];
            count++;
        }
    }
    
    const averageAmplitude = count > 0 ? accumulatedAmplitude / count : 0;
    // Convert amplitude to dB, applying the same scaling as in the reference
    // The reference uses amplitude / 255, which assumes byte data (0-255 range).
    // The * 1.5 scaling factor is also from the reference.
    const dB = 20 * Math.log10(averageAmplitude / 255) * 1.5;
    semitoneLevels.push(THREE.MathUtils.clamp(dB, -100, 30));
  }

  // Ensure we always return an array of the correct length, even if calculations are off
  // or semitones array is unexpectedly empty.
  if (semitoneLevels.length !== semitones.length) {
    const fallbackLevels = new Array(semitones.length).fill(-100);
    for(let i=0; i < Math.min(semitoneLevels.length, semitones.length); i++) {
        fallbackLevels[i] = semitoneLevels[i];
    }
    return fallbackLevels;
  }

  return semitoneLevels;
}

export { getAudioContext, createAnalyserNodes, getSemitoneLevels };
