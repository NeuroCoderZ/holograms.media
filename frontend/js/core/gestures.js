/**
 * Модуль для управления жестами с использованием Hammer.js
 * Отвечает за обработку жестов панорамирования и масштабирования для голограммы
 */

import { state } from './init.js';
import * as THREE from 'three';

// Константы для жестов
const ROTATION_LIMIT = Math.PI / 2; // 90 градусов
const ROTATION_RETURN_DURATION = 300; // мс
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

/**
 * Инициализирует обработчики жестов Hammer.js для управления голограммой
 */
export function initializeHammerGestures() {
  console.log('Инициализация обработчиков жестов Hammer.js...');
  
  // Инициализация Hammer.js только если state.renderer.domElement существует
  let hammer;
  if (state.renderer && state.renderer.domElement) {
    hammer = new Hammer(state.renderer.domElement);
  } else {
    console.error('Не удалось инициализировать Hammer: state.renderer.domElement отсутствует');
    return; // Прерываем выполнение, если нет DOM-элемента рендерера
  }

  // Настраиваем распознавание жестов
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

  // Обработчик жеста панорамирования (вращение голограммы)
  hammer.on('pan', ev => {
    const deltaX = ev.deltaX / window.innerWidth;
    const deltaY = ev.deltaY / window.innerHeight;

    // Преобразуем движение на экране в радианы (соотношение 1:1)
    const rotationX = deltaY * Math.PI;
    const rotationY = deltaX * Math.PI;

    // Проверяем режим отображения и наличие hologramPivot
    if (!state.isXRMode) {
      if (state.hologramRendererInstance && typeof state.hologramRendererInstance.getHologramPivot === 'function') {
        const hologramPivot = state.hologramRendererInstance.getHologramPivot();
        if (hologramPivot) {
          // Ограничиваем вращение до ±90 градусов (±π/2 радиан)
          hologramPivot.rotation.x = THREE.MathUtils.clamp(
            rotationX,
            -ROTATION_LIMIT,
            ROTATION_LIMIT
          );
          hologramPivot.rotation.y = THREE.MathUtils.clamp(
            rotationY,
            -ROTATION_LIMIT,
            ROTATION_LIMIT
          );
          hologramPivot.rotation.z = 0; // Предотвращаем вращение по оси Z
        } else {
          console.error('Событие pan: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие pan: state.hologramRendererInstance or getHologramPivot method is missing');
      }
    } else {
      // В режиме XR вращаем камеру вместо голограммы
      if (state.camera) {
        state.camera.rotation.x = THREE.MathUtils.clamp(
          rotationX,
          -ROTATION_LIMIT,
          ROTATION_LIMIT
        );
        state.camera.rotation.y = THREE.MathUtils.clamp(
          rotationY,
          -ROTATION_LIMIT,
          ROTATION_LIMIT
        );
      } else {
        console.error('Событие pan (режим XR): state.camera отсутствует');
      }
    }
  });

  // Обработчик жеста масштабирования (pinch)
  hammer.on('pinch', ev => {
    if (!state.isXRMode) {
      if (state.hologramRendererInstance && typeof state.hologramRendererInstance.getHologramPivot === 'function') {
        const hologramPivot = state.hologramRendererInstance.getHologramPivot();
        if (hologramPivot) {
          const scale = THREE.MathUtils.clamp(ev.scale, MIN_SCALE, MAX_SCALE);
          hologramPivot.scale.set(scale, scale, scale);
        } else {
          console.error('Событие pinch: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие pinch: state.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
  });

  // Обработчик окончания жестов (возврат к нейтральному положению)
  hammer.on('panend pinchend', () => {
    if (!state.isXRMode) {
      if (state.hologramRendererInstance && typeof state.hologramRendererInstance.getHologramPivot === 'function') {
        const hologramPivot = state.hologramRendererInstance.getHologramPivot();
        if (hologramPivot) {
          // Плавно возвращаем к нейтральному вращению (0,0,0)
          if (!window.TWEEN) {
            console.error('TWEEN library is not available on window.TWEEN. Animation will not work.');
            return;
          }
          new window.TWEEN.Tween(hologramPivot.rotation)
            .to({ x: 0, y: 0, z: 0 }, ROTATION_RETURN_DURATION)
            .easing(window.TWEEN.Easing.Cubic.Out)
            .start();
        } else {
          console.error('Событие panend/pinchend: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие panend/pinchend: state.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
  });

  console.log('Инициализация обработчиков жестов Hammer.js завершена');
  return hammer; // Возвращаем экземпляр Hammer для возможного использования в других модулях
}