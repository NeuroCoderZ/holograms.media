export function startAnimationLoop(appState) {
    if (!appState || !appState.renderer) {
        console.error("Animation loop cannot start: renderer is missing.");
        return;
    }
    console.log("✅ Animation loop started.");

    const isWebGPU = appState.renderer.isWebGPURenderer === true;
    console.log(`[Rendering] Using ${isWebGPU ? 'WebGPU' : 'WebGL'} render loop.`);

    let lastTime = performance.now();
    let paused = false;

    async function animate(time) {
        if (paused) return;

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

        // Dynamic camera centering (lerp setViewOffset)
        if (appState.updateViewOffset) {
            appState.updateViewOffset();
        }

        if (isWebGPU) {
            await appState.renderer.renderAsync(appState.scene, appState.activeCamera);
        } else {
            appState.renderer.render(appState.scene, appState.activeCamera);
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            paused = true;
            if (appState.audioContext && appState.audioContext.state === 'running') {
                appState.audioContext.suspend();
            }
            console.log('[Rendering] Tab hidden — animation paused, AudioContext suspended.');
        } else {
            paused = false;
            lastTime = performance.now();
            if (appState.audioContext && appState.audioContext.state === 'suspended') {
                appState.audioContext.resume();
            }
            console.log('[Rendering] Tab visible — animation resumed, AudioContext resumed.');
        }
    });

    appState.renderer.setAnimationLoop(animate);
}