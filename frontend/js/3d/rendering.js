// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

// Импорты
import * as THREE from 'three';
// TWEEN подключается глобально через CDN в index.html
import { state } from '../core/init.js'; // Для доступа к state.scene, state.mainSequencerGroup

// Глобальная переменная для отслеживания времени анимации
let time = 0;

// Animation loop function
function animate(currentTime) {
    requestAnimationFrame(animate);

    // Convert to seconds if currentTime is provided by requestAnimationFrame (milliseconds)
    time = currentTime / 1000;

    // Update TWEEN animations
    window.TWEEN.update(time);

    // --- START REPLACEMENT BLOCK ---
    // Check if hologramRendererInstance exists and if WASM processed audio data is available
    if (state.hologramRendererInstance && state.audio.currentDbLevels && state.audio.currentPanAngles &&
        state.audio.currentDbLevels.length === 260 && state.audio.currentPanAngles.length === 130) {
        
        // Pass both levels and angles to the hologram renderer
        state.hologramRendererInstance.updateVisuals(state.audio.currentDbLevels, state.audio.currentPanAngles);

        // ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ЛОГ:
        const leftLevels = state.audio.currentDbLevels.slice(0, 130);
        const leftSum = leftLevels.reduce((a, b) => a + b, 0);
        if (leftSum > -13000) { // Если сумма не равна полной тишине (assuming -100 * 130 = -13000)
            console.log(`[Animate DEBUG] Audio data received from WASM. Left Sum: ${leftSum}`);
        }
    }
    // --- END REPLACEMENT BLOCK ---

    // Render the scene
    if (state.renderer && state.scene && state.activeCamera) { // Ensure activeCamera is used
        state.renderer.clear(); // Clear before rendering
        state.renderer.render(state.scene, state.activeCamera);
    }

}

// Function to update hologram mesh (placeholder, needs implementation if used)
function updateHologramMesh() {
    // console.log('updateHologramMesh called');
    // Add actual hologram update logic here if needed
}

// Export necessary functions
export { animate, updateHologramMesh };
