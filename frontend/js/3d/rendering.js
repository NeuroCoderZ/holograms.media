// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

// Импорты
import * as THREE from 'three';
// TWEEN подключается глобально через CDN в index.html
import { state } from '../core/init.js'; // Для доступа к state.scene, state.mainSequencerGroup
import { updateLiveSequencerVisuals } from '../audio/audioProcessing.js';

// --- Redundant variables, constants, and functions have been removed ---
// The following are no longer needed here as they are handled in sceneSetup.js or audioProcessing.js:
// - export const columns = [];
// - export function degreesToCells(index) { ... }
// - export const semitones = Array.from({ length: 130 }, (_, i) => { ... });
// - Color configuration constants (START_HUE, END_HUE, etc.)
// - Audio configuration constants (BASE_FREQUENCY, NOTES_PER_OCTAVE, etc.)
// - Grid and Scale Configuration constants (_GRID_WIDTH, GRID_HEIGHT, etc.)
// - createSphere, createLine, createAxis, createGrid, createSequencerGrid
// - createColumn, initializeColumns
// - updateAudioVisualization, updateColumnVisualization, resetVisualization
// - createAudioVisualization, updateSequencerColumns


// Глобальная переменная для отслеживания времени анимации
let time = 0;

// Animation loop function
function animate(currentTime) {
    requestAnimationFrame(animate);

    // Convert to seconds if currentTime is provided by requestAnimationFrame (milliseconds)
    time = currentTime / 1000;

    // Update TWEEN animations
    TWEEN.update(time);

    // Audio processing and visualization updates
    if (state.audio) { // Ensure state.audio is initialized
        // Modified condition: Call if activeSource is 'file' and an audioBuffer is loaded.
        // updateFilePlaybackVisuals will internally handle playing vs. silent state.
        if (state.audio.activeSource === 'file' && state.audio.audioBuffer) {
            // updateFilePlaybackVisuals(); // Removed as per request
        } else if (state.audio.activeSource === 'microphone' &&
                   state.hologramRendererInstance &&
                   state.audioAnalyzerLeftInstance &&
                   state.audioAnalyzerRightInstance &&
                   state.audio.microphoneAnalysers && // Ensure analysers are ready from MicrophoneManager
                   state.audio.microphoneAnalysers.left && 
                   state.audio.microphoneAnalysers.right) {
            
            const leftLevels = state.audioAnalyzerLeftInstance.getSemitoneLevels();
            const rightLevels = state.audioAnalyzerRightInstance.getSemitoneLevels();
            state.hologramRendererInstance.updateColumnVisuals(leftLevels, rightLevels);

        } else {
            // Optional: Call a function to reset columns to a default visual state if no audio is active.
            // This could be state.hologramRendererInstance.updateColumnVisuals([], []) or a specific reset method.
            // For now, if nothing is active, columns remain in their last state or are reset by other logic.
            // If hologramRendererInstance exists, we could potentially tell it to clear/reset.
            if (state.hologramRendererInstance && (state.audio.activeSource === 'none' || !state.audio.activeSource)) {
                 // Consider adding a specific method like resetVisuals or pass empty/default levels
                 // state.hologramRendererInstance.updateColumnVisuals(allSilentLevels, allSilentLevels);
            }
            // This could be a new function in audioProcessing.js or reuse existing reset logic if appropriate.
            // For now, if resetVisualization() in microphoneManager.js handles the mic-off case,
            // and if updateFilePlaybackVisuals handles its own "silence" (e.g. snap to zero), this might be sufficient.
            // Consider adding an explicit call like:
            // if (typeof resetAudioVisualization === 'function') resetAudioVisualization();
            // if columns are not returning to zero otherwise.
            // For now, we rely on the visualizers to handle "silence" or the explicit reset in stopMicrophone.
        }
    }

    // Render the scene
    if (state.renderer && state.scene && state.activeCamera) { // Ensure activeCamera is used
        state.renderer.clear(); // Clear before rendering
        state.renderer.render(state.scene, state.activeCamera);
    }

    // Any other animation updates can go here
    // For example, if there's a hologram mesh to update:
    // if (typeof updateHologramMesh === 'function') {
    //     updateHologramMesh(time);
    // }
}



// Function to update hologram mesh (placeholder, needs implementation if used)
function updateHologramMesh() {
    // console.log('updateHologramMesh called');
    // Add actual hologram update logic here if needed
}

// Export necessary functions
export { animate, updateHologramMesh };