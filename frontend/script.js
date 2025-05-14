import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyPromptWithTriaMode } from './tria_mode.js';
// Импорт менеджеров UI и ввода
import { initializeRightPanel } from '/static/js/panels/rightPanelManager.js'; 
import { initializeChatDisplay, addMessage, clearChat, speak } from '/static/js/panels/chatMessages.js'; 
import { initializeSpeechInput } from '/static/js/audio/speechInput.js';

// Экспортируем функцию loadChatHistory для использования в других модулях
export function loadChatHistory() {
  // console.log('Загрузка истории чата...');
  fetch('/api/chat_history')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // console.log('История чата получена:', data);
      // Очищаем текущую историю
      clearChat();
      
      // Добавляем сообщения из истории
      if (data && Array.isArray(data)) {
        data.forEach(msg => {
          addMessage(msg.role, msg.content);
        });
      }
    })
    .catch(error => {
      console.error('Ошибка при загрузке истории чата:', error);
      addMessage('error', 'Не удалось загрузить историю чата. Пожалуйста, попробуйте позже.');
    });
}

// Делаем функцию доступной глобально для обратной совместимости
window.loadChatHistory = loadChatHistory; 

// --- Global Variables ---
let telegramLinkButton;
let micButton;
// Переменная isTriaModeActive теперь импортируется из модуля tria_mode.js
let hologramPivot = new THREE.Group();

// Экспортируем hologramPivot для использования в других модулях
export { hologramPivot };

// Делаем hologramPivot доступным глобально для обратной совместимости
window.hologramPivot = hologramPivot;
let isGestureCanvasReady = false; // Flag to track if gesture canvas is ready
// WebSocket configuration
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.host;
const WS_PATH = '/chat';
const WS_URL = `${WS_PROTOCOL}//${WS_HOST}${WS_PATH}`;
let xrIconDisplay = true;
let xrState = 0;
let currentStream = null;
let audioGainNode;
let volumeControlActive = false;
let volumeActivationTimestamp = null;
let activeFingerTip = null;
const VOLUME_ACTIVATION_DELAY = 1000;
const VOLUME_CONTROL_RADIUS = 50;
let lastFrameTime = 0;
const BASE_TOUCH_SENSITIVITY = 0.5; // Fixed touch sensitivity
let TOUCH_SENSITIVITY = BASE_TOUCH_SENSITIVITY;
const ROTATION_LIMIT = Math.PI / 2; // 90 degrees
const ROTATION_RETURN_DURATION = 300; // ms
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const TARGET_WIDTH_PERCENTAGE = 0.95;
const SAFE_ZONE_MARGIN = 0.9;
const ROTATION_BUFFER = 0.8;
const TIMELINE_OFFSET = 180;
const SPHERE_RADIUS = 5;
const COLUMN_ANIMATION_SPEED = 2.0; // Adjust for desired animation speed
const FPS = 25; // Fixed 25fps update rate
const TRAIL_DURATION = 500; // 500ms trail duration
const TRAIL_SEGMENTS = 25; // Number of trail segments

// Color configuration constants
const START_HUE = 0;    // Red
const END_HUE = 270;    // Violet
const SATURATION = 1.0;
const LIGHTNESS = 0.5;

// Audio configuration constants
const BASE_FREQUENCY = 27.5;
const NOTES_PER_OCTAVE = 12;
const STARTING_OCTAVE = 2;

// Note names configuration
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Add microphone processing constants
const FFT_SIZE = 4096;
const SMOOTHING_TIME_CONSTANT = 0.85;
let microphoneStream = null;
let microphoneAnalyserLeft = null;
let microphoneAnalyserRight = null;

// Динамическая генерация полутонов (по предложению Google Gemini)

// Функция для вычисления ширины колонок на основе индекса
function degreesToCells(index) {
  const maxWidth = 130;
  const minWidth = 1;
  const totalSemitones = 130;
  const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
  return Math.max(minWidth, Math.round(width));
}

// Генерация массива полутонов
const semitones = Array.from({ length: 130 }, (_, i) => {
  // Частота: базовая частота (27.5 Гц) умножается на 2^(i/12)
  const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);

  // Ширина колонки
  const width = degreesToCells(i);

  // Цвет: линейная интерполяция от START_HUE (0) до END_HUE (270)
  const hue = ((END_HUE - START_HUE) * i) / (129) + START_HUE;
  const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);

  // Нота и октава
  const octave = Math.floor(i / NOTES_PER_OCTAVE) + STARTING_OCTAVE;
  const noteIndex = i % NOTES_PER_OCTAVE;
  const note = NOTES[noteIndex] + octave;

  return {
    key: note.replace("#", "s"), // Для React (если будет использоваться)
    note: note,
    f: f,
    width: width,
    color: color,
    deg: 180.00 - (i * 1.3846), // Угол для визуализации
    // dBLeft: 0,  // Закомментировано, но оставлено на случай необходимости
    // dBRight: 0, // Закомментировано, но оставлено на случай необходимости
  };
});

// --- Grid and Scale Configuration ---
// Hologram versioning and branching
const hologramVersions = [];
let currentVersion = null;
let currentBranch = 'main'; // Основная ветка
const branches = {
  'main': []
};
let fileContents = {}; // Заполняется при загрузке
let rendererForPreview = null;
let cameraForPreview = null;
let sceneForPreview = null;

const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;

let selectedX = 0, selectedY = 0, selectedZ = 0;
let currentColumn = null;
// Импортируем state из init.js
import { state } from './js/core/init.js';
// Примечание: scene теперь инициализируется в sceneSetup.js и присваивается в state
const columns = [];
let analyserLeft, analyserRight;
let audioBufferSource = null;
let audioContext = null;
let startOffset = 0;
let startTimestamp = 0;
let videoElement = null;
let videoStream = null;
let isXRMode = false;
let isPlaying = false;
let pausedAt = 0;
let audioBuffer = null;

let fingerTrails = []; // Array to store finger trail data
let fingerPositions = []; // Array to store current finger positions

let handSpheres = { left: [], right: [] }; // Массив для хранения сфер рук

// --- Gesture Recording ---
let isGestureRecording = false;
let gestureTimeoutId = null;
const GESTURE_RECORDING_DURATION = 20000; // 20 seconds in milliseconds

// --- MediaPipe Hands --- (временно отключено)
// let hands = null; // Global reference to MediaPipe Hands controller

let mainSequencerGroup = new THREE.Group();
const leftSequencerGroup = createSequencerGrid(
  GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
  semitones[semitones.length - 1].color, // Цвет последнего (фиолетового) полутона
  new THREE.Vector3(-GRID_WIDTH, 0, -GRID_DEPTH / 2), // Move left grid further left
  true
);
const rightSequencerGroup = createSequencerGrid(
  GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
  semitones[0].color, // Цвет первого (красного) полутона
  new THREE.Vector3(0, 0, -GRID_DEPTH / 2), // Move right grid to center
  false
);

// --- Hologram Versioning (временно закомментировано) ---
// const hologramVersions = {
//     v1: 'test.glb',
//     v2: 'test.glb'
// };
// let currentHologram = null;
// const loader = new GLTFLoader();

// async function loadHologram(version) {
//     if (currentHologram) {
//         scene.remove(currentHologram);
//     }
//     return new Promise((resolve, reject) => {
//         loader.load(hologramVersions[version], (gltf) => {
//             currentHologram = gltf.scene;
//             currentHologram.position.set(0, 0, 0); // Center the hologram
//             scene.add(currentHologram);
//             resolve();
//         }, undefined, (error) => {
//             console.error('Ошибка загрузки голограммы:', error);
//             reject(error);
//         });
//     });
// }

function setupCamera() {
  if (!isXRMode) return;

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: window.innerWidth },
      height: { ideal: window.innerHeight }
    }
  })
  .then(stream => {
    currentStream = stream;
    const cameraView = document.getElementById('camera-view');
    if (cameraView) {
      cameraView.srcObject = stream;
      cameraView.addEventListener('loadeddata', () => {
        cameraView.style.visibility = 'visible';
        setupFingerTracking();
      });
    }
  })
  .catch(error => {
    console.error("Error accessing camera:", error);
  });

  // Обработчик для кнопки Telegram
  if (telegramLinkButton) {
    telegramLinkButton.addEventListener('click', () => {
      window.open('https://t.me/+WjtL4ipr-yljNGRi', '_blank', 'noopener,noreferrer');
    });
  }
}

function setupMicrophone() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      microphoneStream = stream;
      const source = audioContext.createMediaStreamSource(stream);

      // Create stereo analysers
      microphoneAnalyserLeft = audioContext.createAnalyser();
      microphoneAnalyserRight = audioContext.createAnalyser();

      microphoneAnalyserLeft.fftSize = FFT_SIZE;
      microphoneAnalyserRight.fftSize = FFT_SIZE;
      microphoneAnalyserLeft.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      microphoneAnalyserRight.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      const splitter = audioContext.createChannelSplitter(2);
      source.connect(splitter);
      splitter.connect(microphoneAnalyserLeft, 0);
      splitter.connect(microphoneAnalyserRight, 1);

      document.getElementById('micButton').classList.add('active');
    })
    .catch(error => {
      console.error('Error accessing microphone:', error);
    });
}

function stopMicrophone() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    microphoneAnalyserLeft = null;
    microphoneAnalyserRight = null;
    document.getElementById('micButton').classList.remove('active');
    // Сброс визуализации колонок до нулевого состояния
    columns.forEach((column, i) => {
        const baseColor = semitones[i] ? semitones[i].color : new THREE.Color(0xffffff); // Базовый цвет или белый
        if (column.left && column.right) {
            column.left.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
            column.right.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
        }
    });
    console.log("Визуализация микрофона очищена (столбцы сброшены в 0).");
  }
}

  // Обработчик клика для кнопки микрофона
  /*if (micButton) {
      micButton.addEventListener('click', () => {
        // Проверяем состояние AudioContext перед действиями
        if (!audioContext || audioContext.state === 'closed') {
            console.log("AudioContext не инициализирован или закрыт. Попытка создать/возобновить.");
            // Пытаемся создать или возобновить контекст ПЕРЕД тем, как вызывать setupMicrophone
             if (!audioContext) {
                 try {
                     audioContext = new (window.AudioContext || window.webkitAudioContext)();
                     console.log("AudioContext создан.");
                 } catch (e) {
                     console.error("Не удалось создать AudioContext:", e);
                     alert("Ошибка: Не удалось инициализировать аудио систему.");
                     return;
                 }
             }
             if (audioContext.state === 'suspended') {
                 audioContext.resume().then(() => {
                     console.log("AudioContext возобновлен.");
                     // Теперь, когда контекст точно есть и активен, вызываем setup
                     setupMicrophone();
                 }).catch(e => console.error("Не удалось возобновить AudioContext:", e));
             } else if (audioContext.state === 'running') {
                 // Контекст уже работает, можно вызывать setup
                 setupMicrophone();
             }
            return; // Выходим из обработчика клика после попытки инициализации/возобновления
        }

         // Если контекст есть и активен, выполняем переключение
        if (audioContext.state === 'running') {
             const isActive = micButton.classList.contains('active');
             if (isActive) {
               stopMicrophone();
               console.log("Вызов stopMicrophone()");
             } else {
               setupMicrophone();
               console.log("Вызов setupMicrophone()");
             }
        } else if (audioContext.state === 'suspended') {
            // Дополнительная попытка возобновить, если первое условие не сработало
             audioContext.resume().then(() => {
                 console.log("AudioContext возобновлен при переключении.");
                 // Повторно вызываем setup, так как кнопка была неактивна
                 setupMicrophone();
             }).catch(e => console.error("Не удалось возобновить AudioContext при переключении:", e));
        }
      });
  } else {
      console.error("Кнопка микрофона #micButton не найдена!");
  }
*/
function updateTouchSensitivity() {
  TOUCH_SENSITIVITY = BASE_TOUCH_SENSITIVITY; // Keep it fixed
}

