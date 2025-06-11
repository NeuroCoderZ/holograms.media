// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

// Импорты
import * as THREE from 'three';
// TWEEN подключается глобально через CDN в index.html
import { state } from '../core/init.js'; // Для доступа к state.scene, state.mainSequencerGroup
import { adaptiveCWT } from '../audio/waveletAnalyzer.js';

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
    window.TWEEN.update(time);

    // --- Unified Audio Visualization Logic ---
    if (state.hologramRendererInstance && state.audioAnalyzerLeftInstance && state.audioAnalyzerRightInstance &&
        typeof state.audioAnalyzerLeftInstance.getSemitoneLevels === 'function' &&
        typeof state.audioAnalyzerRightInstance.getSemitoneLevels === 'function') {

        if (state.audio && (state.audio.activeSource === 'microphone' || state.audio.activeSource === 'file') &&
            state.audioAnalyzerLeftInstance.analyserNode && state.audioAnalyzerRightInstance.analyserNode) {

            const leftAudioLevels = state.audioAnalyzerLeftInstance.getSemitoneLevels();
            const rightAudioLevels = state.audioAnalyzerRightInstance.getSemitoneLevels();

            if (leftAudioLevels && rightAudioLevels) {
                state.hologramRendererInstance.updateColumnVisuals(leftAudioLevels, rightAudioLevels);
            } else {
                // Send empty data if getSemitoneLevels returns invalid data
                // console.warn('[Animate] getSemitoneLevels returned invalid data, sending empty arrays to visuals.');
                state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
            }
        } else {
            // Audio inactive or analyzers not ready, send silent data
            state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
        }
    } else {
        // Fallback if renderer or analyzers are not even set up, or getSemitoneLevels is missing
        if (state.hologramRendererInstance) {
            // console.warn('[Animate] Core components for audio visualization missing (renderer, analyzers, or getSemitoneLevels method). Sending silent data.');
            state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
        }
    }
    // --- End Unified Audio Visualization Logic ---

    // ---- Commented out conflicting/alternative adaptiveCWT audio processing block ----
    /*
    if (state.audio) {
        if (state.audio.activeSource === 'file' && state.audio.audioBuffer) {
            // updateFilePlaybackVisuals(); // Removed as per request
        } else if (state.audio.activeSource === 'microphone' &&
                   state.hologramRendererInstance &&
                   state.audioAnalyzerLeftInstance && state.audioAnalyzerLeftInstance.analyserNode &&
                   state.audioAnalyzerRightInstance && state.audioAnalyzerRightInstance.analyserNode &&
                   true) {

            (async () => {
                try {
                    const leftChannelData = await adaptiveCWT(state.audioAnalyzerLeftInstance.analyserNode);
                    const rightChannelData = await adaptiveCWT(state.audioAnalyzerRightInstance.analyserNode);

                    if (leftChannelData && rightChannelData && leftChannelData[0] && rightChannelData[0]) {
                        state.hologramRendererInstance.updateColumnVisuals(leftChannelData[0], rightChannelData[0]);
                        // ... (diagnosis logs) ...
                    } else {
                        // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
                    }
                } catch (error) {
                    console.error("Error updating microphone visuals with adaptiveCWT:", error);
                    // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
                }
            })();

        } else {
            if (state.hologramRendererInstance && (state.audio.activeSource === 'none' || !state.audio.activeSource)) {
                 // state.hologramRendererInstance.updateColumnVisuals(allSilentLevels, allSilentLevels);
            }
        }
    }
    */

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