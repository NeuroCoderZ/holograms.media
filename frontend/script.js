import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Global Variables ---
let hologramPivot = new THREE.Group();
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
const scene = new THREE.Scene();
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

// --- MediaPipe Hands ---
let hands = null; // Global reference to MediaPipe Hands controller

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
  }
}

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

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
            currentStream = stream;
            videoElement = document.getElementById('camera-view');
            videoElement.srcObject = stream;

            videoElement.onloadeddata = () => {
                // Keep video element for handpose but hide it
                videoElement.style.visibility = 'hidden';

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
  const gestureArea = document.getElementById('gesture-area');
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
  const gestureArea = document.getElementById('gesture-area');
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
  const micButton = document.getElementById('micButton');
  const telegramLinkButton = document.getElementById('telegramLinkButton'); // Находим кнопку
  const githubButton = document.getElementById('githubButton'); // Находим кнопку
  const gestureArea = document.getElementById('gesture-area'); // Находим область жестов
  if (gestureArea) {
      gestureArea.title = 'Кликните для записи жеста'; // Добавляем всплывающую подсказку
  }

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
  if (gestureArea) {
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
  console.log('Initial Available:', { width: initialAvailableWidth, height: initialAvailableHeight });
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
  console.log('Initial Camera:', { left: orthoCamera.left, right: orthoCamera.right, top: orthoCamera.top, bottom: orthoCamera.bottom });

  const xrCamera = new THREE.PerspectiveCamera(70, initialAspect, 0.1, 10000);
  xrCamera.position.set(0, 0, 0);
  xrCamera.lookAt(new THREE.Vector3(0, 0, -1));

  let activeCamera = orthoCamera;
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
    console.log(`>>> calculateInitialScale called with: w=${containerWidth}, hForHologram=${availableHeightForHologram}`);
    const hologramWidth = GRID_WIDTH * 2;
    const hologramHeight = GRID_HEIGHT;
    let widthScale = (containerWidth * 0.98) / hologramWidth; // Отступ 1% слева/справа
    let heightScale = availableHeightForHologram / hologramHeight; // Используем ПЕРЕДАННУЮ высоту
    let scale = Math.min(widthScale, heightScale);
    scale = Math.max(scale, 0.1); // Минимальный масштаб
    console.log(`<<< calculateInitialScale calculated scale: ${scale} (based on availableH: ${availableHeightForHologram})`);
    return scale;
  }

  const initialScale = calculateInitialScale(initialAvailableWidth, initialAvailableHeight);
  console.log('Final Scale:', initialScale);

  // Функция для плавной анимации макета голограммы
  function updateHologramLayout(handsVisible) {
    console.log(`Updating hologram layout, handsVisible: ${handsVisible}`);

    const gridContainerElement = document.getElementById('grid-container');
    const gestureAreaElement = document.getElementById('gesture-area');
    if (!gridContainerElement || !gestureAreaElement) return;

    const windowHeight = window.innerHeight;
    const gridContainerHeight = gridContainerElement.clientHeight;
    const gestureAreaHeightPx = handsVisible ? windowHeight * 0.25 : 4; // Используем целевую высоту

    const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
    const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
    const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;

    let targetAvailableHeight; // Доступная ВЫСОТА для голограммы
    let targetCenterY; // ЦЕНТР этой доступной высоты (относительно ВЕРХА ОКНА)

    const topMarginPercent = 0.05;
    const bottomMarginPercent = 0.05;

    if (handsVisible) {
        // --- Руки ЕСТЬ: Голограмма в 75vh контейнере ---
        const topMarginPx = gridContainerHeight * topMarginPercent;
        const bottomMarginPx = gridContainerHeight * bottomMarginPercent;
        targetAvailableHeight = gridContainerHeight - topMarginPx - bottomMarginPx; // ~ 75vh * 0.9
        targetCenterY = topMarginPx + targetAvailableHeight / 2; // Центр внутри 75vh
    } else {
        // --- Рук НЕТ: Голограмма почти во весь экран ---
        const topEdge = windowHeight * topMarginPercent;
        const gestureAreaTop = windowHeight - gestureAreaHeightPx; // Верх "щели"
        const bottomEdge = gestureAreaTop - (windowHeight * bottomMarginPercent); // Отступ 5% от верха щели
        targetAvailableHeight = bottomEdge - topEdge;
        targetCenterY = topEdge + targetAvailableHeight / 2; // Центр между отступами
    }

    const targetScale = calculateInitialScale(availableWidth, targetAvailableHeight);

    // Рассчитываем целевую позицию Y для mainSequencerGroup относительно hologramPivot
    const pivotY_from_windowTop = gridContainerHeight / 2; // Центр 75vh контейнера
    const targetY = targetCenterY - pivotY_from_windowTop; // Смещение от центра контейнера

    console.log(`Target Layout: Scale=${targetScale.toFixed(3)}, Y=${targetY.toFixed(1)}, AvailH=${targetAvailableHeight.toFixed(1)}`);

    // --- Анимация TWEEN.js ---
    const currentScale = hologramPivot.scale.x;
    const currentY = mainSequencerGroup.position.y;
    TWEEN.removeAll();
    new TWEEN.Tween({ scale: currentScale, y: currentY })
        .to({ scale: targetScale, y: targetY }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
            hologramPivot.scale.setScalar(obj.scale);
            mainSequencerGroup.position.y = obj.y;
        })
        .start();
    // --- Конец анимации ---
  }

  scene.add(hologramPivot);
  hologramPivot.add(mainSequencerGroup);
  hologramPivot.scale.setScalar(initialScale * 0.8); // Уменьшаем итоговый масштаб
  console.log(`--- Initial scale applied to hologramPivot: ${initialScale}`);
  hologramPivot.position.set(0, 0, 0); // Пивот в центре
  mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0); // Центрируем по высоте голограммы
  mainSequencerGroup.rotation.set(0, 0, 0);

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
                if (fileContents.hasOwnProperty(fileName)) {
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
             if (file && fileContents.hasOwnProperty(file)) {
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
    await Promise.all([
        fetchAndStoreFile('index.html'),
        fetchAndStoreFile('script.js'),
        fetchAndStoreFile('style.css')
    ]).then(() => {
        console.log("Начальное содержимое файлов загружено.");

        const fileContentTextAreaElement = document.getElementById('fileContent');
        const fileListElement = document.getElementById('fileList');
        if (fileContentTextAreaElement && fileContents['script.js']) {
             fileContentTextAreaElement.value = fileContents['script.js'];
             fileContentTextAreaElement.dataset.currentFile = 'script.js';
              if (fileListElement) {
                   fileListElement.querySelectorAll('li').forEach(item => {
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

  function applyPrompt(prompt, model) {
  console.log(`Отправка промпта "${prompt}" с моделью ${model} на /generate`);

  const spinner = document.getElementById('loading-spinner');
  const submitButton = document.getElementById('submitTopPrompt');

  // Показываем спиннер и блокируем кнопку
  spinner.style.display = 'block';
  submitButton.disabled = true;

  // Шаг 1: Отправка запроса на /generate
  axios.post('/generate', { prompt, model })
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
      alert('Не удалось загрузить версии с сервера');
    }
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
    // Получаем элементы и их размеры ОДИН РАЗ в начале
    const gridContainerElement = document.getElementById('grid-container');
    if (!gridContainerElement) {
        console.error("Resize handler: #grid-container not found!");
        return; // Выходим, если контейнер не найден
    }
    const currentGridHeight = gridContainerElement.clientHeight;
    const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
    const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
    const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;

    // Логи для отладки
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

    // Устанавливаем размер рендерера по АКТУАЛЬНОЙ высоте контейнера
    renderer.setSize(availableWidth, currentGridHeight);

    // Определяем видимость рук и обновляем макет
    const gestureAreaElement = document.getElementById('gesture-area');
    const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false;
    updateHologramLayout(handsAreCurrentlyVisible);
  }); // Конец обработчика resize

  function animate() {
    requestAnimationFrame(animate);
    TWEEN.update(); // !!! Обновляем анимации TWEEN

    // Обновляем анимации TWEEN.js
    TWEEN.update();

    // Явно очищаем буферы перед рендерингом
    renderer.clear();

    if (isPlaying) {
      processAudio();
    }

    if (microphoneAnalyserLeft && microphoneAnalyserRight) {
      const leftLevels = getSemitoneLevels(microphoneAnalyserLeft);
      const rightLevels = getSemitoneLevels(microphoneAnalyserRight);
      updateSequencerColumns(leftLevels, 'left');
      updateSequencerColumns(rightLevels, 'right');
    }

    renderer.render(scene, isXRMode ? xrCamera : orthoCamera);
  }

  window.dispatchEvent(new Event('resize')); // Имитируем событие resize для первоначального расчета

updateTimelineFromServer();
  initializeMediaPipeHands(); // Инициализируем MediaPipe
  animate();

  // --- Инициализация MediaPipe Hands ---
  function initializeMediaPipeHands() {
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

    // Создаем экземпляр Hands (переменная 'hands' объявлена глобально)
    hands = new Hands({locateFile: (file) => {
      // Корректный путь к WASM файлам на CDN jsdelivr
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    // Настраиваем параметры Hands
    hands.setOptions({
      maxNumHands: 2,           // Отслеживать до двух рук
      modelComplexity: 1,       // 0 = lite, 1 = full (более точная, но требовательная)
      minDetectionConfidence: 0.7, // Увеличим порог для надежности
      minTrackingConfidence: 0.7  // Увеличим порог для надежности
    });

    // Устанавливаем обработчик результатов
    hands.onResults(onHandsResults);

    async function startVideoStream(videoElement, handsInstance) {
      console.log(">>> Enumerating media devices...");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log(">>> Available video devices:", videoDevices);

      let iriunDeviceId = null;
      for (const device of videoDevices) {
          // Ищем по частичному совпадению имени 'Iriun' (регистронезависимо)
          if (device.label && device.label.toLowerCase().includes('iriun')) {
              iriunDeviceId = device.deviceId;
              console.log(`>>> Found Iriun Webcam with deviceId: ${iriunDeviceId}`);
              break; // Нашли, выходим из цикла
          }
      }

      // Если не нашли Iriun, попробуем использовать первую камеру как запасной вариант (или выдать ошибку)
      if (!iriunDeviceId && videoDevices.length > 0) {
          console.warn(">>> Iriun Webcam not found by label, falling back to the first video device.");
          // iriunDeviceId = videoDevices[0].deviceId; // Раскомментировать, если нужен fallback
      } else if (!iriunDeviceId) {
           console.error(">>> No video devices found at all!");
           alert("No video devices found!");
           return; // Выходим, если камер нет
      }

      // Если Iriun не найдена, но есть другие камеры, выдадим предупреждение
      if (!iriunDeviceId) {
           console.error(">>> Iriun Webcam device ID not found!");
           alert("Iriun Webcam not found. Please ensure it is connected and selected.");
           // Можно либо выйти (return;), либо продолжить с камерой по умолчанию,
           // но тогда нужно убрать условие deviceId из constraints ниже.
           // Пока выйдем, чтобы было понятно, что Iriun не нашлась.
           return;
      }

      try {
        // Запрашиваем видеопоток, полагаясь на настройки браузера по умолчанию
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
              deviceId: { exact: iriunDeviceId }, // Явно запрашиваем Iriun по ID
              width: { ideal: 640 },
              height: { ideal: 480 }
          }
        });
        console.log(">>> Acquired video stream via getUserMedia");
        videoElement.srcObject = stream;

        // Ждем, пока видео загрузится, чтобы получить размеры
        videoElement.onloadedmetadata = () => {
          console.log(">>> Video metadata loaded. Starting hands processing loop.");
          videoElement.play(); // Начнем воспроизведение видео (может быть нужно для send)

          // Запускаем цикл отправки кадров в MediaPipe вручную
          async function processVideoFrame() {
            if (videoElement.readyState >= 2) { // Убедимся, что есть данные кадра
              try {
                await handsInstance.send({ image: videoElement });
              } catch (handsError) {
                 console.error("Error sending frame to MediaPipe Hands:", handsError);
              }
            }
            requestAnimationFrame(processVideoFrame); // Запрашиваем следующий кадр
          }
          processVideoFrame(); // Запускаем цикл

          isGestureCanvasReady = true; // Устанавливаем флаг здесь
          console.log('Флаг isGestureCanvasReady установлен в true (после getUserMedia)');
        };

      } catch (err) {
        console.error(">>> Error acquiring camera feed via getUserMedia:", err.name, err.message);
        // Отобразим ошибку пользователю, как в Firefox
        alert(`Failed to acquire camera feed: ${err.name}: ${err.message}`);
      }
    }

    if (videoElementForHands && hands) {
         startVideoStream(videoElementForHands, hands);
    } else {
         console.error("Video element or Hands instance not ready for startVideoStream");
    }

  }

  let handMeshGroup = new THREE.Group();
  scene.add(handMeshGroup);
  handMeshGroup.scale.x = -1; // Возвращаем зеркалирование!
  handMeshGroup.scale.x = -1;
  handMeshGroup.scale.x = -1;

  // --- Обработчик результатов от MediaPipe Hands ---
  function onHandsResults(results) {
    let thumbTip, indexTip, palmBase;
    const gestureAreaElement = document.getElementById('gesture-area');
    const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    // Управляем высотой области жестов через JS
    if (gestureAreaElement) {
        const targetHeight = handsArePresent ? '25vh' : '4px'; // Целевая высота
        // Проверяем, нужно ли менять высоту
        if (gestureAreaElement.style.height !== targetHeight) {
            gestureAreaElement.style.height = targetHeight;
            console.log(`Gesture area height set to: ${targetHeight}`);
                }
    }

    if (!isGestureCanvasReady) { return; }

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
            const pointsMaterial = new THREE.PointsMaterial({ size: 4, transparent: true, opacity: 0.8, vertexColors: true });

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

            // --- НАЧАЛО БЛОКА МАСШТАБИРОВАНИЯ ТОЧЕК СКЕЛЕТА ---
            // --- КОНЕЦ БЛОКА МАСШТАБИРОВАНИЯ ТОЧЕК СКЕЛЕТА ---

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
   }

   // Обработчик для кнопки GitHub
   githubButton.addEventListener('click', () => {
     window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
   });
 });
