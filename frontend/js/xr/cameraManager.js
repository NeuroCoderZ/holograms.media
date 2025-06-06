// frontend/js/xr/cameraManager.js
import { state } from '../core/init.js';

let isXRMode = false; // Объявление на уровне модуля
let currentStream = null; // Объявление на уровне модуля
let videoElement = null; // Объявление на уровне модуля
let handsInstance = null; // Объявление для MediaPipe Hands
let _cameraWasActiveBeforeHidden = false; // For page visibility

/**
 * Handles page visibility changes for the camera stream.
 */
function handleCameraVisibilityChange() {
  if (!videoElement) { // Ensure videoElement is available
    videoElement = document.getElementById('camera-view');
    if (!videoElement) return; // Still not found, can't do anything
  }

  if (document.visibilityState === 'hidden') {
    if (currentStream && isXRMode) { // Only act if XR mode is active and stream exists
      console.log('Page hidden, stopping camera stream for XR mode.');
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
      videoElement.style.visibility = 'hidden'; // Hide the video element
      if (videoElement.srcObject) { // Release srcObject
          videoElement.srcObject = null;
      }
      // Note: MediaPipe Hands might need explicit pausing/resetting if it caches the stream or video element.
      // For now, stopping the stream and hiding video is the primary action.
      _cameraWasActiveBeforeHidden = true;
    }
  } else if (document.visibilityState === 'visible') {
    if (_cameraWasActiveBeforeHidden && isXRMode) {
      console.log('Page visible, camera was active in XR mode. Attempting to restart camera.');
      // Attempt to restart the camera if it was active before hidden.
      // setupCamera will handle visibility of videoElement based on isXRMode.
      setupCamera().catch(err => console.error("Error restarting camera on visibility change:", err));
      _cameraWasActiveBeforeHidden = false;
    } else if (isXRMode && !currentStream) {
      // If page became visible, XR mode is on, but no stream (e.g. initial load into hidden tab)
      // and it wasn't active before hidden (e.g. user didn't start it yet)
      // We might want to call setupCamera here too, or rely on user to toggle.
      // For now, the above condition handles explicit "was active".
      console.log('Page visible, XR mode is on, but no active stream and was not active before hidden.');
    }
  }
}

/**
 * Настройка камеры для XR режима
 */
export async function setupCamera() {
  // Остановка текущего потока, если он существует
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  // Получаем элемент видео, если он еще не получен
  if (!videoElement) {
    videoElement = document.getElementById('camera-view');
    if (!videoElement) {
      console.error('Элемент видео не найден. XR режим не может быть активирован.');
      return;
    }
  }

  // Если XR режим выключен, скрываем видео и выходим
  if (!isXRMode) {
    videoElement.style.visibility = 'hidden';
    return;
  }

  // Показываем видео элемент
  videoElement.style.visibility = 'visible';

  try {
    // Получаем доступ к камере
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

                      if (videoElement.readyState >= 3) { // Проверяем, что видео полностью загружено и готово
                          // Проверяем, что видео имеет ненулевые размеры
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
                          
                          try { // Оборачиваем в try-catch для отлова ошибок createTexture
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

  
  // Обновление рендерера, если это не делается в основном цикле анимации при смене камеры
  // if (state.renderer && state.scene && state.camera && typeof state.renderer.render === 'function') {
  //   state.renderer.render(state.scene, state.camera);
  // }


// Функция для переключения XR режима
export function toggleXRMode() {
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

  document.addEventListener('visibilitychange', handleCameraVisibilityChange);
  console.log('XR Manager initialized. XR Mode is OFF. Visibility listener added.');
}

// TODO: Экспортировать функции или переменные, если они нужны другим модулям.
// export { isXRMode, currentStream, videoElement, setupCamera, toggleXRMode };