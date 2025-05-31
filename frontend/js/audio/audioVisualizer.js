// frontend/js/audio/audioVisualizer.js
// Handles mapping audio data to visual hologram parameters.

import { AudioAnalyzer } from './audioAnalyzer.js';
import { HologramRenderer } from '../3d/hologramRenderer.js';
import { SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';

let audioAnalyzerInstance = null;
let hologramRendererInstance = null;

/**
 * Initializes the audio visualization module.
 * @param {AudioAnalyzer} analyzer - The AudioAnalyzer instance.
 * @param {HologramRenderer} renderer - The HologramRenderer instance.
 */
export function initAudioVisualization(analyzer, renderer) {
  if (!analyzer || !renderer) {
    console.error("AudioAnalyzer or HologramRenderer instance not provided to initAudioVisualization.");
    return;
  }
  audioAnalyzerInstance = analyzer;
  hologramRendererInstance = renderer;

  console.log('Audio visualization initialized.');
  animateAudioVisuals();
}

/**
 * The main animation loop for audio visualization.
 * Continuously fetches audio data and updates hologram visuals.
 */
function animateAudioVisuals() {
  requestAnimationFrame(animateAudioVisuals);

  if (!audioAnalyzerInstance || !hologramRendererInstance) {
    return; // Stop if not initialized
  }

  // Get audio levels from the analyzer.
  // For simplicity, we assume stereo or use the same levels for both left/right.
  // In a real scenario, you might have separate analyzers or logic for stereo.
  const audioLevels = audioAnalyzerInstance.getSemitoneLevels();
  
  // For MVP, we'll use the same levels for left and right for now.
  // The hologramRenderer.updateColumnVisuals expects two arrays (left and right).
  hologramRendererInstance.updateColumnVisuals(audioLevels, audioLevels);
}
