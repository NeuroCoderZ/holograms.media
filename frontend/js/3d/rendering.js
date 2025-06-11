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

    // ---- NEW AUDIO VISUALIZATION LOGIC (getSemitoneLevels) ----
    if (state.audio && state.audio.activeSource === 'microphone' &&
        state.audioAnalyzerLeftInstance && state.audioAnalyzerLeftInstance.analyserNode &&
        state.audioAnalyzerRightInstance && state.audioAnalyzerRightInstance.analyserNode &&
        state.hologramRendererInstance) {

        // Check if getSemitoneLevels method exists on the instances
        if (typeof state.audioAnalyzerLeftInstance.getSemitoneLevels === 'function' &&
            typeof state.audioAnalyzerRightInstance.getSemitoneLevels === 'function') {

            const leftAudioLevels = state.audioAnalyzerLeftInstance.getSemitoneLevels();
            const rightAudioLevels = state.audioAnalyzerRightInstance.getSemitoneLevels();

            // Ensure levels are valid before calling update
            if (leftAudioLevels && rightAudioLevels) {
                 state.hologramRendererInstance.updateColumnVisuals(leftAudioLevels, rightAudioLevels);
            } else {
                // console.warn('[Animate] getSemitoneLevels returned invalid data, sending empty arrays to visuals.');
                // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(), new Uint8Array()); // Or appropriate empty/silent representation
            }
        } else {
            // console.warn('[Animate] getSemitoneLevels method not found on audio analyzer instances.');
        }
    } else if (state.audio && state.audio.activeSource !== 'microphone' && state.hologramRendererInstance) {
        // If not microphone, or components missing, send empty/silent data to clear visuals
        // This ensures visuals reset when microphone stops.
        // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(), new Uint8Array()); // Or a specific method to reset/clear
    }
    // ---- END NEW AUDIO VISUALIZATION LOGIC ----

    // Audio processing and visualization updates
    if (state.audio) { // Ensure state.audio is initialized
        // Modified condition: Call if activeSource is 'file' and an audioBuffer is loaded.
        // updateFilePlaybackVisuals will internally handle playing vs. silent state.
        if (state.audio.activeSource === 'file' && state.audio.audioBuffer) {
            // updateFilePlaybackVisuals(); // Removed as per request
        } else if (state.audio.activeSource === 'microphone' &&
                   state.hologramRendererInstance &&
                   state.hologramRendererInstance &&
                   state.audioAnalyzerLeftInstance && state.audioAnalyzerLeftInstance.analyserNode && // Check analyserNode exists
                   state.audioAnalyzerRightInstance && state.audioAnalyzerRightInstance.analyserNode && // Check analyserNode exists
                   true /* simplified condition for subtask, assuming instances are valid */ ) {

        // Use an IIFE to handle async adaptiveCWT calls
        (async () => {
            try {
                // adaptiveCWT now accepts an AnalyserNode directly
                // It returns [data, data], so we take the first element for each channel's data.
                const leftChannelData = await adaptiveCWT(state.audioAnalyzerLeftInstance.analyserNode);
                const rightChannelData = await adaptiveCWT(state.audioAnalyzerRightInstance.analyserNode);

                if (leftChannelData && rightChannelData && leftChannelData[0] && rightChannelData[0]) {
                    // Pass the raw Uint8Array (0-255 values)
                    state.hologramRendererInstance.updateColumnVisuals(leftChannelData[0], rightChannelData[0]);

                    // --- Diagnosis: Log audio data ---
                    const leftData = leftChannelData[0];
                    const rightData = rightChannelData[0];
                    if (leftData.length > 0 || rightData.length > 0) {
                        console.log('[AudioVizDebug] Left Data (first 5):', leftData.slice(0, 5), 'Sum:', leftData.reduce((a, b) => a + b, 0));
                        console.log('[AudioVizDebug] Right Data (first 5):', rightData.slice(0, 5), 'Sum:', rightData.reduce((a, b) => a + b, 0));

                        // Check if data is mostly non-zero
                        const leftNonZero = leftData.filter(val => val > 0).length > leftData.length / 10;
                        const rightNonZero = rightData.filter(val => val > 0).length > rightData.length / 10;
                        if (!leftNonZero && !rightNonZero && (leftData.reduce((a,b)=>a+b,0) > 0 || rightData.reduce((a,b)=>a+b,0) > 0) ) {
                             // console.warn('[AudioVizDebug] Audio data seems very sparse or mostly zero.');
                        }
                    } else {
                        // console.warn('[AudioVizDebug] Audio data arrays are empty.');
                    }
                    // --- End Diagnosis ---
                } else {
                    // Handle case where adaptiveCWT might return null/undefined or empty arrays
                    // console.warn("adaptiveCWT did not return expected data for microphone, sending empty arrays to visuals.");
                    // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260)); // Send empty data
                }
            } catch (error) {
                console.error("Error updating microphone visuals with adaptiveCWT:", error);
                // Optionally, reset visuals or send empty data
                // state.hologramRendererInstance.updateColumnVisuals(new Uint8Array(260), new Uint8Array(260));
            }
        })();

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