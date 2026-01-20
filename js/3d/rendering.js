export function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Animation loop cannot start: renderer is missing.");
        return;
    }
    console.log("✅ Animation loop started.");

    const isWebGPU = appState.renderer.isWebGPURenderer === true;
    console.log(`[Rendering] Using ${isWebGPU ? 'WebGPU' : 'WebGL'} render loop.`);

    async function animate(time) {
        // Update hologram visuals before rendering
        if (appState.hologramRendererInstance) {
            appState.hologramRendererInstance.updateVisuals();
        }

        if (window.TWEEN) {
            window.TWEEN.update(time);
        }

        if (appState.animateReturn) {
            appState.animateReturn();
        }

        if (isWebGPU) {
            await appState.renderer.renderAsync(appState.scene, appState.activeCamera);
        } else {
            appState.renderer.render(appState.scene, appState.activeCamera);
        }
    }

    appState.renderer.setAnimationLoop(animate);
}