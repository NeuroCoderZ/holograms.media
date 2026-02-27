import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import { renderingCapabilities } from '../utils/renderingCapabilities.js';

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

  // Управление флагом перетаскивания
  state.controls.addEventListener('start', () => {
    state.isDragging = true;
    if (state.returnTween) cancelAnimationFrame(state.returnTween);
    if (state.returnTimeout) clearTimeout(state.returnTimeout);
  });

  state.controls.addEventListener('end', () => {
    state.isDragging = false;

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
      const hologramRenderer = state.hologramRendererInstance;
      // Ensure we are calling the correct method if it exists, simplified for this context
      // Assuming getHologramPivot is available on the instance
      const hologramPivot = hologramRenderer.getHologramPivot ? hologramRenderer.getHologramPivot() : null;

      if (hologramPivot) {
        // Dynamic Scaling: Occupy 90% of screen width or height (GRID_WIDTH=128+128=256)
        const scaleW = (newWidth * 0.9) / 256;
        const scaleH = (newHeight * 0.9) / 256;
        const targetScale = Math.min(scaleW, scaleH);

        // --- NEW: Sync Centering for Desktop (v0.19.028) ---
        let xOffset = 0;
        if (newWidth > 768) {
          const leftPanel = document.getElementById('left-panel');
          const rightPanel = document.getElementById('right-panel');

          const leftW = leftPanel ? (leftPanel.classList.contains('visible') ? leftPanel.offsetWidth : 20) : 0;
          const rightW = rightPanel ? (rightPanel.classList.contains('visible') ? rightPanel.offsetWidth : 20) : 0;

          // Offset to align hologram center with visible area center
          xOffset = (leftW - rightW) / 2;

          // Sync Gesture Area (Desktop)
          const gestureArea = document.getElementById('gesture-area');
          if (gestureArea) {
            gestureArea.style.setProperty('--gesture-offset', `${xOffset}px`);
            gestureArea.style.setProperty('--gesture-width', `${256 * targetScale}px`);
          }
        } else {
          // Reset Gesture Area for Mobile
          const gestureArea = document.getElementById('gesture-area');
          if (gestureArea) {
            gestureArea.style.removeProperty('--gesture-offset');
            gestureArea.style.removeProperty('--gesture-width');
          }
        }

        hologramPivot.position.x = xOffset / targetScale;
        hologramPivot.position.y = 0;
        hologramPivot.scale.set(targetScale, targetScale, targetScale);

        console.log(`[sceneSetup] v19.28: scale=${targetScale.toFixed(4)}, xOffset=${xOffset.toFixed(1)}`);
      }
    }

    console.log(`[sceneSetup] Updated renderer size: Width = ${newWidth}, Height = ${newHeight}`);
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
