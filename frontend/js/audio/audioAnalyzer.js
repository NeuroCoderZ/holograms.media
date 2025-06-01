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
      // The formula 20 * log10(amplitude / 255) converts an amplitude ratio to dB.
      // The multiplication by 1.5 is a custom scaling factor used to visually enhance the perceived loudness.
      let dB = 20 * Math.log10(amplitude / 255) * 1.5;

      // Clamp the resulting dB value to a predefined range (-100 dB to 30 dB).
      // -100 dB typically represents silence, and 30 dB represents a peak loud sound for visualization purposes.
      // This prevents extreme values from distorting the visualization.
      return THREE.MathUtils.clamp(dB, -100, 30);
    });
  }
}
