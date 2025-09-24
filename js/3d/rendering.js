
export function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Animation loop cannot start: renderer is missing.");
        return;
    }
    console.log("✅ Animation loop started.");

    function animate(time) {
        appState.renderer.setAnimationLoop(animate); // Ensures continuous loop
        window.TWEEN.update(time);

        // Auto-return animation for camera controls
        if (appState.animateReturn) {
            appState.animateReturn();
        }

        // Update hologram visuals
        if (appState.hologramRendererInstance) {
            appState.hologramRendererInstance.updateVisuals();
        }

        appState.renderer.render(appState.scene, appState.activeCamera);
    }
    appState.renderer.setAnimationLoop(animate);
}