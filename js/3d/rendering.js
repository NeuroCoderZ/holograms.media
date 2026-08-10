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

        // Update hologram visuals before rendering.
        // 2026-08-08: legacy-путь Three.js (hologramRendererInstance) больше не
        // создаётся — голограмму рисует HoloEngine своим циклом (js/engine/).
        // Проверка оставлена для обратной совместимости, если инстанс вернут.
        if (appState.hologramRendererInstance?.updateVisuals) {
            appState.hologramRendererInstance.updateVisuals();
        }

        if (window.TWEEN) {
            window.TWEEN.update(time);
        }

        if (appState.animateReturn) {
            appState.animateReturn();
        }

        // Маркеры присутствия обновляются внутри HoloEngine (PresenceLayer).
        // legacy `state.earthZero` удалён в Шаге 3a — Three-слой не нужен.

        // Динамическое центрирование камеры (lerp setViewOffset)
        if (appState.updateViewOffset) {
            appState.updateViewOffset();
        }

        // ЕДИНАЯ КАМЕРА-ИСТОЧНИК (Шаг 2): Three-слои (Holoworld, жесты, пировый мир)
        // рендерятся активной камерой state.activeCamera. Чтобы они не рассинхронизировались
        // с голограммой, которую HoloEngine рисует своей камерой, отражаем позу
        // нативного движка в Three-камеру (eye/target из сферической орбиты).
        // В XR ориентацию задаёт поза гарнитуры — синхронизацию не трогаем.
        const holoCam = appState.holoEngine?.engine;
        if (!appState.isXRMode && holoCam?.getCameraPose && appState.activeCamera) {
            const pose = holoCam.getCameraPose();
            appState.activeCamera.position.set(pose.eye[0], pose.eye[1], pose.eye[2]);
            appState.activeCamera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
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