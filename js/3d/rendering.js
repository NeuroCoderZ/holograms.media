import * as TWEEN from '@tweenjs/tween.js';

export function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Animation loop cannot start: renderer is missing.");
        return;
    }
    console.log("✅ Animation loop started.");

    function animate(time) {
        appState.renderer.setAnimationLoop(animate); // Ensures continuous loop
        TWEEN.update(time);

        // Auto-return animation for camera controls
        if (appState.animateReturn) {
            appState.animateReturn();
        }

        // Placeholder for future hologram updates
        if (appState.hologramData && appState.hologramRendererInstance) {
            // appState.hologramRendererInstance.updateVisuals(appState.hologramData);
        }

        appState.renderer.render(appState.scene, appState.activeCamera);
    }
    appState.renderer.setAnimationLoop(animate);
}