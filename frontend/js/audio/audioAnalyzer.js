import * as THREE from 'three';
import { semitones } from '../config/hologramConfig.js';

export class AudioAnalyzer {
  constructor(analyserNode, audioContext) {
    this.analyserNode = analyserNode;
    this.audioContext = audioContext;
  }

  getSemitoneLevels() {
    if (!this.analyserNode) {
      console.warn("AudioAnalyzer: AnalyserNode is not initialized.");
      return semitones.map(() => -100); // Return default silent values
    }
    if (!this.audioContext) {
      console.warn("AudioAnalyzer: AudioContext is not initialized.");
      return semitones.map(() => -100);
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    if (bufferLength === 0) {
        console.warn("AudioAnalyzer: bufferLength is 0, analyser may not be configured correctly (e.g. fftSize).");
        return semitones.map(() => -100);
    }
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    const sampleRate = this.audioContext.sampleRate;
    if (sampleRate === 0) {
        console.warn("AudioAnalyzer: sampleRate is 0, AudioContext may not be running.");
        return semitones.map(() => -100);
    }
    // fftSize should be available on the analyserNode
    const fftSize = this.analyserNode.fftSize; 
    if (!fftSize) {
        console.warn("AudioAnalyzer: fftSize is not available on analyserNode.");
        return semitones.map(() => -100);
    }
    const binSize = sampleRate / fftSize; // Each bin represents this many Hz

    if (binSize === 0) {
        console.warn("AudioAnalyzer: binSize is 0. sampleRate or fftSize might be zero.");
        return semitones.map(() => -100);
    }

    return semitones.map(semitone => {
      const targetFrequency = semitone.f;
      const binIndex = Math.round(targetFrequency / binSize);

      if (binIndex < 0 || binIndex >= bufferLength) {
        // This can happen if the target frequency is outside the analyzable range
        return -100;
      }

      const amplitude = dataArray[binIndex];
      if (amplitude === 0) {
        return -100; // No signal at this frequency bin
      }

      // Convert amplitude to dB. The factor 1.5 is a custom scaling.
      // Amplitude is 0-255. Normalize to 0-1 by dividing by 255.
      const normalizedAmplitude = amplitude / 255;
      let dB = 20 * Math.log10(normalizedAmplitude);
      
      // Apply custom scaling factor if needed, as per original script's intent.
      // The original script used: 20 * Math.log10(amplitude / 255) * 1.5;
      // This is equivalent to: (20 * Math.log10(amplitude / 255)) * 1.5;
      // Or: 30 * Math.log10(amplitude / 255);
      // Let's use the direct formula from the prompt's script.js example for consistency.
      dB = 20 * Math.log10(amplitude / 255) * 1.5;


      // Clamp the dB value to the range -100 to 30
      return THREE.MathUtils.clamp(dB, -100, 30);
    });
  }
}
