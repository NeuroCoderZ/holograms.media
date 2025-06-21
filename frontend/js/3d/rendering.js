// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

// Импорты
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

// Store appState globally within this module, or pass it differently if preferred.
// For simplicity in this step, let's assume appState is accessible when animationLoop is called.
// A more robust solution might involve binding appState or making animate a method of a class.
let _appState_for_animation_loop = null;

// Main function to start the animation loop
function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Cannot start animation loop: appState or renderer is missing.");
        return;
    }
    _appState_for_animation_loop = appState; // Store appState for use in animation function
    appState.renderer.setAnimationLoop(animation); // Pass the animation function directly
    console.log("Animation loop started with WebGPURenderer.");
}

// The actual animation function to be called by the loop
async function animation(time) { // 'time' is provided by setAnimationLoop, typically DOMHighResTimeStamp
    if (!_appState_for_animation_loop) return;

    const appState = _appState_for_animation_loop;

    // Convert time to seconds (assuming 'time' is in milliseconds)
    const timeInSeconds = time / 1000.0;

    // Update TWEEN animations (if TWEEN is still used)
    if (TWEEN) {
        TWEEN.update(timeInSeconds);
    }

    // Hologram updates are currently commented out in hologramRenderer.js for Phase 1.
    // If they were active, they would be called here:
    // if (appState.hologramRendererInstance && appState.audio.currentDbLevels && appState.audio.currentPanAngles) {
    //     appState.hologramRendererInstance.updateVisuals(appState.audio.currentDbLevels, appState.audio.currentPanAngles);
    // }

    // Example: Simple scene rotation or object animation can be done here if needed for testing
    // if (appState.scene && appState.scene.children.length > 0) {
    //    const testCube = appState.scene.getObjectByName("testCubeName"); // Assuming a cube was added with this name
    //    if(testCube) {
    //        testCube.rotation.x = timeInSeconds * 0.5;
    //        testCube.rotation.y = timeInSeconds * 0.3;
    //    }
    // }

    // Diagnostic background color change (can be kept for Phase 1 testing)
    if (appState.scene && appState.scene.background) {
        appState.scene.background.setHSL((timeInSeconds * 0.1) % 1.0, 0.6, 0.7);
    }

    // Render the scene using renderAsync for WebGPU
    if (appState.renderer && appState.scene && appState.activeCamera) {
        // For WebGPURenderer, renderer.clear() is often handled internally before renderAsync or is not needed.
        // await appState.renderer.clearAsync(); // If explicit clear is desired/needed
        await appState.renderer.renderAsync(appState.scene, appState.activeCamera);
    }
}

// Function to update hologram mesh (placeholder, needs implementation if used)
// This function might be redundant if all updates are handled within the animation loop
// or by hologramRenderer.js
function updateHologramMesh() {
    // console.log('updateHologramMesh called');
    // Add actual hologram update logic here if needed
}

// Export the function that starts the loop, and any other necessary functions
export { startAnimationLoop, updateHologramMesh };