function createSphere(color, radius) {
  const geometry = new THREE.SphereGeometry(radius * 0.5, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    fog: false
  });
  return new THREE.Mesh(geometry, material);
}

function createLine(start, end, color, opacity) {
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthTest: false
  });
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  return new THREE.Line(geometry, material);
}

function createAxis(length, sphereRadius, xColor, yColor, zColor, isLeftGrid) {
  const axisGroup = new THREE.Group();

  // X-axis - Red for positive, Purple for negative
  const xAxisGroup = new THREE.Group();
  const xAxisOffset = isLeftGrid ? GRID_WIDTH : 0;

  if (isLeftGrid) {
    // Negative X - Purple
    const xAxisNeg = createSphere(0x9400d3, sphereRadius);
    xAxisNeg.position.set(-length, 0, 0);
    const xAxisLineNeg = createLine(
      new THREE.Vector3(-length, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0x9400d3,
      1.0
    );
    xAxisGroup.add(xAxisNeg, xAxisLineNeg);
  } else {
    // Positive X - Red
    const xAxisPos = createSphere(0xFF0000, sphereRadius);
    xAxisPos.position.set(length, 0, 0);
    const xAxisLinePos = createLine(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length, 0, 0),
      0xFF0000,
      1.0
    );
    xAxisGroup.add(xAxisPos, xAxisLinePos);
  }

  // Y-axis - Green
  const yAxisGroup = new THREE.Group();
  const yAxis = createSphere(yColor, sphereRadius);
  yAxis.position.set(0, GRID_HEIGHT, 0);
  const yAxisLine = createLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, GRID_HEIGHT, 0),
    0x00FF00,
    1.0
  );
  yAxisGroup.add(yAxis, yAxisLine);

  // Z-axis - White
  const zAxisGroup = new THREE.Group();
  const zAxis = createSphere(0xFFFFFF, sphereRadius);
  zAxis.position.set(0, 0, length);
  const zAxisLine = createLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, length),
    0xFFFFFF,
    1.0
  );
  zAxisGroup.add(zAxis, zAxisLine);

  // Position all axes relative to the proper offset
  [xAxisGroup, yAxisGroup, zAxisGroup].forEach(group => {
    group.position.set(xAxisOffset, 0, 0);
    axisGroup.add(group);
  });

  return axisGroup;
}

function createSequencerGrid(width, height, depth, cellSize, color, position, isLeftGrid) {
  const grid = createGrid(width, height, depth, cellSize, color);
  if (isLeftGrid) {
    grid.material.color.set(0x9400d3);
  }
  const axis = createAxis(width, SPHERE_RADIUS, isLeftGrid ? 0x9400d3 : 0xFF0000, 0x00FF00, 0xFFFFFF, isLeftGrid);
  const sequencerGroup = new THREE.Group();
  sequencerGroup.add(grid);
  sequencerGroup.add(axis);
  sequencerGroup.position.copy(position);
  return sequencerGroup;
}

function createGrid(gridWidth, gridHeight, gridDepth, cellSize, color) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let y = 0; y <= gridHeight; y += 1) {
    for (let z = 0; z <= gridDepth; z += 1) {
      positions.push(0, y * cellSize, z * cellSize, gridWidth * cellSize, y * cellSize, z * cellSize);
    }
  }
  for (let x = 0; x <= gridWidth; x += 1) {
    for (let z = 0; z <= gridDepth; z += 1) {
      positions.push(x * cellSize, 0, z * cellSize, x * cellSize, gridHeight * cellSize, z * cellSize);
    }
  }
  for (let z = 0; z <= gridWidth; z += 1) {
    for (let y = 0; y <= gridHeight; y += 1) {
      positions.push(z * cellSize, y * cellSize, 0, z * cellSize, y * cellSize, gridDepth * cellSize);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    opacity: 0.003,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });
  return new THREE.LineSegments(geometry, material);
}

function initializeColumns() {
  if (columns.length === 0) {
    semitones.forEach((semitone, i) => {
      const initialDB = 0;
      const maxOffset = degreesToCells(semitone.deg);
      const offsetLeft = i;
      const columnLeft = createColumn(offsetLeft, i + 1, initialDB, true);
      const columnRight = createColumn(offsetLeft, i + 1, initialDB, false);
      columns.push({
        left: columnLeft,
        right: columnRight,
        offsetX: 0,
        direction: 1,
        maxOffset: maxOffset,
        speed: Math.random() * 0.1 + 0.1,
        dB: initialDB,
        dBDirection: 1
      });
    });
  }
  columns.forEach(column => {
    if (!column.left.parent) leftSequencerGroup.add(column.left);
    if (!column.right.parent) rightSequencerGroup.add(column.right);
  });
}

function getSemitoneLevels(analyser) {
  if (!analyser) {
    console.warn("Analyser is not initialized.");
    return semitones.map(() => -100); // Return default values if analyser is null
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / (2 * bufferLength);
  return semitones.map(semitone => {
    const binIndex = Math.round(semitone.f / binSize);
    if (binIndex >= bufferLength) return -100;
    const amplitude = dataArray[binIndex];
    if (amplitude === 0) return -100;
    const dB = 20 * Math.log10(amplitude / 255) * 1.5;
    return THREE.MathUtils.clamp(dB, -100, 30);
  });
}

function updateSequencerColumns(amplitudes, channel) {
  columns.forEach((column, i) => {
    const dB = amplitudes[i];
    if (isNaN(dB)) return;

    // Precise normalization
    const normalizedDB = THREE.MathUtils.clamp(
      (dB + 100) / (130 + 100),
      0,
      1
    );

    const columnGroup = channel === 'left' ? column.left : column.right;
    const { color } = semitones[i];

    columnGroup.children.forEach(mesh => {
      // Immediate visual update
      mesh.material.opacity = 1.0;
      mesh.material.transparent = false;
      mesh.material.color = color;

      // Direct position update without animation
      const targetDepth = normalizedDB * 260;
      mesh.scale.z = targetDepth;
      mesh.position.z = targetDepth / 2;
    });
  });
}

function setupAudioProcessing(source) {
  if (!audioContext) {
    console.error('AudioContext is not initialized.');
    return;
  }

  if (audioGainNode) {
    audioGainNode.disconnect();
  }
  if (analyserLeft) {
    analyserLeft.disconnect();
  }
  if (analyserRight) {
    analyserRight.disconnect();
  }

  const splitter = audioContext.createChannelSplitter(2);
  analyserLeft = audioContext.createAnalyser();
  analyserRight = audioContext.createAnalyser();
  analyserLeft.fftSize = 4096;
  analyserRight.fftSize = 4096;
  analyserLeft.smoothingTimeConstant = 0;
  analyserRight.smoothingTimeConstant = 0;
  analyserLeft.minDecibels = -100;
  analyserRight.minDecibels = -100;
  analyserLeft.maxDecibels = 0;
  analyserRight.maxDecibels = 0;
  audioGainNode = audioContext.createGain();

  source.connect(audioGainNode);
  audioGainNode.connect(splitter);
  splitter.connect(analyserLeft, 0);
  splitter.connect(analyserRight, 1);
  audioGainNode.connect(audioContext.destination);
  audioBufferSource = source;
}

function createColumn(x, y, dB, isLeftGrid) {
  const semitone = semitones[y - 1];
  const width = semitone.width; // USE width from semitones
  const startX = isLeftGrid ? 130 - width : 0;
  const columnGroup = new THREE.Group();
  columnGroup.dB = dB;
  columnGroup.position.x = startX;
  columnGroup.position.y = 0;
  const geometry = new THREE.BoxGeometry(width, 2, 1); // Use width from semitones
  const material = new THREE.MeshBasicMaterial({ // Or MeshPhongMaterial
    color: semitone.color, // Use color from semitones!
    opacity: 1.0,
    transparent: false,
  });

  const columnMesh = new THREE.Mesh(geometry, material);
  columnGroup.add(columnMesh);
  columnMesh.position.set(width / 2, y * 2, 0); // Use width from semitones
  return columnGroup;
}

function processAudio() {
  if (!isPlaying) return;

  const now = performance.now();
  const frameInterval = 1000 / FPS; // 40ms for 25fps

  if (now - lastFrameTime >= frameInterval) {
    lastFrameTime = now;

    if (analyserLeft && analyserRight) {
      const leftLevels = getSemitoneLevels(analyserLeft);
      const rightLevels = getSemitoneLevels(analyserRight);

      // Instantly update columns
      columns.forEach((column, i) => {
        const leftDB = leftLevels[i] || 0;
        const rightDB = rightLevels[i] || 0;

        // Instant snap to zero if no signal
        if (leftDB <= -100) {
          column.left.children.forEach(mesh => {
            mesh.scale.z = 0.001; // Minimal size instead of true 0
            mesh.position.z = 0;
          });

        }

        if (rightDB <= -100) {
          column.right.children.forEach(mesh => {
            mesh.scale.z = 0.001;
            mesh.position.z = 0;
          });

        }

        // Instant update to current levels
        updateColumnMesh(column.left, leftDB, 'left');
        updateColumnMesh(column.right, rightDB, 'right');
      });
    }
  }

  requestAnimationFrame(processAudio);
}

// Helper function to update column meshes
function updateColumnMesh(columnGroup, dB, side) {
  if (dB <= -100) return; // Skip if silence

  const normalizedDB = THREE.MathUtils.clamp(
    (dB + 100) / (130 + 100),
    0,
    1
  );

  columnGroup.children.forEach(mesh => {
    mesh.scale.z = normalizedDB * 260;
    mesh.position.z = (normalizedDB * 260) / 2;
  });
}

// XR mode finger tracking
function setupFingerTracking() {
    if (!navigator.mediaDevices || !isXRMode) return;

    // Stop any existing stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    // Проверяем поддержку WebGL перед запросом камеры
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
        console.error("WebGL не поддерживается в этом браузере. Отслеживание рук не будет работать.");
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
            currentStream = stream;
            videoElement = document.getElementById('camera-view');
            videoElement.srcObject = stream;

            videoElement.onloadeddata = () => {
                // Keep video element for handpose but hide it
                videoElement.style.visibility = 'hidden';
                
                // Проверяем доступность handpose
                if (!window.handpose) {
                    console.error("Библиотека handpose не найдена. Отслеживание рук не будет работать.");
                    return;
                }
                
                const handpose = window.handpose;
                handpose.load().then(model => {
                    setInterval(() => {
                        // Ensure videoElement is accessible and has data
                        if (!videoElement || !videoElement.readyState) {
                          console.warn('Video element not ready or missing');
                            return;
                        }

                        model.estimateHands(videoElement).then(hands => {
                            // Clear previous dots and lines
                            document.querySelectorAll('.finger-dot').forEach(el => el.remove());
                            document.querySelectorAll('.finger-line').forEach(el => el.remove());

                            hands.forEach(hand => {
                                // Flip, draw landmarks
                                const landmarks = hand.landmarks.map(landmark => [
                                    videoElement.offsetWidth - landmark[0],
                                    landmark[1],
                                    landmark[2]
                                ]);
                                drawHandLandmarks(landmarks);
                            });
                        });
                    }, 1000 / 30);
                });
            };
        })
        .catch(err => console.error('Error accessing camera:', err));
}

