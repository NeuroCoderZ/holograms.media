// frontend/js/xr/cameraManager.js
import * as THREE from 'three';
import { state } from '../core/init.js';

let isXRMode = false; // Объявление на уровне модуля
let currentStream = null; // Объявление на уровне модуля
let videoElement = null; // Объявление на уровне модуля


          const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                  width: { ideal: 320 }, // Уменьшаем размер для снижения нагрузки
                  height: { ideal: 240 },
                  facingMode: 'user' // Используем фронтальную камеру для надежности
              }
          });
          console.log(">>> Video stream acquired successfully (user camera).");
          videoElement.srcObject = stream;
          currentStream = stream; // Сохраняем поток для возможности остановки позже

          // Используем onloadedmetadata и onloadeddata для большей надежности
          videoElement.onloadedmetadata = () => {
              console.log(">>> Video metadata loaded. Waiting for full data load...");
              videoElement.play();
          };

          videoElement.onloadeddata = () => {
              console.log(">>> Video data loaded. Waiting before starting hands processing...");

              // Увеличиваем задержку перед началом обработки для полной инициализации WebGL
              setTimeout(() => {
                  console.log(">>> Starting hands processing after delay");

                  // Проверяем готовность handsInstance перед использованием
                  if (!handsInstance || typeof handsInstance.send !== 'function') {
                      console.error("MediaPipe Hands instance not properly initialized");
                      return;
                  }

                  // Создаем функцию обработки кадров с дополнительными проверками
                  let processingActive = true;
                  let errorCount = 0;
                  const MAX_ERRORS = 5;

                  // Определяем функцию обработки кадров
                  const processVideoFrame = async () => {
                      if (!processingActive) return; // Проверка активности обработки

                      // Проверяем, что видео полностью загружено и готово
                      if (videoElement.readyState >= 3) {
                          try
                          { // Проверяем, что видео имеет ненулевые размеры
                              if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                  console.warn("Video dimensions are zero, skipping frame");
                                  requestAnimationFrame(processVideoFrame);
                                  return;
                              }

                              // Дополнительная проверка готовности handsInstance перед каждым кадром
                              if (!handsInstance || typeof handsInstance.send !== 'function') {
                                  console.warn("MediaPipe Hands instance not available for this frame, skipping");
                                  requestAnimationFrame(processVideoFrame);
                                  return;
                              }

                              // Оборачиваем в try-catch для отлова ошибок createTexture
                              await handsInstance.send({ image: videoElement });
                              errorCount = 0; // Сброс счетчика ошибок при успешной обработке
                          } catch (e) {
                              console.error("Error processing video frame with MediaPipe Hands:", e);
                              errorCount++;
                              if (errorCount >= MAX_ERRORS) {
                                  console.error(`Too many errors (${MAX_ERRORS}) processing video frames. Stopping processing.`);
                                  processingActive = false; // Останавливаем обработку при множественных ошибках
                                  // TODO: Возможно, уведомить пользователя или попытаться перезапустить
                              }
                          }
                      }
                      // Запрашиваем следующий кадр независимо от успеха обработки текущего
                      requestAnimationFrame(processVideoFrame);
                  };

                  // Запускаем цикл обработки кадров
                  requestAnimationFrame(processVideoFrame);

              }, 1000); // Задержка 1 секунда
          };

          videoElement.onerror = (e) => {
              console.error('Video element error:', e);
              // TODO: Обработка ошибок видеоэлемента
          };

      } catch (err) {
          console.error('Error accessing camera or starting video stream:', err);
          // TODO: Обработка ошибок getUserMedia
      }
  }




  isXRMode = !isXRMode;
  console.log('XR режим переключен:', isXRMode);

  const xrButton = document.getElementById('xrButton');
  if (xrButton) {
    xrButton.classList.toggle('active', isXRMode);
  }

  if (isXRMode) {
    if (state.xrCamera && state.scene) {
      state.camera = state.xrCamera; // Устанавливаем активную камеру в xrCamera
      if (state.orthoCamera) { // Копируем свойства, если orthoCamera существует
        state.xrCamera.position.copy(state.orthoCamera.position);
        state.xrCamera.rotation.copy(state.orthoCamera.rotation);
        // Масштаб для перспективной камеры обычно не копируется так, как для ортографической
        // state.xrCamera.scale.copy(state.orthoCamera.scale); 
        state.xrCamera.near = 0.1;
        state.xrCamera.far = 10000;
        state.xrCamera.aspect = window.innerWidth / window.innerHeight;
        state.xrCamera.updateProjectionMatrix();
      }
      console.log('Активная камера переключена на XRCamera.');
    } else {
      console.warn('XR камера или сцена не инициализированы в state. XR режим не может быть активирован.');
      isXRMode = false; // Откатываем состояние
      if (xrButton) xrButton.classList.remove('active');
      return;
    }
    setupCamera(); // Настраиваем видеопоток для XR
  } else {
    if (state.orthoCamera && state.scene) {
      state.camera = state.orthoCamera; // Возвращаем ортографическую камеру
    } else {
        console.warn('Ortho камера или сцена не инициализированы в state. Не могу переключиться обратно.');
    }
    setupCamera(); // Вызов остановит видеопоток, так как isXRMode = false
    if (videoElement) {
      videoElement.style.visibility = 'hidden'; // Скрываем видео элемент
    }
  }

  // Обновление рендерера, если это не делается в основном цикле анимации при смене камеры
  // if (state.renderer && state.scene && state.camera && typeof state.renderer.render === 'function') {
  //   state.renderer.render(state.scene, state.camera);
  // }
}

/**
 * Инициализация управления XR-режимом.
 */
export function initializeXRMode() {
  const xrButton = document.getElementById('xrButton');
  if (xrButton) {
    xrButton.addEventListener('click', toggleXRMode);
  } else {
    console.warn('Кнопка XR (xrButton) не найдена. Управление XR-режимом будет недоступно.');
  }

  // Инициализация videoElement, если он еще не получен (на случай если setupCamera вызовется до DOMContentLoaded)
  if (!videoElement) {
    videoElement = document.getElementById('camera-view');
    if (videoElement) {
        videoElement.style.visibility = 'hidden'; // Изначально скрыт
    }
  }

  // Начальное состояние: XR выключен, активна ортографическая камера (если есть)
  isXRMode = false;
  if (state.orthoCamera) {
    state.camera = state.orthoCamera;
  }

  console.log('XR Manager initialized. XR Mode is OFF.');
}

// TODO: Экспортировать функции или переменные, если они нужны другим модулям.
// export { isXRMode, currentStream, videoElement, setupCamera, toggleXRMode };