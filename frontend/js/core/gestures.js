import * as THREE from 'three';
/**
 * Модуль для управления жестами с использованием Hammer.js
 * Отвечает за обработку жестов панорамирования и масштабирования для голограммы
 */

// import { state } from './init.js'; // Removed import

// Assuming THREE is global - No longer, THREE is imported
// const { Euler, MathUtils } = THREE; // Removed

let localStateRef; // Added module-level variable

// Константы для жестов
const ROTATION_LIMIT = Math.PI / 2; // 90 градусов
const ROTATION_RETURN_DURATION = 300; // мс
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

// Переменные для хранения состояния вращения
let prePanRotation = new THREE.Euler(); // Вращение перед началом текущего панорамирования
const initialHologramRotation = new THREE.Euler(0, 0, 0); // Исходное вращение голограммы

/**
 * Инициализирует обработчики жестов Hammer.js для управления голограммой
 */
export function initializeHammerGestures(passedState) { // Changed signature
  localStateRef = passedState; // Assign passedState
  console.log('Инициализация обработчиков жестов Hammer.js...');
  
  // Инициализация Hammer.js только если localStateRef.renderer.domElement существует
  let hammer;
  if (localStateRef.renderer && localStateRef.renderer.domElement) { // Use localStateRef
    hammer = new Hammer(localStateRef.renderer.domElement); // Use localStateRef
  } else {
    console.error('Не удалось инициализировать Hammer: localStateRef.renderer.domElement отсутствует');
    return; // Прерываем выполнение, если нет DOM-элемента рендерера
  }

  // Настраиваем распознавание жестов
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

  // Обработчик начала жеста панорамирования
  hammer.on('panstart', () => {
    if (!localStateRef.isXRMode && localStateRef.hologramRendererInstance && typeof localStateRef.hologramRendererInstance.getHologramPivot === 'function') { // Use localStateRef
      const hologramPivot = localStateRef.hologramRendererInstance.getHologramPivot(); // Use localStateRef
      if (hologramPivot) {
        prePanRotation.copy(hologramPivot.rotation);
      } else {
        console.error('Событие panstart: hologramPivot is null or undefined');
        prePanRotation.set(0,0,0); // Сброс на всякий случай
      }
    }
  });

  // Обработчик жеста панорамирования (вращение голограммы)
  hammer.on('panmove', ev => { // Изменено с 'pan' на 'panmove' для ясности, хотя 'pan' покрывает и panmove
    if (!localStateRef.isXRMode) { // Use localStateRef
      if (localStateRef.hologramRendererInstance && typeof localStateRef.hologramRendererInstance.getHologramPivot === 'function') { // Use localStateRef
        const hologramPivot = localStateRef.hologramRendererInstance.getHologramPivot(); // Use localStateRef
        if (hologramPivot) {
          // ev.deltaX и ev.deltaY представляют собой общее изменение с начала жеста pan
          // Масштабируем delta для более естественного вращения
          const deltaX = ev.deltaX / (window.innerWidth / 2); // Нормализуем и масштабируем
          const deltaY = ev.deltaY / (window.innerHeight / 2);

          // Применяем вращение относительно сохраненного перед началом панорамирования состояния
          let newRotationX = prePanRotation.x + (deltaY * Math.PI / 2); // Масштаб: движение на пол-экрана = 90 градусов
          let newRotationY = prePanRotation.y + (deltaX * Math.PI / 2);

          // Ограничиваем вращение до ±90 градусов (±ROTATION_LIMIT радиан)
          hologramPivot.rotation.x = THREE.MathUtils.clamp(
            newRotationX,
            -ROTATION_LIMIT,
            ROTATION_LIMIT
          );
          hologramPivot.rotation.y = THREE.MathUtils.clamp(
            newRotationY,
            -ROTATION_LIMIT,
            ROTATION_LIMIT
          );
          // hologramPivot.rotation.z остается неизменным (или prePanRotation.z, если нужно)
          // Для данного случая, сброс к initialHologramRotation.z в panend достаточен
        } else {
          console.error('Событие panmove: hologramPivot is null or undefined');
        }
      } else {
        console.error('Событие panmove: localStateRef.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
    // Для режима XR (вращение камеры) - предполагаем, что здесь не нужна кумулятивность таким же образом
    // или что она управляется иначе. Для задачи с голограммой, фокусируемся на non-XR.
    else {
      if (localStateRef.camera) { // Use localStateRef
        // Эта часть может потребовать аналогичной логики с prePanRotation для камеры, если нужно
        const deltaX = ev.deltaX / window.innerWidth;
        const deltaY = ev.deltaY / window.innerHeight;
        const rotationX = deltaY * Math.PI;
        const rotationY = deltaX * Math.PI;

        localStateRef.camera.rotation.x = THREE.MathUtils.clamp(rotationX, -ROTATION_LIMIT, ROTATION_LIMIT); // Use localStateRef
        localStateRef.camera.rotation.y = THREE.MathUtils.clamp(rotationY, -ROTATION_LIMIT, ROTATION_LIMIT); // Use localStateRef
      } else {
        console.error('Событие panmove (режим XR): localStateRef.camera отсутствует');
      }
    }
  });

  // Обработчик жеста масштабирования (pinch)
  hammer.on('pinch', ev => {
    if (!localStateRef.isXRMode) { // Use localStateRef
      if (localStateRef.hologramRendererInstance && typeof localStateRef.hologramRendererInstance.getHologramPivot === 'function') { // Use localStateRef
        const hologramPivot = localStateRef.hologramRendererInstance.getHologramPivot(); // Use localStateRef
        if (hologramPivot) {
          const scale = THREE.MathUtils.clamp(ev.scale, MIN_SCALE, MAX_SCALE);
          hologramPivot.scale.set(scale, scale, scale);
        } else {
          console.error('Событие pinch: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие pinch: localStateRef.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
  });

  // Обработчик окончания жестов (возврат к нейтральному положению)
  hammer.on('panend pinchend', () => {
    if (!localStateRef.isXRMode) { // Use localStateRef
      if (localStateRef.hologramRendererInstance && typeof localStateRef.hologramRendererInstance.getHologramPivot === 'function') { // Use localStateRef
        const hologramPivot = localStateRef.hologramRendererInstance.getHologramPivot(); // Use localStateRef
        if (hologramPivot) {
          // Плавно возвращаем к исходному вращению (initialHologramRotation)
          if (!TWEEN) {
            console.error('TWEEN library is not available. Animation will not work.');
            // Без TWEEN просто устанавливаем вращение напрямую
            hologramPivot.rotation.copy(initialHologramRotation);
            return;
          }
          new TWEEN.Tween(hologramPivot.rotation)
            .to({ x: initialHologramRotation.x, y: initialHologramRotation.y, z: initialHologramRotation.z }, 300)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        } else {
          console.error('Событие panend/pinchend: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие panend/pinchend: localStateRef.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
    // Для режима XR, если камера вращалась, ее также можно плавно вернуть в исходное положение
    // или оставить как есть, в зависимости от требований к XR-режиму.
    // Текущая задача фокусируется на голограмме.
  });

  console.log('Инициализация обработчиков жестов Hammer.js завершена');
  return hammer; // Возвращаем экземпляр Hammer для возможного использования в других модулях
}
