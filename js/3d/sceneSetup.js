import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import { renderingCapabilities } from '../utils/renderingCapabilities.js';
import { updateHologramLayout } from '../ui/layoutManager.js';

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

  // --- Детект возможностей рендеринга и выбор рендерера ---
  try {
    console.log('[Renderer Detection] Определение поддерживаемых технологий рендеринга...');
    const capabilities = await renderingCapabilities.detect();
    console.log('[Renderer Detection] Обнаружены возможности:', capabilities);

    // Выбор предпочтительного рендерера
    const preferredRenderer = capabilities.preferred;
    console.log(`[Renderer Detection] Выбран рендерер: ${preferredRenderer}`);

    state.renderingCapabilities = capabilities;
    state.currentRenderer = preferredRenderer;

    // --- Инициализация рендерера в зависимости от возможностей устройства ---
    // STABILITY FIX: WebGPU's WebGL2 backend causes hologram invisibility.
    // Force WebGL until browser has native WebGPU support.
    await initializeWebGLRenderer(state);

  } catch (error) {
    console.error('[Renderer Detection] Ошибка при определении возможностей рендеринга:', error);
    console.log('[Renderer Detection] Использование WebGL как fallback...');
    await initializeWebGLRenderer(state);
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
  state.returnTimeout = null; // Таймер задержки возврата

  // Управление флагом перетаскивания и Focus Mode
  state.controls.addEventListener('start', () => {
    state.isDragging = true;
    document.body.classList.add('focus-mode'); // Focus Mode ON
    if (state.returnTween) cancelAnimationFrame(state.returnTween);
    if (state.returnTimeout) clearTimeout(state.returnTimeout);
  });

  state.controls.addEventListener('end', () => {
    state.isDragging = false;
    document.body.classList.remove('focus-mode'); // Focus Mode OFF

    // Не запускаем возврат, если активен XR или WASD (можно добавить проверку флага wasdActive)
    if (state.isXRMode || (state.hologramRendererInstance && state.hologramRendererInstance._isTorusMode)) {
      return;
    }

    // Мгновенный возврат после отпускания
    state.startReturnAnimation();
  });

  // Магнитный возврат камеры (без внешней библиотеки)
  state.startReturnAnimation = function () {
    // Если пользователь снова начал вращать - отмена
    if (state.isDragging) return;

    const startPosition = state.camera.position.clone();
    const startTarget = state.controls.target.clone();
    const targetPosition = state.initialCameraPosition;
    const targetTarget = state.initialControlsTarget;

    // Мгновенный возврат камеры (быстрая анимация 300мс)
    const duration = 300;
    const startTime = performance.now();

    function animateReturn() {
      // Если перехватили управление - стоп
      if (state.isDragging) return;

      const elapsed = performance.now() - startTime;
      let t = Math.min(elapsed / duration, 1);

      // Магнитный эффект (Cubic Out)
      const eased = 1 - Math.pow(1 - t, 3);

      state.camera.position.lerpVectors(startPosition, targetPosition, eased);
      state.controls.target.lerpVectors(startTarget, targetTarget, eased);

      state.camera.lookAt(state.controls.target);
      state.controls.update();

      if (t < 1) {
        state.returnTween = requestAnimationFrame(animateReturn);
      }
    }

    state.returnTween = requestAnimationFrame(animateReturn);
  };

  // --- WASD & XR Camera Logic (Stage 7) ---
  state.wasdKeys = { w: false, a: false, s: false, d: false };
  state.isXRMode = false;

  const onKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (key in state.wasdKeys) state.wasdKeys[key] = true;
  };
  const onKeyUp = (e) => {
    const key = e.key.toLowerCase();
    if (key in state.wasdKeys) state.wasdKeys[key] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Mouse rotation for XR mode
  state.mouseRotation = { isDragging: false, previousMousePosition: { x: 0, y: 0 } };

  state.renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!state.isXRMode) return;
    state.mouseRotation.isDragging = true;
    state.mouseRotation.previousMousePosition = { x: e.offsetX, y: e.offsetY };
  });

  state.renderer.domElement.addEventListener('pointermove', (e) => {
    if (!state.isXRMode || !state.mouseRotation.isDragging) return;

    const deltaMove = {
      x: e.offsetX - state.mouseRotation.previousMousePosition.x,
      y: e.offsetY - state.mouseRotation.previousMousePosition.y
    };

    const rotationSpeedX = 0.005;
    const rotationSpeedY = 0.005;

    // Notice we invert Y movement to mimic typical FPS / Orbit mouse look
    state.camera.rotation.y -= deltaMove.x * rotationSpeedY;
    state.camera.rotation.x -= deltaMove.y * rotationSpeedX;

    // Clamp vertical rotation (-30 to +30 degrees approx)
    state.camera.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, state.camera.rotation.x));

    // Clamp horizontal rotation (-180 to +180 degrees approx)
    state.camera.rotation.y = Math.max(-Math.PI, Math.min(Math.PI, state.camera.rotation.y));

    // Disable Z rotation
    state.camera.rotation.z = 0;

    state.mouseRotation.previousMousePosition = { x: e.offsetX, y: e.offsetY };
  });

  window.addEventListener('pointerup', () => {
    state.mouseRotation.isDragging = false;
  });

  // Update loop for WASD (called from main animation loop)
  state.updateCameraRotation = function (deltaTime) {
    if (!state.isXRMode) return;

    const rotationSpeed = 1.5 * deltaTime; // Speed factor
    const moveVector = new THREE.Vector3();

    if (state.wasdKeys.w) state.camera.rotation.x += rotationSpeed;
    if (state.wasdKeys.s) state.camera.rotation.x -= rotationSpeed;
    if (state.wasdKeys.a) state.camera.rotation.y += rotationSpeed;
    if (state.wasdKeys.d) state.camera.rotation.y -= rotationSpeed;

    // Clamp vertical rotation (-30 to 30 degrees)
    state.camera.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, state.camera.rotation.x));

    // Clamp horizontal rotation (-180 to 180 degrees)
    state.camera.rotation.y = Math.max(-Math.PI, Math.min(Math.PI, state.camera.rotation.y));

    // Disable Z rotation
    state.camera.rotation.z = 0;
  };

  // Toggle XR Mode helper
  state.setXRMode = function (active) {
    state.isXRMode = active;
    if (active) {
      console.log("[XR Mode] Enabling Look-Around (Camera at 0,0,0)");
      state.camera.position.set(0, 0, 0); // User is inside the cylinder
      state.controls.enabled = false; // Disable standard OrbitControls
      state.camera.rotation.set(0, 0, 0);
    } else {
      console.log("[XR Mode] Restoring standard view");
      state.camera.position.copy(state.initialCameraPosition);
      state.controls.enabled = true;
      state.controls.target.copy(state.initialControlsTarget);
      state.controls.update();
    }
  };

  state.animateReturn = function () {
    // Больше не используется, так как у нас requestAnimationFrame внутри startReturnAnimation.
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
  state.updateRendererSize = function () {
    if (typeof updateHologramLayout === 'function') {
      updateHologramLayout(state);
    } else {
      // Minimal fallback if layoutManager is not available
      const newWidth = gridContainer && gridContainer.clientWidth > 0 ? gridContainer.clientWidth : window.innerWidth;
      const newHeight = gridContainer && gridContainer.clientHeight > 0 ? gridContainer.clientHeight : window.innerHeight;
      state.renderer.setSize(newWidth, newHeight);
      state.camera.left = -newWidth / 2;
      state.camera.right = newWidth / 2;
      state.camera.top = newHeight / 2;
      state.camera.bottom = -newHeight / 2;
      state.camera.updateProjectionMatrix();
    }
  };

  // Add resize event listener
  window.addEventListener('resize', state.updateRendererSize);

  // Basic Lighting
  // Ambient light: provides overall illumination to the scene
  // DELETED: Duplicate lights (handled by HologramRenderer for Z-Dimming control)

  // Set the "deep dark blue" background the user liked
  state.scene.background = new THREE.Color(0x050510); // Very deep midnight blue

  console.log('sceneSetup.js: Scene initialized successfully');
  return { scene: state.scene, renderer: state.renderer, camera: state.camera };
}

