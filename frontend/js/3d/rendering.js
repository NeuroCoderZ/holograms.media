// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

// Импорты
import * as THREE from 'three';
// TWEEN подключается глобально через CDN в index.html
// import { state } from '../core/init.js'; // Removed import

// Глобальная переменная для отслеживания времени анимации
// let time = 0; // time variable is local to animate function if based on currentTime

// Animation loop function
function animate(appState, currentTime) { // Added appState
    // В самом начале функции animate()
    if (!window.renderCheck) {
        console.log('[Render-Loop Check] Animate function is running.');
        console.log('[Render-Loop Check] Scene object:', appState.scene);
        console.log('[Render-Loop Check] Active Camera:', appState.activeCamera);
        // console.log('[Render-Loop Check] Renderer instance:', appState.renderer); // As per original plan, but renderer was not in the user's snippet for Действие 2.1
        console.log('[Render-Loop Check] Scene children count at loop start:', appState.scene.children.length);
        window.renderCheck = true;
    }
    requestAnimationFrame((time) => animate(appState, time)); // Pass appState in recursive call

    // Convert to seconds if currentTime is provided by requestAnimationFrame (milliseconds)
    const timeInSeconds = currentTime / 1000;

    // Update TWEEN animations
    window.TWEEN.update(timeInSeconds);

    // --- START REPLACEMENT BLOCK ---
    // Check if hologramRendererInstance exists and if WASM processed audio data is available
    if (appState.hologramRendererInstance && appState.audio.currentDbLevels && appState.audio.currentPanAngles &&
        appState.audio.currentDbLevels.length === 260 && appState.audio.currentPanAngles.length === 130) {
        
        // Pass both levels and angles to the hologram renderer
        appState.hologramRendererInstance.updateVisuals(appState.audio.currentDbLevels, appState.audio.currentPanAngles);

        // ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ЛОГ:
        const leftLevels = appState.audio.currentDbLevels.slice(0, 130);
        const leftSum = leftLevels.reduce((a, b) => a + b, 0);
        if (leftSum > -13000) { // Если сумма не равна полной тишине (assuming -100 * 130 = -13000)
            console.log(`[Animate DEBUG] Audio data received from WASM. Left Sum: ${leftSum}`);
        }
    }
    // --- END REPLACEMENT BLOCK ---

    // Render the scene
    if (appState.renderer && appState.scene && appState.activeCamera) { // Ensure activeCamera is used
        appState.renderer.clear(); // Clear before rendering
        // Непосредственно перед appState.renderer.render(...)
        if (window.renderCheck && !window.renderCheckFrame) {
            console.log('[Render-Loop Check] State just before first render call:');
            console.log('[Render-Loop Check] Camera position:', appState.activeCamera.position);
            console.log('[Render-Loop Check] Scene children count before render:', appState.scene.children.length);
            window.renderCheckFrame = true;
        }
        appState.renderer.render(appState.scene, appState.activeCamera);
    }

}

// Function to update hologram mesh (placeholder, needs implementation if used)
function updateHologramMesh() {
    // console.log('updateHologramMesh called');
    // Add actual hologram update logic here if needed
}

// Export necessary functions
export { animate, updateHologramMesh };