// Function to draw hand landmarks and connecting lines
function drawHandLandmarks(landmarks) {
    landmarks.forEach((tip, index) => {
        if (!tip) return;
        const x = tip[0];
        const y = tip[1];
        // Draw the dot
        const dot = document.createElement('div');
        dot.className = 'finger-dot';
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        document.body.appendChild(dot);

        // Connect with lines, except for the first point
        if (index > 0) {
            const prevTip = landmarks[index - 1];
            const line = document.createElement('div');
            line.className = 'finger-line';

            // Position the start of the line
            line.style.left = `${prevTip[0]}px`;
            line.style.top = `${prevTip[1]}px`;

            // Calculate distance and angle to position the endpoint
            const dx = tip[0] - prevTip[0];
            const dy = tip[1] - prevTip[1];
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}rad)`;

            document.body.appendChild(line);
        }
    });
}

// --- Gesture Recording Functions ---
function startGestureRecording() {
  if (isGestureRecording) {
    console.log("Запись жеста уже идет.");
    return;
  }
  isGestureRecording = true;
  // Переменная gestureArea должна быть доступна из внешней области видимости (например, объявлена при DOMContentLoaded)
  if (gestureArea) {
    gestureArea.classList.add('recording');
  }
  console.log("Начало записи жеста.");

  // TODO: Добавить здесь логику сбора данных жеста (например, из MediaPipe)

  // Устанавливаем тайм-аут на 20 секунд
  gestureTimeoutId = setTimeout(() => {
    console.log("Время записи жеста истекло.");
    stopGestureRecording();
  }, GESTURE_RECORDING_DURATION);
}

function stopGestureRecording() {
  if (!isGestureRecording) {
    return;
  }
  isGestureRecording = false;
  // Переменная gestureArea должна быть доступна из внешней области видимости (например, объявлена при DOMContentLoaded)
  if (gestureArea) {
    gestureArea.classList.remove('recording');
  }
  // Очищаем тайм-аут, если остановка произошла до истечения 20 секунд
  if (gestureTimeoutId) {
    clearTimeout(gestureTimeoutId);
    gestureTimeoutId = null;
  }
  console.log("Остановка записи жеста.");

  // TODO: Добавить здесь логику обработки/отправки записанных данных жеста
}
// --- End Gesture Recording Functions ---

document.addEventListener('DOMContentLoaded', () => {
  console.log('>>> DOMContentLoaded fired'); // Проверка старта скрипта
  console.log('>>> DOMContentLoaded fired (Инициализация модулей)');
  const chatDisplayInitialized = initializeChatDisplay(); 
  const rightPanelInitialized = initializeRightPanel(); 
  const speechInputInitialized = initializeSpeechInput(); 
  console.log(`Статус инициализации: Чат=${chatDisplayInitialized}, Панель=${rightPanelInitialized}, Речь=${speechInputInitialized}`);
  
  // Инициализация глобальных переменных
  telegramLinkButton = document.getElementById('telegramLinkButton');
  micButton = document.getElementById('micButton');
  
  const fileButton = document.getElementById('fileButton');
  const fileInput = document.getElementById('fileInput');
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const stopButton = document.getElementById('stopButton');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const xrButton = document.getElementById('xrButton');
  const gestureRecordButton = document.getElementById('gestureRecordButton');
  const scanButton = document.getElementById('scanButton');
  const bluetoothButton = document.getElementById('bluetoothButton');
  const toggleCameraButton = document.getElementById('toggleCameraButton');
  const githubButton = document.getElementById('githubButton'); // Находим кнопку
  const chatButton = document.getElementById('chatButton'); // Находим кнопку чата
  const gestureArea = document.getElementById('gesture-area'); // Находим область жестов
  if (gestureArea) {
      gestureArea.title = 'Кликните для записи жеста'; // Добавляем всплывающую подсказку
  }

  // Обработчик для кнопки чата - перенесен в rightPanelManager.js
  // if (chatButton) {
  //   chatButton.addEventListener('click', toggleChatMode);
  // }

  // Определяем элементы панелей
  const leftPanel = document.querySelector('.panel.left-panel');
  const rightPanel = document.querySelector('.panel.right-panel');
  const togglePanelsButton = document.querySelector('#togglePanelsButton');
console.log('Toggle Panels Button initialized (in script.js - old):', togglePanelsButton);
// if (togglePanelsButton) { // Закомментировано v27.0 (Trae) - дублируется в js/core/events.js
//   togglePanelsButton.addEventListener('click', togglePanels);
//   console.log('Click handler added to togglePanelsButton (in script.js - old)');
// }
  // } else {
  //     console.error('Toggle Panels Button not found (commented out due to missing if)');
  // }

  // --- Universal Panel Toggling Logic (Improved) ---
  function initializePanelState() {
    if (!leftPanel || !rightPanel || !togglePanelsButton) {
        console.error('Required elements not found for initializePanelState');
        return;
    }

    // Получаем сохраненное состояние
    const savedState = localStorage.getItem('panelsHidden');
    const shouldBeHidden = savedState === 'true';

    console.log(`[DEBUG] Initializing panel state. Saved state: ${savedState}, shouldBeHidden: ${shouldBeHidden}`);

    // Применяем классы
    leftPanel.classList.toggle('hidden', shouldBeHidden);
    rightPanel.classList.toggle('hidden', shouldBeHidden);
    togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);

    console.log(`[DEBUG] After init: leftPanel hidden=${leftPanel.classList.contains('hidden')}, rightPanel hidden=${rightPanel.classList.contains('hidden')}, button show-mode=${togglePanelsButton.classList.contains('show-mode')}`);

    // Вызываем ресайз после применения классов
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        console.log('Dispatched resize event after init timeout.');
    }, 50);
  }

  function togglePanels() {
    if (!leftPanel || !rightPanel || !togglePanelsButton) {
        console.error('Required elements not found for togglePanels');
        return;
    }
    const willBeHidden = !leftPanel.classList.contains('hidden');
    console.log('Toggling panels, willBeHidden:', willBeHidden);
    
    // Перемещаем кнопку в body, если она еще не там
    if (togglePanelsButton.parentNode !== document.body) {
        document.body.appendChild(togglePanelsButton);
        console.log('Moved togglePanelsButton to body');
    }
    
    leftPanel.classList.toggle('hidden', willBeHidden);
    rightPanel.classList.toggle('hidden', willBeHidden);
    togglePanelsButton.classList.toggle('show-mode', willBeHidden);
    localStorage.setItem('panelsHidden', willBeHidden.toString());
    
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  // Initialize panel state and add event listener
  document.addEventListener('DOMContentLoaded', () => {
    // if (togglePanelsButton && leftPanel && rightPanel) { // Закомментировано v27.0 (Trae) - логика перенесена в js/core/ui.js и js/core/events.js
    //     initializePanelState(); // Логика перенесена в js/core/ui.js
    //     togglePanelsButton.addEventListener('click', togglePanels); // Обработчик перенесен в js/core/events.js
    // } else {
        console.error("Required elements not found: togglePanelsButton, leftPanel, or rightPanel");
    // }
  });
  // --- End Universal Panel Toggling Logic ---

  const gestureModal = document.getElementById('gestureModal');
  const promptModal = document.getElementById('promptModal');
  const closeGestureModal = document.getElementById('closeGestureModal');
  const closePromptModal = document.getElementById('closePromptModal');
  const startRecordingButton = document.getElementById('startRecordingButton');
  const stopRecordingButton = document.getElementById('stopRecordingButton');
  const gestureCanvas = document.getElementById('gestureCanvas');
  if (gestureCanvas) {
    gestureCanvas.style.zIndex = '10'; // Above hologram
    gestureCanvas.style.position = 'absolute';
    gestureCanvas.style.opacity = '0.8';
    gestureCanvas.style.backgroundColor = 'rgba(0,0,0,0.2)';
    gestureCanvas.width = window.innerWidth * 0.6; // Уменьшаем ширину canvas до 60%
    gestureCanvas.height = window.innerHeight;
    gestureCanvas.style.width = '60%';
    gestureCanvas.style.left = '20%'; // Центрируем уменьшенную область
    gestureCanvas.style.height = '100%';
    gestureCanvas.style.top = '0';
    gestureCanvas.style.left = '0';
    gestureCanvas.style.pointerEvents = 'none';
    gestureCanvas.style.mixBlendMode = 'lighten'; // Better visibility
    gestureCanvas.style.display = 'block'; // Ensure it's always visible
  }
  const gestureStatus = document.getElementById('gestureStatus');
  const promptText = document.getElementById('promptText');
  const submitPromptButton = document.getElementById('submitPrompt');

  // Toggle file editor
  const toggleFilesButton = document.getElementById('toggleFilesButton');
  const integratedFileEditor = document.getElementById('integratedFileEditor');
  if (toggleFilesButton && integratedFileEditor) {
      toggleFilesButton.addEventListener('click', () => {
          const isVisible = integratedFileEditor.style.display !== 'none';
          integratedFileEditor.style.display = isVisible ? 'none' : 'block';
      });
  }

  // --- Gesture Area Click Listener ---
   // Получаем элемент gesture-area
  // const gestureArea = document.getElementById('gesture-area'); // Закомментировано повторное объявление
  if (gestureArea) { // Предполагается, что gestureArea уже объявлена ранее в этой области видимости
    gestureArea.addEventListener('click', () => {
      if (!isGestureRecording) {
        startGestureRecording();
      } else {
        // Позволяем остановить запись повторным кликом
        stopGestureRecording();
      }
    });
  } else {
    console.warn("Элемент #gesture-area не найден.");
  }
  // --- End Gesture Area Click Listener ---

  fileButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length === 0) {
      fileButton.classList.remove('active');
      return;
    }

    const file = fileInput.files[0];
    fileButton.classList.add('active');

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      try {
        audioBuffer = await audioContext.decodeAudioData(e.target.result);
        // Enable playback controls
        playButton.disabled = false;
        pauseButton.disabled = false;
        stopButton.disabled = false;

        // Reset playback state
        pausedAt = 0;
        isPlaying = false;

        if (audioBufferSource) {
          audioBufferSource.stop();
          audioBufferSource.disconnect();
        }
      } catch (error) {
        console.error('Error decoding audio data:', error);
      }
    };
    reader.readAsArrayBuffer(file);
    fileInput.value = '';
  });

  playButton.addEventListener('click', () => {
    if (!audioBuffer) return;

    if (audioBufferSource) {
      audioBufferSource.stop();
      audioBufferSource.disconnect();
    }

    audioBufferSource = audioContext.createBufferSource();
    audioBufferSource.buffer = audioBuffer;
    setupAudioProcessing(audioBufferSource);

    // Calculate start position
    startOffset = audioContext.currentTime - pausedAt;

    // Start playback from pausedAt position
    audioBufferSource.start(0, pausedAt);
    isPlaying = true;

    // Update UI
    playButton.classList.add('active');
    pauseButton.classList.remove('active');
    stopButton.classList.remove('active'); // Убираем актив у стоп
    stopButton.classList.remove('active');
  });

  pauseButton.addEventListener('click', () => {
    if (!isPlaying) return;

    // Calculate current position
    pausedAt = audioContext.currentTime - startOffset;

    if (audioBufferSource) {
      audioBufferSource.stop();
      audioBufferSource.disconnect();
    }

    isPlaying = false;

    // Update UI
    playButton.classList.remove('active');
    pauseButton.classList.add('active');
    // stopButton остается неактивным
  });

  stopButton.addEventListener('click', () => {
    if (audioBufferSource) {
      audioBufferSource.stop();
      audioBufferSource.disconnect();
    }

    // Reset playback state
    pausedAt = 0;
    isPlaying = false;

    // Reset visualization
    columns.forEach(column => {
      if (column.left) column.left.position.z = 0;
      if (column.right) column.right.position.z = 0;
    });
    // Сброс визуализации колонок до нулевого состояния
    columns.forEach((column, i) => {
         const baseColor = semitones[i] ? semitones[i].color : new THREE.Color(0xffffff); // Базовый цвет или белый
         if (column.left && column.right) {
             column.left.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
             column.right.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
         }
    });
    console.log("Визуализация файла очищена (столбцы сброшены в 0).");

    // Update UI
    playButton.classList.remove('active');
    pauseButton.classList.remove('active');
    // stopButton не делаем активным при стопе, это конечное состояние

    // Reset playhead position
    const playhead = document.getElementById('playhead');
    if (playhead) {
      playhead.style.left = '0%';
    }
  });

  setupCamera();

  // Создаем сцену Three.js
  const scene = new THREE.Scene();
  // Присваиваем scene в state для использования в других модулях
  state.scene = scene;
  
  // Добавляем hologramPivot в сцену
  scene.add(hologramPivot);
  // Присваиваем hologramPivot в state для использования в других модулях
  state.hologramPivot = hologramPivot;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 0.6);
  hemisphereLight.position.set(0, 200, 0);
  scene.add(hemisphereLight);

  const spotLight = new THREE.SpotLight(0xffffff, 0.5);
  spotLight.position.set(0, 300, 100);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 0.2;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 10;
  spotLight.shadow.camera.far = 1000;
  scene.add(spotLight);

  const gridPointLight = new THREE.PointLight(0xffffff, 0.8);
  gridPointLight.position.set(0, TIMELINE_OFFSET / 2, 500);
  scene.add(gridPointLight);

  const gridContainer = document.getElementById('grid-container');

  // --- Вычисляем доступное пространство СРАЗУ ---
  const leftPanelWidthInitial = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
  const rightPanelWidthInitial = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
  const initialAvailableWidth = window.innerWidth - leftPanelWidthInitial - rightPanelWidthInitial;
  const initialAvailableHeight = window.innerHeight;
  // console.log('Initial Available:', { width: initialAvailableWidth, height: initialAvailableHeight }); // Закомментировано v27.0
  // --------------------------------------------

  const initialAspect = initialAvailableWidth / initialAvailableHeight;
  const initialOrthoLeft = -initialAvailableWidth / 2;
  const initialOrthoRight = initialAvailableWidth / 2;
  const initialOrthoTop = initialAvailableHeight / 2;
  const initialOrthoBottom = -initialAvailableHeight / 2;
  const orthoCamera = new THREE.OrthographicCamera(
    initialOrthoLeft, initialOrthoRight, initialOrthoTop, initialOrthoBottom,
    -10000, 10000
  );
  orthoCamera.position.set(0, 0, 1200);
  orthoCamera.lookAt(0, 0, 0);
  // console.log('Initial Camera:', { left: orthoCamera.left, right: orthoCamera.right, top: orthoCamera.top, bottom: orthoCamera.bottom }); // Закомментировано v27.0

  const xrCamera = new THREE.PerspectiveCamera(70, initialAspect, 0.1, 10000);
  xrCamera.position.set(0, 0, 0);
  xrCamera.lookAt(new THREE.Vector3(0, 0, -1));

  let activeCamera = orthoCamera;
  
  // Добавляем camera в state для использования в других модулях
  state.camera = activeCamera;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: true, // Прозрачный фон
    premultipliedAlpha: false,
    preserveDrawingBuffer: false, // Отключаем сохранение буфера
    logarithmicDepthBuffer: true // Для лучшего качества глубины
  });
  renderer.domElement.style.zIndex = '5'; // Below gesture area
  renderer.domElement.style.position = 'relative';
  scene.background = null; // Полностью прозрачный фон
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Добавляем renderer в state для использования в других модулях
  state.renderer = renderer;
  // Устанавливаем РАЗМЕР РЕНДЕРЕРА по доступному пространству
  renderer.setSize(initialAvailableWidth, initialAvailableHeight);
  if (gridContainer) {
    gridContainer.appendChild(renderer.domElement);
  }

  const labelMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false
  });

  let timelineWidth = document.getElementById('timeline-container') ? document.getElementById('timeline-container').clientWidth : 0;
  let timelineHeight = document.getElementById('timeline-container') ? document.getElementById('timeline-container').clientHeight : 0;
  if (document.getElementById('timeline-canvas')) {
    document.getElementById('timeline-canvas').width = timelineWidth;
    document.getElementById('timeline-canvas').height = timelineHeight;
  }

  mainSequencerGroup.position.set(0, 0, 0); // Центрирование по Y

  function calculateInitialScale(containerWidth, availableHeightForHologram) { // Параметр - уже доступная высота
    // console.log(`>>> calculateInitialScale called with: w=${containerWidth}, hForHologram=${availableHeightForHologram}`); // Закомментировано v27.0
    const hologramWidth = GRID_WIDTH * 2;
    const hologramHeight = GRID_HEIGHT;
    let widthScale = (containerWidth * 0.98) / hologramWidth; // Отступ 1% слева/справа
    let heightScale = availableHeightForHologram / hologramHeight; // Используем ПЕРЕДАННУЮ высоту
    let scale = Math.min(widthScale, heightScale);
    scale = Math.max(scale, 0.1); // Минимальный масштаб
    // console.log(`<<< calculateInitialScale calculated scale: ${scale} (based on availableH: ${availableHeightForHologram})`); // Закомментировано v27.0
    return scale;
  }

  const initialScale = calculateInitialScale(initialAvailableWidth, initialAvailableHeight);
  // console.log('Final Scale:', initialScale); // Закомментировано v27.0

  // Функция для плавной анимации макета голограммы
  function updateHologramLayout(handsVisible) {
    // console.log(`[Layout] Updating hologram layout, handsVisible: ${handsVisible}`); // Закомментировано v27.0
    
    // Проверяем наличие необходимых элементов
    const gridContainerElement = document.getElementById('grid-container');
    const gestureAreaElement = document.getElementById('gesture-area');
    if (!gridContainerElement || !gestureAreaElement) {
        // console.warn('[Layout] Missing required elements'); // Закомментировано v27.0
        return;
    }

    // Проверяем инициализацию Three.js
    if (!scene || !activeCamera || !renderer) {
        console.error('[Layout] Three.js not initialized:', { scene, activeCamera, renderer });
        return;
    }

    // Проверяем, что hologramPivot добавлен в сцену
    if (!scene.children.includes(hologramPivot)) {
        // console.warn('[Layout] Adding hologramPivot to scene'); // Закомментировано v27.0
        scene.add(hologramPivot);
    }

    // Получаем размеры и рассчитываем целевые значения
    const windowHeight = window.innerHeight;
    const topMargin = windowHeight * 0.05;
    const availableWidth = window.innerWidth - getPanelWidths();
    const availableHeight = windowHeight - (handsVisible ? windowHeight * 0.25 : 4);
    
    const targetScale = handsVisible ? 0.8 : calculateInitialScale(availableWidth, availableHeight);
    const targetPositionY = handsVisible ? topMargin : 0;

    // console.log('[Layout] Target values:', { // Закомментировано v27.0
    //     scale: targetScale,
    //     positionY: targetPositionY,
    //     availableWidth,
    //     availableHeight
    // });

    // Анимируем масштаб
    new TWEEN.Tween(hologramPivot.scale)
        .to({ x: targetScale, y: targetScale, z: targetScale }, 500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            // console.log('[Layout] Scale update:', hologramPivot.scale); // Закомментировано v27.0
        })
        .start();

    // Анимируем позицию
    new TWEEN.Tween(hologramPivot.position)
        .to({ y: targetPositionY }, 500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            // console.log('[Layout] Position update:', hologramPivot.position); // Закомментировано v27.0
        })
        .onComplete(() => {
            // Обновляем камеру после завершения анимации
            activeCamera.updateProjectionMatrix();
            // console.log('[Layout] Animation complete'); // Закомментировано v27.0
        })
        .start();

    // Добавляем отладочные классы
    addDebugClasses();
    
    // Логируем состояние
    logLayoutState();
  }

  // Вспомогательные функции
  function getPanelWidths() {
    const leftPanel = document.querySelector('.panel.left-panel');
    const rightPanel = document.querySelector('.panel.right-panel');
    return (leftPanel?.offsetWidth || 0) + (rightPanel?.offsetWidth || 0);
  }

  function addDebugClasses() {
    const elements = {
        panel: document.querySelector('.panel.left-panel'),
        label: document.querySelector('.version-label')
    };
    
    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            element.classList.add(`debug-${key}`);
        }
    });
  }

  function logLayoutState() {
    // Логируем состояние голограммы
    /* console.log('[Layout] Hologram state:', { // Закомментировано v27.0
        position: hologramPivot.position.toArray(),
        scale: hologramPivot.scale.toArray(),
        rotation: hologramPivot.rotation.toArray()
    }); */

    // Логируем размеры панели
    const leftPanel = document.querySelector('.panel.left-panel');
    if (leftPanel) {
        /* console.log('[Layout] Left panel dimensions:', { // Закомментировано v27.0
            width: leftPanel.offsetWidth,
            buttonSize: getComputedStyle(document.documentElement).getPropertyValue('--button-size')
        }); */
    }

    // Логируем стили меток
    const versionLabel = document.querySelector('.version-label');
    if (versionLabel) {
        const styles = getComputedStyle(versionLabel);
        /* console.log('[Layout] Version label styles:', { // Закомментировано v27.0
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
            transform: styles.transform
        }); */
    }
  }

  // Добавляем обработчик resize
  window.addEventListener('resize', () => {
    // console.log('[Resize] Window resized'); // Закомментировано v27.0
    
    // Обновляем размеры панелей
    const leftPanel = document.querySelector('.panel.left-panel');
    const rightPanel = document.querySelector('.panel.right-panel');
    
    if (leftPanel) {
        const buttonSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--button-size'));
        const buttonSpacing = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--button-spacing'));
        const newWidth = buttonSize * 2 + buttonSpacing * 3;
        leftPanel.style.width = `${newWidth}px`;
        // console.log('[Resize] Left panel resized:', { width: newWidth }); // Закомментировано v27.0
    }
    
    if (rightPanel) {
        const newWidth = Math.min(Math.max(window.innerWidth * 0.25, 20), 30) + 'vw';
        rightPanel.style.width = newWidth;
        // console.log('[Resize] Right panel resized:', { width: newWidth }); // Закомментировано v27.0
    }
    
    // Обновляем размеры рендерера
    if (renderer) {
        const availableWidth = window.innerWidth - getPanelWidths();
        const availableHeight = window.innerHeight;
        renderer.setSize(availableWidth, availableHeight);
        // console.log('[Resize] Renderer resized:', { width: availableWidth, height: availableHeight }); // Закомментировано v27.0
    }
    
    // Обновляем камеру
    if (activeCamera) {
        activeCamera.aspect = window.innerWidth / window.innerHeight;
        activeCamera.updateProjectionMatrix();
        // console.log('[Resize] Camera updated'); // Закомментировано v27.0
    }
    
    // Обновляем макет голограммы
    const gestureArea = document.getElementById('gesture-area');
    if (gestureArea) {
        const handsVisible = gestureArea.classList.contains('hands-detected');
        updateHologramLayout(handsVisible);
    }
  });

  // Обновляем функцию animate
  function animate() {
    requestAnimationFrame(animate);

    // Проверяем инициализацию
    if (!scene || !activeCamera || !renderer) {
        console.error('[Animation] Rendering setup incomplete:', { scene, activeCamera, renderer });
        return;
    }

    // Обновляем анимации TWEEN.js
    TWEEN.update();

    // Очищаем буферы
    renderer.clear();

    // Обрабатываем аудио
    if (isPlaying) {
        processAudio();
    }

    // Обновляем визуализацию
    if (microphoneAnalyserLeft && microphoneAnalyserRight) {
        const leftLevels = getSemitoneLevels(microphoneAnalyserLeft);
        const rightLevels = getSemitoneLevels(microphoneAnalyserRight);
        updateSequencerColumns(leftLevels, 'left');
        updateSequencerColumns(rightLevels, 'right');
    }
    // Рендерим сцену
    renderer.render(scene, activeCamera);
  } // Закрывающая скобка для функции animate

  // Инициализация сцены
  scene.add(hologramPivot);
  hologramPivot.add(mainSequencerGroup);
  mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0); // Центрируем геометрию относительно пивота
  hologramPivot.position.set(0, 0, 0); // Начальная позиция пивота
  mainSequencerGroup.rotation.set(0, 0, 0);

  // Установи начальные параметры для состояния "без рук"
  updateHologramLayout(false);

  renderer.autoClear = false;

  const defaultMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 0.001,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });

  mainSequencerGroup.add(leftSequencerGroup, rightSequencerGroup);

  initializeColumns();

  const hammer = new Hammer(renderer.domElement);
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

  hammer.on('pan', ev => {
    const deltaX = ev.deltaX / window.innerWidth;
    const deltaY = ev.deltaY / window.innerHeight;

    // Convert screen movement to radians (1:1 ratio)
    const rotationX = deltaY * Math.PI;
    const rotationY = deltaX * Math.PI;

    if (!isXRMode) {
      // Clamp rotations to ±90 degrees (±π/2 radians)
      hologramPivot.rotation.x = THREE.MathUtils.clamp(
        rotationX,
        -Math.PI/2,
        Math.PI/2
      );
      hologramPivot.rotation.y = THREE.MathUtils.clamp(
        rotationY,
        -Math.PI/2,
        Math.PI/2
      );
      hologramPivot.rotation.z = 0; // Prevent Z rotation
    } else {
      xrCamera.rotation.x = THREE.MathUtils.clamp(
        rotationX,
        -Math.PI/2,
        Math.PI/2
      );
      xrCamera.rotation.y = THREE.MathUtils.clamp(
        rotationY,
        -Math.PI/2,
        Math.PI/2
      );
      xrCamera.rotation.z = 0;
    }
  });

  hammer.on('panend', () => {
    const startRotationX = !isXRMode ? hologramPivot.rotation.x : xrCamera.rotation.x;
    const startRotationY = !isXRMode ? hologramPivot.rotation.y : xrCamera.rotation.y;
    const startTime = performance.now();

    function animateReturn(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ROTATION_RETURN_DURATION, 1);

      // Cubic easing for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      if (!isXRMode) {
        hologramPivot.rotation.x = startRotationX * (1 - easeProgress);
        hologramPivot.rotation.y = startRotationY * (1 - easeProgress);
      } else {
        xrCamera.rotation.x = startRotationX * (1 - easeProgress);
        xrCamera.rotation.y = startRotationY * (1 - easeProgress);
      }

      if (progress < 1) {
        requestAnimationFrame(animateReturn);
      }
    }

    requestAnimationFrame(animateReturn);
  });

  // Закомментированный код для микрофона не влияет на отображение кнопок
  // Временная заглушка для будущей реализации

  document.getElementById('xrButton').addEventListener('click', () => {
    isXRMode = !isXRMode;
    const button = document.getElementById('xrButton');
    button.classList.toggle('active');

    if (isXRMode) {
      setupFingerTracking();
      // Keep the same position and scale
      xrCamera.position.copy(orthoCamera.position);
      xrCamera.rotation.copy(orthoCamera.rotation);
      xrCamera.scale.copy(orthoCamera.scale);

      const currentScale = mainSequencerGroup.scale.clone();
      mainSequencerGroup.scale.copy(currentScale);
      mainSequencerGroup.position.set(0,0, 0); // Устанавливаем mainSequencerGroup.position.x = 0;
    } else {
        // Clear finger dots
        document.querySelectorAll('.finger-dot').forEach(el => el.remove());
        document.querySelectorAll('.finger-line').forEach(el => el.remove());
        // Reset to original position and scale
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        document.getElementById('camera-view').style.display = 'none';
    }
  });

  // Обработчик для кнопки промпта

  closePromptModal.addEventListener('click', () => {
    promptModal.style.display = 'none';
  });

  submitPromptButton.addEventListener('click', () => {
    const prompt = promptText.value.trim();
    if (prompt) {
      applyPrompt(prompt, document.getElementById('modelSelect').value);
      promptText.value = '';
      promptModal.style.display = 'none';
    } else {
      alert('Пожалуйста, введите промпт.');
    }
  });

  // --- Top Prompt Bar ---
  const topPromptInput = document.getElementById('topPromptInput');
  const submitTopPrompt = document.getElementById('submitTopPrompt');

  submitTopPrompt.addEventListener('click', () => {
    const prompt = topPromptInput.value.trim();
    if (prompt) {
      applyPrompt(prompt, document.getElementById('modelSelect').value);
      topPromptInput.value = '';
    }
  });

  topPromptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitTopPrompt.click();
    }
  });

  // --- File Loading and Editor Setup ---
async function fetchAndStoreFile(filename) {
  try {
    const response = await fetch(filename); // Запрашиваем файл у сервера
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
    }
    const content = await response.text();
    fileContents[filename] = content;
    console.log(`Содержимое ${filename} загружено.`);
    // <<< ДОБАВИТЬ КОД НИЖЕ >>>
    // Прокручиваем контейнер версий вниз после добавления всех элементов
    const timelineContainer = document.getElementById('versionTimeline'); // Получаем сам контейнер
    if (timelineContainer) {
        // Используем requestAnimationFrame для гарантии, что DOM обновлен
        requestAnimationFrame(() => {
            timelineContainer.scrollTop = timelineContainer.scrollHeight;
            console.log("Timeline scrolled to bottom.");
        });
    }
    // <<< КОНЕЦ ДОБАВЛЕННОГО КОДА >>>

  } catch (error) {
    console.error(`Не удалось загрузить ${filename}:`, error);
    fileContents[filename] = `// Ошибка загрузки ${filename}\n${error}`; // Записываем ошибку в контент
  }
}