/**
 * Инициализация WebGL рендерера
 * @param {object} state - Глобальное состояние приложения
 */
async function initializeWebGLRenderer(state) {
  console.log('[WebGL Init] Инициализация WebGL рендерера...');

  try {
    state.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = state.renderer.domElement;

    // Обработчики потери контекста WebGL
    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      console.warn('!!! WebGL CONTEXT LOST! Остановка цикла анимации.');
    }, false);

    canvas.addEventListener('webglcontextrestored', function () {
      console.log('✅ WebGL CONTEXT RESTORED! Переинициализация сцены...');
      alert('WebGL контекст восстановлен. Перезагружаем страницу.');
      window.location.reload();
    }, false);

    console.log('[WebGL Init] WebGLRenderer успешно инициализирован.');

  } catch (error) {
    console.error('[WebGL Init] Ошибка инициализации WebGL:', error);
    throw error;
  }
}

/**
 * Инициализация WebGPU рендерера (экспериментальная поддержка)
 * @param {object} state - Глобальное состояние приложения
 */
async function initializeWebGPURenderer(state) {
  console.log('[WebGPU Init] Инициализация WebGPU рендерера...');

  try {
    // Проверка поддержки WebGPU
    if (!navigator.gpu) {
      throw new Error('WebGPU не поддерживается в этом браузере');
    }

    state.renderer = new WebGPURenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    state.renderer.setPixelRatio(window.devicePixelRatio);
    // WebGPURenderer might need explicit init or await in some Three.js versions
    // but in r165 it's usually automatic on first render or via .init()
    if (state.renderer.init) await state.renderer.init();

    console.log('[WebGPU Init] WebGPURenderer успешно инициализирован.');
    state.currentRenderer = 'webgpu';

  } catch (error) {
    console.error('[WebGPU Init] Ошибка инициализации WebGPU:', error);
    console.log('[WebGPU Init] Переключение на WebGL...');
    await initializeWebGLRenderer(state);
    state.currentRenderer = 'webgl';
  }
}

