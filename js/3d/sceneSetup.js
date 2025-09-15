import * as TWEEN from '@tweenjs/tween.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

/**
 * Initializes the Three.js scene, camera, renderer, and basic lighting.
 * Assigns these components to the provided state object.
 * @param {object} state - The global state object to populate with scene components.
 *                         Expected to have a `config.CAMERA` object or defaults will be used.
 */
export async function initializeScene(state) {
  // Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x000000); // Black background
  state.scene.position.set(0, 0, 0); // Shift scene left by 128 units

  // --- WebGL Renderer Initialization ---
  try {
    console.log('[WebGL Init] Attempting to create WebGLRenderer...');
    state.renderer = new THREE.WebGLRenderer({
        antialias: true,
        // powerPreference: 'high-performance' // Retained for potential relevance
    });
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space for WebGL

    const canvas = state.renderer.domElement;

    canvas.addEventListener('webglcontextlost', function(event) {
        event.preventDefault();
        console.warn('!!! CONTEXT LOST! Stopping animation loop.');
        // Здесь мы должны остановить цикл анимации, если он есть
        // В нашем случае, мы пока просто логируем.
    }, false);

    canvas.addEventListener('webglcontextrestored', function() {
        console.log('✅ CONTEXT RESTORED! Re-initializing scene...');
        // Здесь мы должны были бы заново создать все текстуры и буферы.
        // Для нашего теста, мы просто перезагрузим страницу, чтобы все пересоздалось.
        alert('WebGL context was restored. Reloading the page.');
        window.location.reload();
    }, false);

    console.log('WebGL context loss handlers attached.');

    console.log('[WebGL Init] WebGLRenderer initialized successfully.');

  } catch (error) {
    console.error('CRITICAL: WebGLRenderer Initialization Failed.', error);
    const errorOverlay = document.getElementById('webgl-error-overlay');
    const errorDetailsElement = document.getElementById('webgl-error-details');
    let userMessage = 'Не удалось инициализировать 3D-графику (WebGL). Ваш браузер или устройство не поддерживают WebGL, или возникла критическая ошибка.';

    if (error.message.includes('context loss and was blocked')) {
        userMessage = 'Не удалось инициализировать 3D-графику (WebGL). Браузер заблокировал создание контекста. Это часто происходит, если вы используете IP-адрес вместо "localhost" или HTTPS. Пожалуйста, попробуйте открыть приложение через "localhost" или безопасное соединение (HTTPS).';
    } else if (error.message.includes('WebGL context')) {
        userMessage = 'Не удалось инициализировать 3D-графику (WebGL). Возможно, ваш браузер не поддерживает WebGL или драйверы устарели.';
    }

    if (errorOverlay) {
        if (errorDetailsElement) {
            errorDetailsElement.textContent = userMessage + ' (Подробности в консоли: ' + error.message + ')';
        }
        errorOverlay.style.display = 'flex';
    } else {
        // Fallback if overlay is not found
        const fallbackDiv = document.createElement('div');
        fallbackDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; color: white; display: flex; justify-content: center; align-items: center; text-align: center; padding: 20px; font-size: 1.2em; z-index: 9999;';
        fallbackDiv.textContent = userMessage;
        document.body.appendChild(fallbackDiv);
    }

    if (state.renderer && state.renderer.domElement && state.renderer.domElement.parentElement) {
        state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
    }
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    return { scene: null, renderer: null, camera: null };
  }

  const gridContainer = document.getElementById('grid-container');
  if (!gridContainer) {
    console.error('#grid-container not found. This is essential for camera and renderer setup.');
    // Fallback or error handling: create a dummy gridContainer or throw error
    // For now, let's assume it will always be there as per requirements.
    // If it's not, camera setup below will fail.
  }

  // Camera - Orthographic
  // Dimensions based on gridContainer, ensuring it's available
  const containerWidth = gridContainer && gridContainer.clientWidth > 0 ? gridContainer.clientWidth : window.innerWidth;
  const containerHeight = gridContainer && gridContainer.clientHeight > 0 ? gridContainer.clientHeight : window.innerHeight;
  console.log(`[sceneSetup] Container dimensions: Width = ${containerWidth}, Height = ${containerHeight}`);

  const camLeft = -containerWidth / 2;
  const camRight = containerWidth / 2;
  const camTop = containerHeight / 2;
  const camBottom = -containerHeight / 2;
  const camNear = 0.1; // Requirement: 0.1
  const camFar = 2000; // Requirement: 2000

  state.camera = new THREE.OrthographicCamera(camLeft, camRight, camTop, camBottom, camNear, camFar);
  state.camera.position.set(0, 0, 1000); // As per prompt (e.g., 1000 or 1200)
  state.camera.lookAt(0, 0, 0); // Ensure camera looks at the origin
  state.activeCamera = state.camera; // Set default active camera

  // Add OrbitControls for orthographic camera
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableRotate = true;
  state.controls.enableZoom = false;
  state.controls.enablePan = true;
  state.controls.minPolarAngle = 0; // 0 degrees
  state.controls.maxPolarAngle = Math.PI; // 180 degrees
  state.controls.minAzimuthAngle = -Math.PI / 2; // -90 degrees
  state.controls.maxAzimuthAngle = Math.PI / 2; // 90 degrees

  // Store initial camera position and target for auto-return
  state.initialCameraPosition = state.camera.position.clone();
  state.initialControlsTarget = new THREE.Vector3(0, 0, 0); // Target at origin
  state.controls.target.copy(state.initialControlsTarget);

  // Auto-return animation properties
  state.returnTween = null;
  state.returnDelay = 0; // No delay before starting return animation

  // Add event listener for when user stops interacting
  state.controls.addEventListener('end', () => {
    // Clear any existing tween
    if (state.returnTween) {
      state.returnTween.stop();
    }

    // Start delayed return animation
    setTimeout(() => {
      state.startReturnAnimation();
    }, state.returnDelay);
  });

  // Function to start TWEEN-based return animation
  state.startReturnAnimation = function() {
    const startPosition = state.camera.position.clone();
    const startTarget = state.controls.target.clone();

    // Create tween for camera position
    const positionTween = new TWEEN.Tween(startPosition)
      .to(state.initialCameraPosition, 300) // 0.3 seconds duration
      .easing(TWEEN.Easing.Quadratic.Out) // Smooth easing
      .onUpdate(() => {
        state.camera.position.copy(startPosition);
        state.camera.lookAt(0, 0, 0); // Update lookAt during animation
      });

    // Create tween for controls target
    const targetTween = new TWEEN.Tween(startTarget)
      .to(state.initialControlsTarget, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        state.controls.target.copy(startTarget);
        state.controls.update();
      });

    // Start both tweens
    positionTween.start();
    targetTween.start();

    state.returnTween = positionTween; // Store reference to stop if needed
  };

  // Function to animate return (now just updates TWEEN)
  state.animateReturn = function() {
    // TWEEN update is handled in rendering.js
  };

  // Set renderer size AFTER camera is configured with container dimensions
  state.renderer.setSize(containerWidth, containerHeight);

  if (gridContainer) {
    gridContainer.innerHTML = ''; // Clear any existing content (e.g., old canvas)
    gridContainer.appendChild(state.renderer.domElement);
  } else {
    // This case should ideally be handled more robustly if gridContainer can be missing.
    console.warn('#grid-container not found for renderer. Appending to document.body as a fallback.');
    document.body.appendChild(state.renderer.domElement);
  }

  // Function to update renderer and camera sizes
  state.updateRendererSize = function() {
    const newWidth = gridContainer && gridContainer.clientWidth > 0 ? gridContainer.clientWidth : window.innerWidth;
    const newHeight = gridContainer && gridContainer.clientHeight > 0 ? gridContainer.clientHeight : window.innerHeight;

    state.renderer.setSize(newWidth, newHeight);
    state.camera.left = -newWidth / 2;
    state.camera.right = newWidth / 2;
    state.camera.top = newHeight / 2;
    state.camera.bottom = -newHeight / 2;
    state.camera.updateProjectionMatrix();

    // Update controls after camera changes
    if (state.controls) {
      state.controls.update();
    }

    // Обновление позиции и масштаба hologramPivot при resize
    if (state.hologramRendererInstance) {
      const hologramPivot = state.hologramRendererInstance.getHologramPivot();
      if (hologramPivot) {
        // Center hologram: account for scaled width (312), shifted left by 7%
        const dynamicOffset = (newWidth / 2) - 156 - 0.07 * newWidth;
        hologramPivot.position.x = dynamicOffset;
        hologramPivot.scale.set(1.236, 1.236, 1.236); // Increased scale by 3%
        console.log(`[sceneSetup] HologramPivot updated on resize: position x=${dynamicOffset}, scale x=1, y=1, z=1`);
      }
    }

    console.log(`[sceneSetup] Updated renderer size: Width = ${newWidth}, Height = ${newHeight}`);
  };

  // Add resize event listener
  window.addEventListener('resize', state.updateRendererSize);

  // Basic Lighting
  // Ambient light: provides overall illumination to the scene
  state.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
  state.scene.add(state.ambientLight);

  // Directional light: simulates light from a distant source (like the sun)
  state.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // color, intensity
  state.directionalLight.position.set(1, 1, 1).normalize(); // Positioned from top-right-front
  state.scene.add(state.directionalLight);

  // Removed Hologram Pivot creation from here. It is now created and managed by HologramRenderer.

  console.log('sceneSetup.js: Scene initialized successfully');
  return { scene: state.scene, renderer: state.renderer, camera: state.camera };
}
