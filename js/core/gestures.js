/**
 * Модуль для управления жестами с использованием Hammer.js
 * Отвечает за обработку жестов панорамирования и масштабирования для голограммы.
 *
 * 2026-08-08: переведён с мёртвого `state.hologramRendererInstance` (Three.js)
 * на камеру нативного WebGPU-движка (`state.holoEngine.engine`).
 * Причина: в коммите 55d77e72 (v0.20.405, 10.04.2026) инстанцирование
 * HologramRenderer было удалено — рендеринг переехал в js/engine/.
 * Потребители жестов остались висеть на `null` и молча писали
 * `console.error('...getHologramPivot method is missing')` при каждом касании,
 * то есть вращение и пинч-зум голограммы не работали.
 */

let localStateRef; // Added module-level variable

// Константы для жестов
const ROTATION_LIMIT = Math.PI / 2; // 90 градусов
const ROTATION_RETURN_DURATION = 300; // мс
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

// Состояние орбиты на момент начала текущего жеста (для кумулятивности)
let prePanYaw = 0;
let prePanPitch = 0;

/**
 * Возвращает камеру нативного движка или null, если движок ещё не поднялся.
 * Единый источник истины — HoloEngine, Three.js-камера здесь больше не участвует.
 */
function getEngineCamera() {
  const engine = localStateRef?.holoEngine?.engine;
  return engine && typeof engine.orbit === 'function' ? engine : null;
}

/**
 * Инициализирует обработчики жестов Hammer.js для управления голограммой
 */
export function initializeHammerGestures(passedState) { // Changed signature
  localStateRef = passedState; // Assign passedState
  console.log('Инициализация обработчиков жестов Hammer.js...');

  // Жесты вешаем на контейнер голограммы: WebGPU-канвас имеет
  // pointer-events:none, а Three.js-канвас может отсутствовать вовсе.
  const target = document.getElementById('grid-container')
    || localStateRef.renderer?.domElement;

  if (!target) {
    console.error('Не удалось инициализировать Hammer: нет #grid-container и renderer.domElement');
    return;
  }

  const hammer = new Hammer(target);

  // Настраиваем распознавание жестов
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
  hammer.get('pinch').set({ enable: true });

  // Обработчик начала жеста панорамирования
  hammer.on('panstart', () => {
    if (localStateRef.isXRMode) return;

    const cam = getEngineCamera();
    if (!cam) {
      console.warn('[Gestures] panstart: HoloEngine ещё не инициализирован');
      return;
    }
    prePanYaw = cam.camera.yaw;
    prePanPitch = cam.camera.pitch;
  });

  // Обработчик жеста панорамирования (вращение голограммы)
  hammer.on('panmove', ev => {
    if (localStateRef.isXRMode) {
      // В XR ориентацию задаёт поза гарнитуры — жесты камеру не двигают.
      return;
    }

    const cam = getEngineCamera();
    if (!cam) return;

    // ev.deltaX/deltaY — общее смещение с начала жеста.
    // Движение на пол-экрана = поворот на 90°, как было в Three.js-контуре.
    const deltaX = ev.deltaX / (window.innerWidth / 2);
    const deltaY = ev.deltaY / (window.innerHeight / 2);

    const targetYaw = prePanYaw + deltaX * (Math.PI / 2);
    const targetPitch = prePanPitch + deltaY * (Math.PI / 2);

    // setOrbit сам ограничивает углы диапазоном ±ROTATION_LIMIT
    cam.setOrbit(targetYaw, targetPitch);
  });

  // Обработчик жеста масштабирования (pinch)
  hammer.on('pinch', ev => {
    if (localStateRef.isXRMode) return;

    const cam = getEngineCamera();
    if (!cam) return;

    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ev.scale));
    cam.setZoom(scale);
  });

  // Обработчик колеса мыши (wheel-зум, замена OrbitControls)
  target.addEventListener('wheel', ev => {
    if (localStateRef.isXRMode) return;

    const cam = getEngineCamera();
    if (!cam) return;

    ev.preventDefault();
    // deltaY > 0 (крутим вниз) — отдаляем, deltaY < 0 — приближаем.
    // Стандартный фактор 0.9/1.1 даёт плавный дискретный зум.
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    cam.zoomBy(factor);
  }, { passive: false });

  // Обработчик окончания жестов (плавный возврат к нейтральному положению)
  hammer.on('panend pinchend', () => {
    if (localStateRef.isXRMode) return;

    const cam = getEngineCamera();
    if (!cam) return;

    animateOrbitReset(cam, ROTATION_RETURN_DURATION);
  });

  console.log('Инициализация обработчиков жестов Hammer.js завершена (камера: HoloEngine WebGPU)');
}

/**
 * Плавный возврат орбиты в исходное положение.
 * Своя анимация вместо TWEEN: движок не зависит от Three.js-экосистемы.
 */
function animateOrbitReset(cam, duration) {
  const startYaw = cam.camera.yaw;
  const startPitch = cam.camera.pitch;
  const startZoom = cam.camera.zoom;
  const startTime = performance.now();

  // Cubic ease-out — та же кривая, что была у TWEEN.Easing.Cubic.Out
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const k = easeOutCubic(t);

    cam.setOrbit(startYaw * (1 - k), startPitch * (1 - k));
    cam.setZoom(startZoom + (1 - startZoom) * k);

    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
