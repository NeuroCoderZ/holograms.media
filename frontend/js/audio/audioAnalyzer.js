import * as THREE from 'three';
import { semitones } from '../config/hologramConfig.js';

/**
 * AudioAnalyzer class processes raw audio frequency data from an AnalyserNode
 * and converts it into a set of decibel levels corresponding to specific musical semitones.
 * These levels are then used to drive the visual hologram.
 */
export class AudioAnalyzer {
  /**
   * @param {AnalyserNode} analyserNode - The Web Audio API AnalyserNode providing frequency data.
   * @param {AudioContext} audioContext - The Web Audio API AudioContext for context-specific properties like sample rate.
   */
  constructor(analyserNode, audioContext) {
    this.analyserNode = analyserNode;
    this.audioContext = audioContext;
  }

  /**
   * Updates the AnalyserNode used by this AudioAnalyzer instance.
   * Useful when switching audio sources (e.g., from microphone to file).
   * @param {AnalyserNode} newAnalyserNode - The new Web Audio API AnalyserNode.
   */
  setAnalyserNode(newAnalyserNode) {
    if (newAnalyserNode && typeof newAnalyserNode.getByteFrequencyData === 'function') {
      this.analyserNode = newAnalyserNode;
      // Ensure the new analyserNode also has its min/maxDecibels set correctly if needed,
      // though createAnalyserNodes in audioProcessing.js already does this.
      // this.analyserNode.minDecibels = -100;
      // this.analyserNode.maxDecibels = 0;
      console.log("AudioAnalyzer's AnalyserNode updated.");
    } else {
      console.warn("AudioAnalyzer: Invalid AnalyserNode provided to setAnalyserNode.");
    }
  }

  /**
   * Retrieves and processes audio frequency data to produce decibel levels for each defined semitone.
   * The semitone frequencies are defined in `hologramConfig.js`.
   * @returns {number[]} An array of decibel levels (clamped between -100 and 30) for each semitone.
   *   Returns an array of -100 (silent) if the analyser or context is not initialized or data is invalid.
   */
  getSemitoneLevels() {
    // Validate that analyserNode and audioContext are properly initialized.
    if (!this.analyserNode) {
      console.warn("AudioAnalyzer: AnalyserNode is not initialized. Returning silent levels.");
      return semitones.map(() => -100); // Return default silent values to prevent errors.
    }
    if (!this.audioContext) {
      console.warn("AudioAnalyzer: AudioContext is not initialized. Returning silent levels.");
      return semitones.map(() => -100);
    }

    // frequencyBinCount is half of the FFT size and represents the number of data points (bins) in the frequency domain.
    const bufferLength = this.analyserNode.frequencyBinCount;
    if (bufferLength === 0) {
        console.warn("AudioAnalyzer: bufferLength is 0. AnalyserNode might not be configured correctly (e.g., fftSize). Returning silent levels.");
        return semitones.map(() => -100);
    }
    // Create a Uint8Array to hold the frequency data (amplitude values per bin, 0-255).
    const dataArray = new Uint8Array(bufferLength);
    // Populate the dataArray with the current frequency data.
    this.analyserNode.getByteFrequencyData(dataArray);

    // Get the audio context's sample rate, crucial for frequency calculations.
    const sampleRate = this.audioContext.sampleRate;
    if (sampleRate === 0) {
        console.warn("AudioAnalyzer: sampleRate is 0. AudioContext might not be running. Returning silent levels.");
        return semitones.map(() => -100);
    }
    // Get the FFT size, which determines the frequency resolution.
    const fftSize = this.analyserNode.fftSize; 
    if (!fftSize) {
        console.warn("AudioAnalyzer: fftSize is not available on analyserNode. Returning silent levels.");
        return semitones.map(() => -100);
    }
    // Calculate the size of each frequency bin in Hz. 
    // This tells us how many Hz each element in dataArray represents.
    const binSize = sampleRate / fftSize;

    if (binSize === 0) {
        console.warn("AudioAnalyzer: binSize is 0. sampleRate or fftSize might be zero. Returning silent levels.");
        return semitones.map(() => -100);
    }

    // Map each predefined semitone frequency to its corresponding decibel level.
    return semitones.map(semitone => {
      const targetFrequency = semitone.f;
      // Calculate the approximate bin index for the target frequency.
      const binIndex = Math.round(targetFrequency / binSize);

      // Ensure the calculated bin index is within the valid range of the dataArray.
      if (binIndex < 0 || binIndex >= bufferLength) {
        // This can occur if the target frequency is outside the analyzable range (e.g., too high or too low).
        return -100; // Return a silent value for out-of-range frequencies.
      }

      // Get the amplitude value from the data array for the relevant frequency bin.
      const amplitude = dataArray[binIndex];
      if (amplitude === 0) {
        return -100; // If amplitude is 0, it means no signal at this frequency, represent as silence.
      }

      // Convert the amplitude (0-255) to a decibel (dB) value.
      // Convert amplitude (0-255) to dB. 0dB is max.
      // 20 * log10(amplitude / 255) converts an amplitude ratio (0-1) to dB.
      // Max amplitude (255) will be 20 * log10(1) = 0 dB.
      // Min amplitude (e.g., 1/255) will be a large negative dB value.
      const rawDb = 20 * Math.log10(amplitude / 255);

      // Clamp to a range of -100dB (considered silence for visualization) to 0dB (max).
      // This ensures the output is standardized for the visualizer.
      const db = THREE.MathUtils.clamp(rawDb, -100, 0);
      return db;
    });
  }
}
