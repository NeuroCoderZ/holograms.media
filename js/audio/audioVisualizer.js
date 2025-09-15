// frontend/js/audio/audioVisualizer.js
// This module handles mapping audio data obtained from the AudioAnalyzer to visual parameters
// for the HologramRenderer, thereby creating the audio-reactive visualization.

import { AudioAnalyzer } from './audioAnalyzer.js';
import { HologramRenderer } from '../3d/hologramRenderer.js';
// SMOOTHING_TIME_CONSTANT is imported but not directly used here; it's typically used within AudioAnalyzer.
// import { SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js'; 

// import { SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';
// These instances will be accessed from the global 'state' object.
// let audioAnalyzerInstance = null; // Deprecated: Will use state.audioAnalyzerLeftInstance
// let audioAnalyzerRightInstance = null; // Deprecated: Will use state.audioAnalyzerRightInstance
let hologramRendererInstance = null; // This will be state.hologramRendererInstance

// Import state to access shared instances
import { state } from '../core/init.js';

/**
 * Initializes the audio visualization module by linking to global instances.
 * This function should be called after core initialization (initCore).
 */
export function initAudioVisualization() {
  // Basic validation to ensure required instances are available in the global state.
  if (!state.audioAnalyzerLeftInstance || !state.audioAnalyzerRightInstance || !state.hologramRendererInstance) {
    console.error(
      "AudioAnalyzer instances or HologramRenderer instance not found in global state for initAudioVisualization. Ensure initCore has run and populated these.",
      "state.audioAnalyzerLeftInstance:", state.audioAnalyzerLeftInstance,
      "state.audioAnalyzerRightInstance:", state.audioAnalyzerRightInstance,
      "state.hologramRendererInstance:", state.hologramRendererInstance
    );
    return;
  }
  // No need to store them locally if accessing directly from state.
  // However, if frequent access, local references can be slightly cleaner/performant (micro-optimization).
  // For now, let's use state directly in animateAudioVisuals or assign them here.
  hologramRendererInstance = state.hologramRendererInstance; // Optional: local reference

  console.log('Audio visualization initialized and linked to global instances.');
  // Start the animation loop once initialization is complete.
  // animateAudioVisuals(); // Removed: Animation logic moved to rendering.js
}

/**
 * The main animation loop for audio visualization.
 * This function continuously requests animation frames to update the hologram visuals
 * based on the latest audio data from the AudioAnalyzer.
 */
/* // Commenting out the entire function as its logic is moved to rendering.js
function animateAudioVisuals() {
  // ADD THIS CHECK HERE
  if (!state.audio.analyserLeft || !state.audio.analyserRight) {
      // If analyzers are not ready, DO NOT request the next frame.
      // Just exit.
      return;
  }
  // requestAnimationFrame(animateAudioVisuals);

  // Use the global instances from state
  const analyzerLeft = state.audioAnalyzerLeftInstance;
  const analyzerRight = state.audioAnalyzerRightInstance;
  const renderer = hologramRendererInstance || state.hologramRendererInstance; // Use local or global

  if (!analyzerLeft || !analyzerRight || !renderer) {
    // console.warn("AudioAnalyzers or HologramRenderer not ready, skipping audio visual frame.");
    return; 
  }

  const leftAudioLevels = analyzerLeft.getSemitoneLevels();
  const rightAudioLevels = analyzerRight.getSemitoneLevels();
  
  renderer.updateColumnVisuals(leftAudioLevels, rightAudioLevels);
}
*/