/**
 * Инициализация Canvas2D рендерера (fallback)
 * @param {object} state - Глобальное состояние приложения
 */
async function initializeCanvas2DRenderer(state) {
  console.log('[Canvas2D Init] Инициализация Canvas2D fallback рендерера...');

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Создание mock-рендерера с минимальным API для совместимости
    state.renderer = {
      domElement: canvas,
      setSize: function (width, height) {
        canvas.width = width;
        canvas.height = height;
        this.renderFallback(width, height);
      },
      setPixelRatio: function () { },
      renderFallback: function (width, height) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3D-графика недоступна в этой среде', width / 2, height / 2 - 50);
        ctx.fillText('Попробуйте другой браузер или устройство', width / 2, height / 2);
        ctx.fillText('Остальные функции приложения доступны', width / 2, height / 2 + 50);

        // Показ информации о рендерере
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText('Canvas2D Fallback Active', width / 2, height / 2 + 100);
      },
      render: function () { } // Пустая функция для совместимости
    };

    state.renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('[Canvas2D Init] Canvas2D fallback рендерер успешно создан.');

  } catch (error) {
    console.error('[Canvas2D Init] Ошибка создания Canvas2D рендерера:', error);

    // Показ критической ошибки
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; color: white; display: flex; justify-content: center; align-items: center; text-align: center; padding: 20px; font-size: 1.2em; z-index: 9999;';
    errorDiv.textContent = 'Критическая ошибка: 3D-графика недоступна. Приложение продолжит работу без визуализации.';
    document.body.appendChild(errorDiv);

    throw error;
  }
}
