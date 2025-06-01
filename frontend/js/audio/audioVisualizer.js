// frontend/js/audio/audioVisualizer.js
// This module handles mapping audio data obtained from the AudioAnalyzer to visual parameters
// for the HologramRenderer, thereby creating the audio-reactive visualization.

import { AudioAnalyzer } from './audioAnalyzer.js';
import { HologramRenderer } from '../3d/hologramRenderer.js';
// SMOOTHING_TIME_CONSTANT is imported but not directly used here; it's typically used within AudioAnalyzer.
// import { SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js'; 

let audioAnalyzerInstance = null;
let hologramRendererInstance = null;

/**
 * Initializes the audio visualization module by providing instances of the audio analyzer and hologram renderer.
 * This function must be called before the visualization can start.
 * @param {AudioAnalyzer} analyzer - The instance of AudioAnalyzer from which to get audio levels.
 * @param {HologramRenderer} renderer - The instance of HologramRenderer to update the 3D visualization.
 */
export function initAudioVisualization(analyzer, renderer) {
  // Basic validation to ensure both required instances are provided.
  if (!analyzer || !renderer) {
    console.error("AudioAnalyzer or HologramRenderer instance not provided to initAudioVisualization. Aborting initialization.");
    return;
  }
  // Store the provided instances for later use in the animation loop.
  audioAnalyzerInstance = analyzer;
  hologramRendererInstance = renderer;

  console.log('Audio visualization initialized. Starting animation loop.');
  // Start the animation loop once initialization is complete.
  animateAudioVisuals();
}

/**
 * The main animation loop for audio visualization.
 * This function continuously requests animation frames to update the hologram visuals
 * based on the latest audio data from the AudioAnalyzer.
 */
function animateAudioVisuals() {
  // Request the next animation frame, creating a continuous loop.
  requestAnimationFrame(animateAudioVisuals);

  // If either the audio analyzer or hologram renderer instances are not available,
  // stop the animation loop to prevent errors.
  if (!audioAnalyzerInstance || !hologramRendererInstance) {
    return; 
  }

  // Fetch the latest processed audio levels (e.g., semitone levels) from the audio analyzer.
  const audioLevels = audioAnalyzerInstance.getSemitoneLevels();
  
  // Update the visual columns in the hologram renderer.
  // For the current MVP, we are using the same audio levels for both left and right channels
  // as a placeholder for a true stereo visualization. HologramRenderer expects two arrays.
  hologramRendererInstance.updateColumnVisuals(audioLevels, audioLevels);
}