function setupFileEditor() {
    const fileListElement = document.getElementById('fileList');
    const fileContentTextAreaElement = document.getElementById('fileContent');
    const saveFileButton = document.getElementById('saveFile');

    if (fileListElement && fileContentTextAreaElement) {
        console.log("Настройка обработчиков для списка файлов...");
        fileListElement.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', () => {
                const fileName = item.dataset.file;
                console.log(`Клик по файлу: ${fileName}`);
                if (Object.prototype.hasOwnProperty.call(fileContents, fileName)) {
                    fileContentTextAreaElement.value = fileContents[fileName];
                    fileContentTextAreaElement.dataset.currentFile = fileName; // Обновляем атрибут data-*
                    fileListElement.querySelectorAll('li').forEach(li => {
                        li.style.fontWeight = li.dataset.file === fileName ? 'bold' : 'normal';
                    });
                    console.log(`Отображен файл: ${fileName}`);
                } else {
                    console.warn(`Содержимое для ${fileName} не найдено в fileContents.`);
                    fileContentTextAreaElement.value = `// Не удалось загрузить или найти содержимое ${fileName}`;
                    fileContentTextAreaElement.dataset.currentFile = '';
                     fileListElement.querySelectorAll('li').forEach(li => {
                          li.style.fontWeight = 'normal';
                     });
                }
            });
        });
    } else {
         console.warn("Элементы списка файлов (#fileList) или редактора (#fileContent) не найдены.");
    }

    // Обработчик кнопки Save
    if (saveFileButton && fileContentTextAreaElement) {
         saveFileButton.addEventListener('click', () => {
             const file = fileContentTextAreaElement.dataset.currentFile;
             if (file && Object.prototype.hasOwnProperty.call(fileContents, file)) {
                 fileContents[file] = fileContentTextAreaElement.value;
                 console.log(`Содержимое ${file} сохранено локально (в fileContents).`);
                 alert(`${file} сохранен локально.`);
             } else {
                 console.warn("Не выбран файл для сохранения.");
                 alert("Не выбран файл для сохранения.");
             }
         });
    } else {
         console.warn("Кнопка сохранения (#saveFile) не найдена.");
    }
}

