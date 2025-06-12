// frontend/js/audio/audioAnalyzer.js

// This file is now largely deprecated as audio analysis is handled by the WASM AudioWorklet.
// Keeping it as a placeholder or for potential future use if specific non-WASM analysis is needed.
// The core functionality for getting semitone levels is moved to the AudioWorklet processor.

// Placeholder export if other modules still try to import it.
export class AudioAnalyzer {
  constructor() {
    console.warn("AudioAnalyzer: This class is deprecated. Audio analysis is now handled by WASM AudioWorklet.");
  }

  // getSemitoneLevels and setAnalyserNode are no longer used.
  getSemitoneLevels() {
    return []; // Return an empty array or default silent values
  }

  setAnalyserNode(newNode) {
    // No operation needed
  }
}
