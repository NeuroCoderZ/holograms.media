// frontend/js/utils/handsTracking.js

import { state } from '../core/init.js';
import { ui } from '../core/ui.js';
import { updateHologramLayout } from '../ui/layoutManager.js'; // Импортируем функцию обновления макета
import * as THREE from 'three'; // Импортируем Three.js
import { Hands } from '@mediapipe/hands'; // Импортируем Hands из MediaPipe

/**
 * Инициализирует MediaPipe Hands и добавляет группу мешей рук в сцену.
 */
export function initializeMediaPipeHands() {
  console.log('Инициализация MediaPipe Hands...');

  // Проверяем, загружена ли библиотека Hands
  if (typeof Hands === 'undefined') {
    console.error('Библиотека MediaPipe Hands не загружена. Проверьте подключение скриптов в HTML.');
    return; // Прерываем выполнение, если библиотека не найдена
  }

  // Получаем видео элемент
  const videoElementForHands = document.getElementById('camera-view');
  if (!videoElementForHands) {
    console.error("Видео элемент #camera-view не найден в DOM.");
    return; // Прерываем, если нет видео элемента
  }

  // Создаем экземпляр Hands и сохраняем его в state
  state.multimodal.handsInstance = new Hands({locateFile: (file) => {
    // Корректный путь к WASM файлам на CDN jsdelivr
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});

  // Настраиваем параметры Hands
  state.multimodal.handsInstance.setOptions({
    maxNumHands: 2,           // Отслеживать до двух рук
    modelComplexity: 1,       // 0 = lite, 1 = full (более точная, но требовательная)
    minDetectionConfidence: 0.7, // Увеличим порог для надежности
    minTrackingConfidence: 0.7  // Увеличим порог для надежности
  });

  // Устанавливаем обработчик результатов
  state.multimodal.handsInstance.onResults(onHandsResults);

  // Создаем группу мешей рук и добавляем ее в state и сцену Three.js
  state.multimodal.handMeshGroup = new THREE.Group();
  if (state.scene) {
    state.scene.add(state.multimodal.handMeshGroup);
  } else {
    console.error("Сцена Three.js не инициализирована в state.");
  }

  // Запускаем видео поток
  startVideoStream(videoElementForHands, state.multimodal.handsInstance);
}

/**
 * Запускает видео поток с камеры и отправляет кадры в MediaPipe Hands.
 * @param {HTMLVideoElement} videoElement - Видео элемент для отображения потока.
 * @param {Hands} handsInstance - Экземпляр MediaPipe Hands.
 */
async function startVideoStream(videoElement, handsInstance) {
  console.log(">>> Enumerating media devices...");
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  console.log(">>> Available video devices:", videoDevices);

  let iriunDeviceId = null;
  for (const device of videoDevices) {
    if (device.label.includes('iRiun') || device.label.includes('DroidCam')) {
      iriunDeviceId = device.deviceId;
      console.log(`>>> Found iRiun/DroidCam device: ${device.label} (${device.deviceId})`);
      break;
    }
  }

  try {
    const constraints = {
      video: {
        deviceId: iriunDeviceId ? { exact: iriunDeviceId } : undefined,
        width: { ideal: 1280 }, // Предпочтительная ширина
        height: { ideal: 720 } // Предпочтительная высота
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    state.multimodal.currentStream = stream; // Сохраняем поток в state

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        resolve();
      };
    });

    videoElement.play();

    // Запускаем цикл обработки кадров
    async function processVideoFrame() {
      if (!videoElement.paused && videoElement.readyState >= 2) { // Убедимся, что есть данные кадра
        try {
          await handsInstance.send({ image: videoElement });
        } catch (handsError) {
           console.error("Error sending frame to MediaPipe Hands:", handsError);
        }
      }
      requestAnimationFrame(processVideoFrame); // Запрашиваем следующий кадр
    }
    processVideoFrame(); // Запускаем цикл

    state.multimodal.isGestureCanvasReady = true; // Устанавливаем флаг готовности в state
    console.log('Флаг isGestureCanvasReady установлен в true (после getUserMedia)');

  } catch (err) {
    console.error(">>> Error acquiring camera feed via getUserMedia:", err.name, err.message);
    // Отобразим ошибку пользователю
    alert(`Failed to acquire camera feed: ${err.name}: ${err.message}`);
  }
}

/**
 * Обрабатывает результаты отслеживания рук.
 * @param {Object} results - Результаты от MediaPipe Hands.
 */
function onHandsResults(results) {
  // console.log('Hands results:', results); // Отладочный вывод

  // Очищаем предыдущие меши рук
  if (state.multimodal.handMeshGroup) {
    state.multimodal.handMeshGroup.clear();
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    // Руки видны, обновляем макет
    updateHologramLayout(true);
    state.multimodal.handsVisible = true; // Обновляем флаг видимости рук в state

    for (const landmarks of results.multiHandLandmarks) {
      // Создаем геометрию для линии, соединяющей точки
      const points = landmarks.map(landmark => new THREE.Vector3(landmark.x * 2 - 1, -(landmark.y * 2 - 1), landmark.z * 10)); // Масштабируем и инвертируем Y
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // Создаем материал для линии
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Зеленый цвет

      // Создаем объект линии и добавляем его в группу
      const line = new THREE.Line(geometry, material);
      if (state.multimodal.handMeshGroup) {
        state.multimodal.handMeshGroup.add(line);
      }

      // Опционально: добавить сферы или другие объекты на каждую точку
      // for (const landmark of landmarks) {
      //   const sphereGeometry = new THREE.SphereGeometry(0.02, 8, 8);
      //   const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      //   const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      //   sphere.position.set(landmark.x * 2 - 1, -(landmark.y * 2 - 1), landmark.z * 10);
      //   if (state.multimodal.handMeshGroup) {
      //     state.multimodal.handMeshGroup.add(sphere);
      //   }
      // }
    }
  } else {
    // Руки не видны, обновляем макет
    updateHologramLayout(false);
    state.multimodal.handsVisible = false; // Обновляем флаг видимости рук в state
  }

  // TODO: Добавить логику обработки жестов или других действий на основе landmarks
}

// Экспортируем handMeshGroup, если она нужна где-то еще (например, для удаления из сцены при необходимости)
// export { handMeshGroup }; // Больше не экспортируем локальную переменную

// TODO: Добавить другие вспомогательные функции, связанные с руками, если необходимо.