async function loadInitialFilesAndSetupEditor() {
    // Добавляем /static/ к путям
    await Promise.all([
        fetchAndStoreFile('/static/index.html'),
        fetchAndStoreFile('/static/script.js'),
        fetchAndStoreFile('/static/style.css')
    ]).then(() => {
        console.log("Начальное содержимое файлов загружено.");

        const fileContentTextAreaElement = document.getElementById('fileContent');
        const fileListElement = document.getElementById('fileList');
        // Используем путь с /static/ для получения контента
        if (fileContentTextAreaElement && fileContents['/static/script.js']) {
             fileContentTextAreaElement.value = fileContents['/static/script.js'];
             fileContentTextAreaElement.dataset.currentFile = '/static/script.js'; // Сохраняем правильный ключ
              if (fileListElement) {
                   fileListElement.querySelectorAll('li').forEach(item => {
                       // Сравниваем data-атрибут (который должен быть без /static/) с 'script.js'
                       item.style.fontWeight = item.dataset.file === 'script.js' ? 'bold' : 'normal';
                   });
              }
        }
        setupFileEditor();
    }).catch(error => {
         console.error("Критическая ошибка при загрузке начальных файлов:", error);
    });
}
// --------------------------------------
  // --- Versioning and Timeline ---
  function setupPreviewRenderer() {
    const canvas = document.getElementById('previewCanvas');
    rendererForPreview = new THREE.WebGLRenderer({ canvas, antialias: true });
    rendererForPreview.setSize(100, 100);
    sceneForPreview = new THREE.Scene();
    cameraForPreview = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    cameraForPreview.position.set(0, 0, 1200);
    cameraForPreview.lookAt(0, 0, 0);
  }

  function capturePreview() {
    sceneForPreview.copy(scene);
    rendererForPreview.render(sceneForPreview, cameraForPreview);
    return document.getElementById('previewCanvas').toDataURL('image/png');
  }

  // --- Объявляем глобальную переменную для Триа-режима ---


  // В самом начале файла объявляем глобальную переменную для Триа-режима


  // ... existing code ...

  // Удалим повторные объявления переменной isTriaModeActive
  function applyPrompt(prompt, model) {
    // Сначала проверяем, активен ли режим Триа через функцию из модуля tria_mode.js
    applyPromptWithTriaMode(prompt, model)
      .then(result => {
        // Если функция вернула результат (не false), значит запрос к Триа был выполнен
        // и обработан внутри неё, поэтому выходим из функции
        if (result) return;
        
        // Если вернулся false, продолжаем стандартную логику отправки на /generate
        console.log('Отправка промпта на /generate (стандартный режим)');
        const spinner = document.getElementById('loading-spinner');
        const submitButton = document.getElementById('submitTopPrompt');

        // Показываем спиннер и блокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
        spinner.style.display = 'block';
        submitButton.disabled = true;

        // Шаг 1: Отправка запроса на /generate (существующая логика)
        axios.post('/generate', { prompt, model })
          // ... существующий код для /generate ...
          .then(generateResponse => {
            // Этот блок выполняется после успешного ответа от /generate
            console.log('Ответ от /generate:', generateResponse.data);
            const backgroundColor = generateResponse.data.backgroundColor; // Получаем цвет фона
            const generatedCode = generateResponse.data.generatedCode; // Получаем сгенерированный код

            // --- ШАГ 1.5: ПРИМЕНЕНИЕ СГЕНЕРИРОВАННОГО КОДА ---
            if (generatedCode) {
              console.log("Пытаемся выполнить сгенерированный код...");
              try {
                // Используем Function constructor вместо прямого eval для некоторой изоляции
                const executeCode = new Function('scene', 'mainSequencerGroup', 'THREE', generatedCode);
                executeCode(scene, mainSequencerGroup, THREE); // Передаем нужные объекты в контекст
                console.log("Сгенерированный код выполнен успешно.");
              } catch (e) {
                console.error("Ошибка выполнения сгенерированного кода:", e);
                alert(`Ошибка выполнения сгенерированного кода:\n${e.message}\n\nПромт: ${prompt}`);
                // Не прерываем создание версии, но сообщаем об ошибке
              }
            } else {
              console.log("Сгенерированный код отсутствует, применение не требуется.");
            }
            // ---------------------------------------------

            // Шаг 2: Подготовка данных и создание новой версии через /branches
            const sceneStateObject = JSON.parse(JSON.stringify(scene.toJSON())); // Получаем состояние сцены как объект
            // const previewDataURL = capturePreview(); // Получаем превью (пока не используется бэкендом)

            console.log('Создание новой версии через POST /branches');
            // Возвращаем Promise от запроса на создание ветки
            return axios.post('/branches', {
              branch: currentBranch, // Текущая выбранная ветка
              prompt: prompt,       // Промпт, который использовался
              model: model,         // Модель, которая использовалась
              files: {
                  ...fileContents,  // Текущее состояние редактируемых файлов
                  'generated_code.js': generatedCode || '' // Добавляем сгенерированный код
              },
              scene_state: sceneStateObject, // Состояние 3D-сцены
              customData: { backgroundColor: backgroundColor } // Сохраняем цвет фона
              // preview: previewDataURL // Раскомментировать, если бэкенд будет сохранять превью
            });
          })
          .then(branchesResponse => {
            // Этот блок выполняется после успешного ответа от POST /branches
            const newVersionId = branchesResponse.data.version_id;
            console.log('Новая версия успешно создана на бэкенде, ID:', newVersionId);

            // Шаг 3: Обновляем UI (таймлайн)
            // СНАЧАЛА обновляем таймлайн (хотя это может не успеть отобразиться до перезагрузки)
            // updateTimelineFromServer(); // Этот вызов прерывается перезагрузкой
            // Скрываем спиннер перед перезагрузкой
            spinner.style.display = 'none';
            // ПОТОМ перезагружаем страницу
            console.log("Перезагрузка страницы для применения изменений...");
            location.reload(true); // true - для принудительной перезагрузки с сервера (без кэша)
            // -----------------------------------------
          })
          .catch(error => {
            // Скрываем спиннер и разблокируем кнопку при ошибке
            spinner.style.display = 'none';
            submitButton.disabled = false;

            // Обработка ошибок как от /generate, так и от /branches
            console.error('Ошибка при обработке промпта или создании версии:', error);
            if (error.response) {
              // Ошибка пришла с ответом от сервера (статус не 2xx)
              console.error('Данные ошибки от сервера:', error.response.data);
              console.error('Статус ошибки от сервера:', error.response.status);
              alert(`Ошибка сервера: ${error.response.data.detail || error.response.data.error || 'Неизвестная ошибка сервера'}`);
            } else if (error.request) {
              // Запрос был отправлен, но ответ не был получен
              console.error('Сервер не отвечает:', error.request);
              alert('Не удалось связаться с сервером.');
            } else {
              // Ошибка произошла при настройке запроса
              console.error('Ошибка настройки запроса:', error.message);
              alert(`Ошибка при отправке запроса: ${error.message}`);
            }
          });
      })
      .catch(error => {
        console.error('Ошибка при работе с Триа:', error);
      });
  }

  async function updateTimelineFromServer() {
    try {
      const response = await axios.get(`/branches/${currentBranch}`);
      const versions = response.data.versions;
      const versionFrames = document.getElementById('versionFrames');
      versionFrames.innerHTML = '';

      versions.reverse(); // Reverse the array before processing
      versions.forEach((version, index) => {
        const frame = document.createElement('div');
        frame.className = 'version-frame';
        frame.setAttribute('data-version-id', version.version_id);
        frame.innerHTML = `
          <div class="version-placeholder">
            <span class="version-label">В${index + 1}</span>
          </div>
          <div class="version-text">
            <p>${version.prompt || 'No prompt'}</p>
          </div>
        `;
        frame.addEventListener('click', () => {
          switchToVersion(version.version_id, version.branch);
        });
        versionFrames.appendChild(frame);
      });
      // Убрали setTimeout, так как теперь скроллом управляет MutationObserver
    } catch (error) {
      console.error('Ошибка загрузки версий:', error);
      
      // Создаем демонстрационные версии, если произошла ошибка загрузки с сервера
      createDemoVersions();
    }
  }

  // Функция для создания демонстрационных версий таймлайна
  function createDemoVersions() {
    const versionFrames = document.getElementById('versionFrames');
    if (!versionFrames) return;

    // Очищаем контейнер версий
    versionFrames.innerHTML = '';

    // Демонстрационные данные версий
    const demoVersions = [
      { id: 'demo-1', prompt: 'Начальная голограмма' },
      { id: 'demo-2', prompt: 'Добавлены вертикальные колонны' },
      { id: 'demo-3', prompt: 'Изменены цвета левого сектора на фиолетовый' },
      { id: 'demo-4', prompt: 'Добавлена анимация вращения' },
      { id: 'demo-5', prompt: 'Реализовано управление жестами' }
    ];

    // Создаем элементы версий и добавляем их в DOM
    demoVersions.forEach((version, index) => {
      const frame = document.createElement('div');
      frame.className = 'version-frame';
      frame.setAttribute('data-version-id', version.id);
      frame.innerHTML = `
        <div class="version-placeholder">
          <span class="version-label">В${index + 1}</span>
        </div>
        <div class="version-text">
          <p>${version.prompt}</p>
        </div>
      `;
      frame.addEventListener('click', () => {
        // При клике устанавливаем активный класс
        document.querySelectorAll('.version-frame').forEach(el => {
          el.classList.remove('active');
        });
        frame.classList.add('active');
      });
      versionFrames.appendChild(frame);
    });

    // Прокручиваем вниз, чтобы показать последние версии
    versionFrames.scrollTop = versionFrames.scrollHeight;
  }

  // --- Наблюдатель за изменениями в таймлайне для автоскролла ---
  const versionFramesContainer = document.getElementById('versionFrames');
  if (versionFramesContainer) {
      const observer = new MutationObserver((mutationsList, observer) => {
          // Скроллим вниз после добавления/удаления элементов
          versionFramesContainer.scrollTop = versionFramesContainer.scrollHeight;
      });
      // Настраиваем наблюдатель: следим за добавлением/удалением дочерних узлов
      observer.observe(versionFramesContainer, { childList: true });
      console.log("MutationObserver для автоскролла таймлайна активирован.");
  }
  // --- Конец блока MutationObserver ---

  async function switchToVersion(versionId, branch) {
    try {
      const response = await axios.put(`/branches/${branch}/switch`, {
        version_id: versionId
      });
      console.log('Переключено на версию:', versionId, 'Данные:', response.data);

      // Применяем сохраненный цвет фона
      scene.background = new THREE.Color(0x000000);
      console.log(`Цвет фона установлен на #000000`);

      const files = response.data.files;
      // Отображаем сгенерированный код в редакторе
      if (files && typeof files['generated_code.js'] === 'string') {
          const fileContentTextArea = document.getElementById('fileContent');
          const fileList = document.getElementById('fileList');

          if (fileContentTextArea) {
              fileContentTextArea.value = files['generated_code.js'];
              fileContentTextArea.dataset.currentFile = 'generated_code.js';
              console.log("Отображен сгенерированный код 'generated_code.js'.");

              // Добавляем файл в список если его нет
              if (fileList && !fileList.querySelector('[data-file="generated_code.js"]')) {
                   const newItem = document.createElement('li');
                   newItem.dataset.file = 'generated_code.js';
                   newItem.textContent = 'generated_code.js';
                   newItem.addEventListener('click', () => {
                       fileContentTextArea.value = files['generated_code.js'] || '';
                       fileContentTextArea.dataset.currentFile = 'generated_code.js';
                   });
                   fileList.appendChild(newItem);
              }
              // Выделяем активный файл
              fileList.querySelectorAll('li').forEach(item => {
                  item.style.fontWeight = item.dataset.file === 'generated_code.js' ? 'bold' : 'normal';
              });
          }
      }

      const scene_state = response.data.scene_state;
      if (scene_state && typeof scene_state === 'object' && Object.keys(scene_state).length > 0) {
        // Добавляем проверку на наличие основных полей, которые должны быть в scene.toJSON()
        if (!scene_state.metadata || !scene_state.geometries || !scene_state.materials) {
            console.warn(`Пропуск применения состояния для версии ${versionId}: отсутствуют необходимые поля metadata/geometries/materials.`);
            return; // Прерываем применение этого состояния
        }

        const loader = new THREE.ObjectLoader();
        try {
          const parsedData = loader.parse(scene_state);
          console.log("Scene state parsed successfully:", parsedData);

          // Удаляем старую сцену и добавляем новую
          scene.remove(mainSequencerGroup);
          mainSequencerGroup = parsedData;
          scene.add(mainSequencerGroup);

          console.log("Состояние сцены применено");
        } catch (e) {
          console.error("Ошибка парсинга или применения состояния сцены:", e);
        }
      }
    } catch (error) {
      console.error('Ошибка переключения версии:', error);
      console.error(`Ошибка переключения версии: ${error.response?.data?.detail || error.message}`);
    }
  }

  function loadVersion(version) {
    currentVersion = version;
    // Восстанавливаем состояние сцены
    const loader = new THREE.ObjectLoader();
    const sceneData = JSON.parse(version.sceneState);
    scene.copy(loader.parse(sceneData));
    // Обновляем UI
    document.querySelectorAll('.version-button').forEach(button => {
      button.classList.remove('active');
      if (button.dataset.version === `v${hologramVersions.indexOf(version) + 1}`) {
        button.classList.add('active');
      }
    });
  }
  loadInitialFilesAndSetupEditor();
  // Инициализация
  setupPreviewRenderer();
  // Добавляем начальную версию
  const initialVersion = {
    id: Date.now(),
    branch: currentBranch,
    prompt: 'Initial version',
    model: 'r1',
    preview: capturePreview(),
    files: { ...fileContents },
    sceneState: JSON.stringify(scene.toJSON())
  };
  hologramVersions.push(initialVersion);
  branches[currentBranch].push(initialVersion);
  currentVersion = initialVersion;

  // Обновляем обработчик переключения версий
  document.querySelectorAll('.version-button').forEach(button => {
    button.addEventListener('click', async () => {
      const versionIndex = parseInt(button.dataset.version.replace('v', '')) - 1;
      if (hologramVersions[versionIndex]) {
        document.querySelectorAll('.version-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        loadVersion(hologramVersions[versionIndex]);
      }
    });
  });

  window.addEventListener('resize', () => {
        // Получаем элементы и их размеры
        const gridContainerElement = document.getElementById('grid-container');
        if (!gridContainerElement) {
            console.error("Resize handler: #grid-container not found!");
            return;
        }
        const currentGridHeight = gridContainerElement.clientHeight;
        const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
        const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
        const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;

        // Логи
        console.log(`Resize event: availableW=${availableWidth}, currentGridHeight=${currentGridHeight}`);

        // Обновляем камеру и рендерер
        if (!isXRMode) {
            orthoCamera.left = -availableWidth / 2;
            orthoCamera.right = availableWidth / 2;
            orthoCamera.top = currentGridHeight / 2;
            orthoCamera.bottom = -currentGridHeight / 2;
            orthoCamera.updateProjectionMatrix();
        } else {
             xrCamera.aspect = availableWidth / currentGridHeight;
             xrCamera.updateProjectionMatrix();
        }
        renderer.setSize(availableWidth, currentGridHeight);

        // Вызываем updateHologramLayout для пересчета макета голограммы
        const gestureAreaElement = document.getElementById('gesture-area');
        // Определяем видимость по высоте (сравниваем с начальной высотой щели)
        const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false; // !!! Проверяем именно '4px'
        updateHologramLayout(handsAreCurrentlyVisible); // !!! Этот вызов должен быть здесь

    }); // Конец обработчика resize

  updateTimelineFromServer();
  // initializeMediaPipeHands(); // Временно отключено - MediaPipe Hands
  animate();

  // --- Инициализация MediaPipe Hands --- (временно отключено)
  /*function initializeMediaPipeHands() {
    // Проверяем, загружена ли библиотека Hands
    if (typeof Hands === 'undefined') {
      console.error('Библиотека MediaPipe Hands не загружена. Проверьте подключение скриптов в HTML.');
      return; // Прерываем выполнение, если библиотека не найдена
    }
    console.log("Инициализация MediaPipe Hands...");

    // Получаем видео элемент
    const videoElementForHands = document.getElementById('camera-view');
    if (!videoElementForHands) {
      console.error("Видео элемент #camera-view не найден в DOM.");
      return; // Прерываем, если нет видео элемента
    }

    // Проверяем поддержку WebGL
    let webGLSupported = false;
    try {
      const canvas = document.createElement('canvas');
      webGLSupported = !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      if (!webGLSupported) {
        console.error("WebGL не поддерживается в этом браузере. MediaPipe Hands требует WebGL.");
        return;
      }
    } catch (e) {
      console.error("Ошибка при проверке поддержки WebGL:", e);
      return;
    }

    // Создаем экземпляр Hands (переменная 'hands' объявлена глобально)
    try {
      hands = new Hands({locateFile: (file) => {
        // Корректный путь к WASM файлам на CDN jsdelivr
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});

      // Настраиваем параметры Hands
      hands.setOptions({
        maxNumHands: 2,           // Отслеживать до двух рук
        modelComplexity: 0,       // Используем lite модель (0) для снижения нагрузки
        minDetectionConfidence: 0.6, // Снижаем порог для лучшей работы в HF Spaces
        minTrackingConfidence: 0.6  // Снижаем порог для лучшей работы в HF Spaces
      });

      // Устанавливаем обработчик результатов с упрощенной обработкой
      hands.onResults(onHandsResults);
    } catch (initError) {
      console.error("Ошибка при инициализации MediaPipe Hands:", initError);
      return;
    }

async function startVideoStream(videoElement, handsInstance) {
      try { 
          // Проверяем поддержку WebGL перед запросом камеры
          const testCanvas = document.createElement('canvas');
          const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
          if (!gl) {
              console.error("WebGL не поддерживается в этом браузере. MediaPipe Hands требует WebGL.");
              return;
          }
          
          // Проверяем, что текстуры могут быть созданы
          try {
              const testTexture = gl.createTexture();
              if (!testTexture) {
                  console.error("Не удалось создать тестовую WebGL текстуру. MediaPipe может не работать.");
                  return;
              }
              gl.deleteTexture(testTexture);
          } catch (textureError) {
              console.error("Ошибка при создании тестовой WebGL текстуры:", textureError);
              return;
          }
          
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
                          try { 
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
                              
                              // Оборачиваем в try-catch для отлова ошибок createTexture
                              await handsInstance.send({ image: videoElement }); 
                              errorCount = 0; // Сбрасываем счетчик ошибок при успешной обработке
                          } catch (handsError) { 
                              console.error("Error sending frame to MediaPipe Hands:", handsError); 
                              errorCount++;
                              
                              // Более детальная обработка ошибок
                              const errorMessage = handsError.toString();
                              
                              // Если ошибка связана с текстурами или WebGL
                              if (errorMessage.includes('createTexture') || 
                                  errorMessage.includes('WebGL') || 
                                  errorMessage.includes('texture') || 
                                  errorCount > MAX_ERRORS) {
                                  
                                  console.warn("WebGL texture error detected or too many errors, disabling hand tracking temporarily");
                                  processingActive = false; // Останавливаем обработку
                                  
                                  // Очищаем ресурсы перед повторной попыткой
                                  try {
                                      if (handsInstance && typeof handsInstance.close === 'function') {
                                          handsInstance.close();
                                          console.log("Closed hands instance to free resources");
                                      }
                                  } catch (closeError) {
                                      console.warn("Error while closing hands instance:", closeError);
                                  }
                                  
                                  // Пытаемся восстановить через 5 секунд
                                  setTimeout(() => {
                                      console.log("Attempting to restart hand tracking...");
                                      processingActive = true;
                                      errorCount = 0;
                                      requestAnimationFrame(processVideoFrame);
                                  }, 5000);
                                  return; 
                              }
                          } 
                      } 
                      
                      if (processingActive) {
                          requestAnimationFrame(processVideoFrame); 
                      }
                  } 
                  
                  // Запускаем обработку с небольшой задержкой
                  setTimeout(() => {
                      processVideoFrame(); 
                      isGestureCanvasReady = true;
                  }, 500);
                  
              }, 2000); // Увеличиваем задержку до 2 секунд для лучшей инициализации WebGL
          }; 
      } catch (err) { 
          console.error(">>> Error acquiring camera feed:", err.name, err.message); 
          console.log("Skipping camera initialization due to error");
          // Не показываем alert, чтобы не блокировать интерфейс
          // alert(`Failed to acquire camera feed: ${err.name}: ${err.message}. Please ensure a camera is connected and permissions are granted.`); 
      } 
    }

    if (videoElementForHands && hands){
         startVideoStream(videoElementForHands, hands);
    } else {
         console.error("Video element or Hands instance not ready for startVideoStream");
    }
  }

  let handMeshGroup = new THREE.Group();
  scene.add(handMeshGroup);

  // --- Обработчик результатов от MediaPipe Hands --- (временно отключено)
  /*function onHandsResults(results) {
    // Используем переменную gestureArea, объявленную ранее, вместо создания новой
    const gestureAreaElement = gestureArea;
    const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    // Volume control variables
    const minPinch = 0.05;
    const maxPinch = 0.3;
    let volume = 0.5; // Default volume

    // Управляем высотой области жестов через JS
    if (gestureAreaElement) {
        const targetHeight = handsArePresent ? '25vh' : '4px'; // Целевая высота
        // Проверяем, нужно ли менять высоту
        if (gestureAreaElement.style.height !== targetHeight) {
            gestureAreaElement.style.height = targetHeight;
            console.log(`Gesture area height set to: ${targetHeight}`);
            updateHologramLayout(handsArePresent); // !!! Этот вызов должен быть здесь
        }
    }

    if (!isGestureCanvasReady) { return; }

    // Очищаем группу ПЕРЕД рендерингом нового кадра  
    // Очищаем группу ПЕРЕД рендерингом нового кадра
    handMeshGroup.clear();

    // Проходимся ТОЛЬКО по рукам, обнаруженным в ЭТОМ кадре
    if (results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            if (!landmarks) continue; // Пропускаем, если нет данных

            // Преобразуем координаты с учетом зеркалирования handMeshGroup.scale.x = -1
            const handPoints3D = landmarks.map(lm => {
                // X: Масштабируем диапазон [0, 1] в [-GRID_WIDTH, +GRID_WIDTH]
                // Центрирование (lm.x - 0.5) нужно, т.к. pivot голограммы в центре
                let worldX = (lm.x - 0.5) * (GRID_WIDTH * 2);

                // Y: Масштабируем диапазон [0, 1] в [0, GRID_HEIGHT] и инвертируем
                let worldY = (1 - lm.y) * GRID_HEIGHT;

                // Z: простая зависимость от GRID_DEPTH, зажатая в пределах
                // Множитель 1.5 и смещение -GRID_DEPTH / 4 подобраны примерно, нужно тестировать
                let worldZ = THREE.MathUtils.clamp(lm.z * GRID_DEPTH * 1.5 - GRID_DEPTH / 4, -GRID_DEPTH / 2, GRID_DEPTH / 2);

                return new THREE.Vector3(worldX, worldY, worldZ);
            });

            // --- Создаем материалы ---
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, linewidth: 3 });
            // Материал для точек с поддержкой цвета вершин
            const pointsMaterial = new THREE.PointsMaterial({ size: 4, transparent: false, opacity: 1.0, vertexColors: true });

            // --- Создаем геометрии ---
            // Убедись, что HAND_CONNECTIONS определена где-то глобально!
            const linesGeometry = new THREE.BufferGeometry().setFromPoints(HAND_CONNECTIONS.flatMap(conn => {
                const p1 = handPoints3D[conn[0]];
                const p2 = handPoints3D[conn[1]];
                // Добавим проверку на существование точек перед добавлением
                return (p1 && p2) ? [p1, p2] : [];
            }));
            const pointsGeometry = new THREE.BufferGeometry().setFromPoints(handPoints3D.filter(p => p)); // Фильтруем null/undefined на всякий случай

            // --- БЛОК РАСЧЕТА ЦВЕТОВ ВЕРШИН (Зеленые кончики) ---
            const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
            const greenColor = new THREE.Color("#00cc00");
            const whiteColor = new THREE.Color("#ffffff");
            const positions = pointsGeometry.attributes.position;
            // Проверяем, есть ли вообще точки перед созданием массива цветов
            if (positions && positions.count > 0) {
                const colors = new Float32Array(positions.count * 3);
                for (let j = 0; j < positions.count; j++) {
                    if (FINGER_TIP_INDICES.includes(j)) {
                        colors[j * 3] = greenColor.r; colors[j * 3 + 1] = greenColor.g; colors[j * 3 + 2] = greenColor.b;
                    } else {
                        colors[j * 3] = whiteColor.r; colors[j * 3 + 1] = whiteColor.g; colors[j * 3 + 2] = whiteColor.b;
                    }
                }
                pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            } else {
                 console.warn("No points found in pointsGeometry to set colors for.");
            }
            // --- КОНЕЦ БЛОКА РАСЧЕТА ЦВЕТОВ ---

            // --- Создаем объекты и добавляем в группу ---
            // Проверяем, есть ли линии перед добавлением
            if (linesGeometry.attributes.position && linesGeometry.attributes.position.count > 0) {
                 const lines = new THREE.LineSegments(linesGeometry, lineMaterial);
                 handMeshGroup.add(lines);
            }
            // Проверяем, есть ли точки перед добавлением
            if (pointsGeometry.attributes.position && pointsGeometry.attributes.position.count > 0) {
                 const points = new THREE.Points(pointsGeometry, pointsMaterial);
                 handMeshGroup.add(points);
            }

        } // Конец цикла for по рукам
    } // Конец if (results.multiHandLandmarks)

     const gestureArea = document.getElementById('gesture-area');
     if (!gestureArea) return;

     // Очисти старые точки
     gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

     // Проверь, есть ли вообще обнаруженные руки
     if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
       // Внутри этой проверки пройдись циклом по results.multiHandLandmarks
       for (const landmarks of results.multiHandLandmarks) {
         // Внутри этого цикла возьми 5 ключевых точек кончиков пальцев
         const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

         // Пройдись циклом по fingerTips
         fingerTips.forEach(tip => {
           // Создай новый div
           const dot = document.createElement('div');
           // Добавь ему класс
           dot.className = 'finger-dot-on-line';
           // Вычисли позицию Y
           const gestureAreaHeight = gestureArea.clientHeight;
           const topPosition = tip.y * gestureAreaHeight;
           // Вычисли масштаб Z
           const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5); // Близко (-0.5) -> 1.5, Далеко (0.1) -> 0.5
           // Установи стили точки
           dot.style.top = `${topPosition - 3}px`;
           dot.style.transform = `scale(${scale})`;
           // Добавь точку в gestureArea
           gestureArea.appendChild(dot);
         });
       }
     }
   } */

   // Обработчик для кнопки GitHub
   githubButton.addEventListener('click', () => {
     window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
   });

  // Наблюдатель за окном записи жестов
  const gesturePanel = document.querySelector('.gesture-recording-panel');
  if (gesturePanel) {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'data-gesture-recording') {
                  const isActive = gesturePanel.getAttribute('data-gesture-recording') === 'active';
                  console.log('Gesture recording panel active:', isActive);
                  window.dispatchEvent(new Event('resize')); // Обновить позиционирование
              }
          });
      });
      observer.observe(gesturePanel, { attributes: true });
  }

  // Наблюдатель за окном записи жестов
  const gestureAreaWatcher = document.getElementById('gesture-area') || document.querySelector('[data-gesture-area], [style*="height: 25vh"], [style*="height: 4px"]');
  console.log('Gesture area element:', gestureAreaWatcher);
  if (gestureAreaWatcher) {
      console.log('Gesture area initial height:', gestureAreaWatcher.style.height);
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              const height = gestureAreaWatcher.style.height;
              const isActive = height === '25vh';
              console.log('Gesture area height changed to:', height, 'Active:', isActive);
              gestureAreaWatcher.classList.toggle('active', isActive);
              window.dispatchEvent(new Event('resize'));
          });
      });
      observer.observe(gestureAreaWatcher, { attributes: true, attributeFilter: ['style'] });
  } else {
      console.log('Gesture area element not found, checking DOM...');
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
          if (el.style.height === '25vh' || el.style.height === '4px') {
              console.log('Found element with height 25vh or 4px:', el);
          }
      });
  }

  // Перемещаем кнопку в body, если она вложена в .left-panel
  console.log('Is togglePanelsButton already declared?', typeof togglePanelsButton !== 'undefined');

  if (togglePanelsButton && togglePanelsButton.parentNode.classList.contains('left-panel')) {
      document.body.appendChild(togglePanelsButton);
      console.log('Moved togglePanelsButton to body');
  }

  // Модуль tria_mode.js теперь обрабатывает логику кнопки Триа

  // Флаг ожидания ответа от Триа
  let isWaitingForResponse = false;

  // Обработчик для кнопки отправки сообщения в чате
  const submitChatMessage = document.getElementById('submitChatMessage');
  if (submitChatMessage) {
    submitChatMessage.addEventListener('click', sendChatMessage);
  }

  // Обработчик для поля ввода сообщения в чате (отправка по Enter)
  const chatInputField = document.getElementById('chatInput');
  if (chatInputField) {
    chatInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Функция для отправки сообщения в чат
  function sendChatMessage() {
    // Проверяем, не ожидаем ли мы ответа на предыдущее сообщение
    if (isWaitingForResponse) {
      console.log('Ожидается ответ на предыдущее сообщение');
      return;
    }

    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    const modelSelect = document.getElementById('modelSelect');
    const selectedModel = modelSelect.value;
    
    if (messageText) {
      // Блокируем повторную отправку
      isWaitingForResponse = true;
      if (submitChatMessage) submitChatMessage.disabled = true;
      
      // Показываем индикатор загрузки
      const loadingIndicator = document.getElementById('loadingIndicator');
      if (loadingIndicator) loadingIndicator.style.display = 'block';
      
      // Добавляем сообщение пользователя в чат
      addMessage('user', messageText);
      
      // Очищаем поле ввода
      chatInput.value = '';
      
      // Получаем историю чата для контекста (последние 10 сообщений)
      const chatMessages = document.getElementById('chatMessages');
      const chatHistory = [];
      if (chatMessages) {
        const messageElements = chatMessages.querySelectorAll('.chat-message');
        const lastMessages = Array.from(messageElements).slice(-10); // Берем последние 10 сообщений
        
        lastMessages.forEach(msgElement => {
          const role = msgElement.classList.contains('user-message') ? 'user' : 'assistant';
          const content = msgElement.textContent;
          chatHistory.push({ role, content });
        });
      }
      
      // Отправляем запрос на сервер для получения ответа от выбранной LLM модели
      window.axios.post('/chat', {
        message: messageText,
        model: selectedModel, 
        history: chatHistory
      })
      .then(response => {
        // Скрываем индикатор загрузки
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Добавляем ответ от ИИ в чат
        if (response.data && response.data.response) {
          addMessage('tria', response.data.response);
          // Озвучиваем ответ Триа
          if (response.data.response) { // Проверяем, что ответ не пустой
              speak(response.data.response);
          }
        } else {
          addMessage('tria', 'Получен пустой ответ от сервера.');
        }
        
        // Сбрасываем флаг ожидания и разблокируем кнопку
        isWaitingForResponse = false;
        if (submitChatMessage) submitChatMessage.disabled = false;
      })
      .catch(error => {
        // Скрываем индикатор загрузки
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        console.error('Ошибка при отправке сообщения:', error);
        
        // Добавляем сообщение об ошибке в чат
        addMessage('tria', `Ошибка при обработке запроса: ${error.message || 'Неизвестная ошибка'}`);
        
        // Сбрасываем флаг ожидания и разблокируем кнопку
        isWaitingForResponse = false;
        if (submitChatMessage) submitChatMessage.disabled = false;
      });
    }
  }

  // Функция для загрузки истории чата
  function loadChatHistory() {
    const chatId = localStorage.getItem('current_chat_id');
    
    if (!chatId) {
      console.log('История чата не найдена');
      return;
    }
    
    // Показываем индикатор загрузки
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
    
    window.axios.get(`/chat/history/${chatId}`)
      .then(response => {
        // Скрываем индикатор загрузки
        if (spinner) spinner.style.display = 'none';
        
        const messages = response.data.messages || [];
        
        // Очищаем текущую историю
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          chatMessages.innerHTML = '';
        }
        
        // Добавляем сообщения из истории
        messages.forEach(msg => {
          // Конвертируем 'assistant' в 'tria' для addMessageToChat
          const sender = msg.role === 'assistant' ? 'tria' : 'user';
          addMessage(sender, msg.content);
        });
      })
      .catch(error => {
        // Скрываем индикатор загрузки
        if (spinner) spinner.style.display = 'none';
        
        console.error('Ошибка при загрузке истории чата:', error);
      });
  }

  // Восстанавливаем экспорт функции в глобальный контекст (временное решение)
  window.loadChatHistory = loadChatHistory;
});