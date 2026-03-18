export function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Animation loop cannot start: renderer is missing.");
        return;
    }
    console.log("✅ Animation loop started.");

    const isWebGPU = appState.renderer.isWebGPURenderer === true;
    console.log(`[Rendering] Using ${isWebGPU ? 'WebGPU' : 'WebGL'} render loop.`);

    let lastTime = performance.now();
    async function animate(time) {
        // Delta time for camera rotation
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;

        if (appState.updateCameraRotation) {
            appState.updateCameraRotation(deltaTime);
        }

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

        if (appState.earthZero) {
            appState.earthZero.update(deltaTime);
        }

        if (isWebGPU) {
            await appState.renderer.renderAsync(appState.scene, appState.activeCamera);
        } else {
            appState.renderer.render(appState.scene, appState.activeCamera);
        }
    }

    appState.renderer.setAnimationLoop(animate);
}