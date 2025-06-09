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

// Переменные для хранения состояния вращения
let prePanRotation = new THREE.Euler(); // Вращение перед началом текущего панорамирования
const initialHologramRotation = new THREE.Euler(0, 0, 0); // Исходное вращение голограммы

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

  // Обработчик начала жеста панорамирования
  hammer.on('panstart', () => {
    if (!state.isXRMode && state.hologramRendererInstance && typeof state.hologramRendererInstance.getHologramPivot === 'function') {
      const hologramPivot = state.hologramRendererInstance.getHologramPivot();
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
    if (!state.isXRMode) {
      if (state.hologramRendererInstance && typeof state.hologramRendererInstance.getHologramPivot === 'function') {
        const hologramPivot = state.hologramRendererInstance.getHologramPivot();
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
        console.error('Событие panmove: state.hologramRendererInstance or getHologramPivot method is missing');
      }
    } else {
      // Логика для режима XR (вращение камеры) - предполагаем, что здесь не нужна кумулятивность таким же образом
      // или что она управляется иначе. Для задачи с голограммой, фокусируемся на non-XR.
      if (state.camera) {
        // Эта часть может потребовать аналогичной логики с prePanRotation для камеры, если нужно
        const deltaX = ev.deltaX / window.innerWidth;
        const deltaY = ev.deltaY / window.innerHeight;
        const rotationX = deltaY * Math.PI;
        const rotationY = deltaX * Math.PI;

        state.camera.rotation.x = THREE.MathUtils.clamp(rotationX, -ROTATION_LIMIT, ROTATION_LIMIT);
        state.camera.rotation.y = THREE.MathUtils.clamp(rotationY, -ROTATION_LIMIT, ROTATION_LIMIT);
      } else {
        console.error('Событие panmove (режим XR): state.camera отсутствует');
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
          // Плавно возвращаем к исходному вращению (initialHologramRotation)
          if (!window.TWEEN) {
            console.error('TWEEN library is not available on window.TWEEN. Animation will not work.');
            // Без TWEEN просто устанавливаем вращение напрямую
            hologramPivot.rotation.copy(initialHologramRotation);
            return;
          }
          new window.TWEEN.Tween(hologramPivot.rotation)
            .to({ x: initialHologramRotation.x, y: initialHologramRotation.y, z: initialHologramRotation.z }, ROTATION_RETURN_DURATION)
            .easing(window.TWEEN.Easing.Cubic.Out)
            .start();
        } else {
          console.error('Событие panend/pinchend: hologramPivot is null or undefined after calling getHologramPivot()');
        }
      } else {
        console.error('Событие panend/pinchend: state.hologramRendererInstance or getHologramPivot method is missing');
      }
    }
    // Для режима XR, если камера вращалась, ее также можно плавно вернуть в исходное положение
    // или оставить как есть, в зависимости от требований к XR-режиму.
    // Текущая задача фокусируется на голограмме.
  });

  console.log('Инициализация обработчиков жестов Hammer.js завершена');
  return hammer; // Возвращаем экземпляр Hammer для возможного использования в других модулях
}