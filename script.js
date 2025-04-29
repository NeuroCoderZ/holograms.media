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

// --- Three.js Core Variables ---
let renderer = null;
let orthoCamera = null;
let xrCamera = null;
let activeCamera = null;

// --- UI Elements ---
let telegramLinkButton = null;
let micButton = null;
let togglePanelsButton = null;
let handMeshGroup = new THREE.Group();

// --- Hand Tracking Constants ---
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // index
    [0, 9], [9, 10], [10, 11], [11, 12], // middle
    [0, 13], [13, 14], [14, 15], [15, 16], // ring
    [0, 17], [17, 18], [18, 19], [19, 20] // pinky
];

// --- Grid Creation Functions ---
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
    
    // Create grid lines
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

// --- Finger Tracking Setup ---
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

// --- UI Initialization ---
function initializeUI() {
    // Get all UI elements
    telegramLinkButton = document.getElementById('telegramLinkButton');
    micButton = document.getElementById('micButton');
    togglePanelsButton = document.getElementById('togglePanelsButton');
    
    // Add event listeners
    if (telegramLinkButton) {
        telegramLinkButton.addEventListener('click', () => {
            window.open('https://t.me/+WjtL4ipr-yljNGRi', '_blank', 'noopener,noreferrer');
        });
    }
    
    if (micButton) {
        micButton.addEventListener('click', () => {
            if (!audioContext || audioContext.state === 'closed') {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            setupMicrophone();
        });
    }
    
    if (togglePanelsButton) {
        togglePanelsButton.addEventListener('click', togglePanels);
    }
}

// --- Scene Setup ---
function setupScene() {
    // Create renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        logarithmicDepthBuffer: true
    });
    
    // Set renderer size and properties
    const availableWidth = window.innerWidth - getPanelWidths();
    const availableHeight = window.innerHeight;
    renderer.setSize(availableWidth, availableHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Add renderer to DOM
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer) {
        gridContainer.appendChild(renderer.domElement);
    }
    
    // Create cameras
    const aspect = availableWidth / availableHeight;
    orthoCamera = new THREE.OrthographicCamera(
        -availableWidth / 2,
        availableWidth / 2,
        availableHeight / 2,
        -availableHeight / 2,
        -10000,
        10000
    );
    orthoCamera.position.set(0, 0, 1200);
    orthoCamera.lookAt(0, 0, 0);
    
    xrCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 10000);
    xrCamera.position.set(0, 0, 0);
    xrCamera.lookAt(new THREE.Vector3(0, 0, -1));
    
    // Set active camera
    activeCamera = orthoCamera;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Add main sequencer groups
    scene.add(hologramPivot);
    hologramPivot.add(mainSequencerGroup);
    mainSequencerGroup.add(leftSequencerGroup, rightSequencerGroup);
    
    // Initialize columns
    initializeColumns();
}

// --- Setup Functions ---
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

function setupRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return renderer;
}

function setupLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
}

function setupHologram(scene) {
    const loader = new GLTFLoader();
    loader.load('models/hologram.glb', (gltf) => {
        const model = gltf.scene;
        hologramPivot.add(model);
        scene.add(hologramPivot);
        
        // Set initial scale based on window size
        const targetWidth = window.innerWidth * TARGET_WIDTH_PERCENTAGE;
        const boundingBox = new THREE.Box3().setFromObject(model);
        const modelWidth = boundingBox.max.x - boundingBox.min.x;
        const scale = targetWidth / modelWidth;
        model.scale.set(scale, scale, scale);
    });
}

// --- Audio Setup Functions ---
function setupAudioContext() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioGainNode = audioContext.createGain();
    audioGainNode.connect(audioContext.destination);
    return audioContext;
}

async function setupMicrophone(audioContext) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentStream = stream;
        
        const source = audioContext.createMediaStreamSource(stream);
        const splitter = audioContext.createChannelSplitter(2);
        
        microphoneAnalyserLeft = audioContext.createAnalyser();
        microphoneAnalyserRight = audioContext.createAnalyser();
        
        microphoneAnalyserLeft.fftSize = FFT_SIZE;
        microphoneAnalyserRight.fftSize = FFT_SIZE;
        microphoneAnalyserLeft.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
        microphoneAnalyserRight.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
        
        source.connect(splitter);
        splitter.connect(microphoneAnalyserLeft, 0);
        splitter.connect(microphoneAnalyserRight, 1);
        
        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        return false;
    }
}

// --- WebSocket Setup ---
function setupWebSocket() {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket connection closed');
        setTimeout(() => setupWebSocket(), 1000); // Attempt to reconnect after 1 second
    };
    
    return ws;
}

// --- Utility Functions ---
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function calculateFrequency(note, octave) {
    const noteIndex = NOTES.indexOf(note);
    const semitones = noteIndex + (octave - STARTING_OCTAVE) * NOTES_PER_OCTAVE;
    return BASE_FREQUENCY * Math.pow(2, semitones / NOTES_PER_OCTAVE);
}

function getColorForFrequency(frequency) {
    const minFreq = calculateFrequency('C', STARTING_OCTAVE);
    const maxFreq = calculateFrequency('B', STARTING_OCTAVE + 3);
    const t = (frequency - minFreq) / (maxFreq - minFreq);
    const hue = lerp(START_HUE, END_HUE, t);
    return hslToHex(hue, SATURATION * 100, LIGHTNESS * 100);
}

// --- Animation Functions ---
function updateTrail(currentPosition, trailPoints) {
    const currentTime = Date.now();
    
    // Add new point
    trailPoints.push({
        position: currentPosition.clone(),
        timestamp: currentTime
    });
    
    // Remove old points
    while (trailPoints.length > 0 && currentTime - trailPoints[0].timestamp > TRAIL_DURATION) {
        trailPoints.shift();
    }
}

function createTrailGeometry(trailPoints) {
    const positions = [];
    const colors = [];
    const currentTime = Date.now();
    
    for (let i = 0; i < trailPoints.length; i++) {
        const point = trailPoints[i];
        const age = (currentTime - point.timestamp) / TRAIL_DURATION;
        const alpha = 1 - age;
        
        positions.push(point.position.x, point.position.y, point.position.z);
        colors.push(1, 1, 1, alpha);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    
    return geometry;
}

// --- Event Handlers ---
function handleWebSocketMessage(data) {
    if (data.type === 'gesture') {
        // Handle gesture data
        updateHologramPosition(data.x, data.y, data.z);
    } else if (data.type === 'audio') {
        // Handle audio data
        updateAudioVisualization(data.frequencies);
    }
}

function updateHologramPosition(x, y, z) {
    if (hologramPivot) {
        hologramPivot.position.set(x, y, z);
    }
}

function updateAudioVisualization(frequencies) {
    // Implementation for audio visualization
    // This would update the visual elements based on the audio frequencies
}

// --- Resize Handler ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update hologram scale
    if (hologramPivot.children.length > 0) {
        const model = hologramPivot.children[0];
        const targetWidth = window.innerWidth * TARGET_WIDTH_PERCENTAGE;
        const boundingBox = new THREE.Box3().setFromObject(model);
        const modelWidth = boundingBox.max.x - boundingBox.min.x;
        const scale = targetWidth / modelWidth;
        model.scale.set(scale, scale, scale);
    }
}

// --- Main Animation Loop ---
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
}

// --- Panel Management ---
function togglePanels() {
    const leftPanel = document.querySelector('.panel.left-panel');
    const rightPanel = document.querySelector('.panel.right-panel');
    const togglePanelsButton = document.getElementById('togglePanelsButton');
    
    if (!leftPanel || !rightPanel || !togglePanelsButton) {
        console.error('Required elements not found for togglePanels');
        return;
    }
    
    const willBeHidden = !leftPanel.classList.contains('hidden');
    console.log('Toggling panels, willBeHidden:', willBeHidden);
    
    // Move button to body if not already there
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

// --- File Management ---
async function fetchAndStoreFile(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
        }
        const content = await response.text();
        fileContents[filename] = content;
        console.log(`Содержимое ${filename} загружено.`);
        
        // Scroll version timeline to bottom
        const timelineContainer = document.getElementById('versionTimeline');
        if (timelineContainer) {
            requestAnimationFrame(() => {
                timelineContainer.scrollTop = timelineContainer.scrollHeight;
                console.log("Timeline scrolled to bottom.");
            });
        }
    } catch (error) {
        console.error(`Не удалось загрузить ${filename}:`, error);
        fileContents[filename] = `// Ошибка загрузки ${filename}\n${error}`;
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
                    fileContentTextAreaElement.dataset.currentFile = fileName;
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

// --- Version Management ---
async function updateTimelineFromServer() {
    try {
        const response = await axios.get(`/branches/${currentBranch}`);
        const versions = response.data.versions;
        const versionFrames = document.getElementById('versionFrames');
        versionFrames.innerHTML = '';

        versions.reverse();
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
    } catch (error) {
        console.error('Ошибка загрузки версий:', error);
        alert('Не удалось загрузить версии с сервера');
    }
}

async function switchToVersion(versionId, branch) {
    try {
        const response = await axios.put(`/branches/${branch}/switch`, {
            version_id: versionId
        });
        console.log('Переключено на версию:', versionId, 'Данные:', response.data);

        // Apply saved background color
        scene.background = new THREE.Color(0x000000);
        console.log(`Цвет фона установлен на #000000`);

        const files = response.data.files;
        if (files && typeof files['generated_code.js'] === 'string') {
            const fileContentTextArea = document.getElementById('fileContent');
            const fileList = document.getElementById('fileList');

            if (fileContentTextArea) {
                fileContentTextArea.value = files['generated_code.js'];
                fileContentTextArea.dataset.currentFile = 'generated_code.js';
                console.log("Отображен сгенерированный код 'generated_code.js'.");

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
                fileList.querySelectorAll('li').forEach(item => {
                    item.style.fontWeight = item.dataset.file === 'generated_code.js' ? 'bold' : 'normal';
                });
            }
        }

        const scene_state = response.data.scene_state;
        if (scene_state && typeof scene_state === 'object' && Object.keys(scene_state).length > 0) {
            if (!scene_state.metadata || !scene_state.geometries || !scene_state.materials) {
                console.warn(`Пропуск применения состояния для версии ${versionId}: отсутствуют необходимые поля metadata/geometries/materials.`);
                return;
            }

            const loader = new THREE.ObjectLoader();
            try {
                const parsedData = loader.parse(scene_state);
                console.log("Scene state parsed successfully:", parsedData);

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

// --- MediaPipe Hands Initialization ---
function initializeMediaPipeHands() {
    if (typeof Hands === 'undefined') {
        console.error('Библиотека MediaPipe Hands не загружена. Проверьте подключение скриптов в HTML.');
        return;
    }
    console.log("Инициализация MediaPipe Hands...");

    const videoElementForHands = document.getElementById('camera-view');
    if (!videoElementForHands) {
        console.error("Видео элемент #camera-view не найден в DOM.");
        return;
    }

    hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onHandsResults);

    async function startVideoStream(videoElement, handsInstance) {
        console.log(">>> Enumerating media devices...");
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log(">>> Available video devices:", videoDevices);

        let iriunDeviceId = null;
        for (const device of videoDevices) {
            if (device.label && device.label.toLowerCase().includes('iriun')) {
                iriunDeviceId = device.deviceId;
                console.log(`>>> Found Iriun Webcam with deviceId: ${iriunDeviceId}`);
                break;
            }
        }

        if (!iriunDeviceId && videoDevices.length > 0) {
            console.warn(">>> Iriun Webcam not found by label, falling back to the first video device.");
        } else if (!iriunDeviceId) {
            console.error(">>> No video devices found at all!");
            alert("No video devices found!");
            return;
        }

        if (!iriunDeviceId) {
            console.error(">>> Iriun Webcam device ID not found!");
            alert("Iriun Webcam not found. Please ensure it is connected and selected.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: iriunDeviceId },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            console.log(">>> Acquired video stream via getUserMedia");
            videoElement.srcObject = stream;

            videoElement.onloadedmetadata = () => {
                console.log(">>> Video metadata loaded. Starting hands processing loop.");
                videoElement.play();

                async function processVideoFrame() {
                    if (videoElement.readyState >= 2) {
                        try {
                            await handsInstance.send({ image: videoElement });
                        } catch (handsError) {
                            console.error("Error sending frame to MediaPipe Hands:", handsError);
                        }
                    }
                    requestAnimationFrame(processVideoFrame);
                }
                processVideoFrame();

                isGestureCanvasReady = true;
                console.log('Флаг isGestureCanvasReady установлен в true (после getUserMedia)');
            };
        } catch (err) {
            console.error(">>> Error acquiring camera feed via getUserMedia:", err.name, err.message);
            alert(`Failed to acquire camera feed: ${err.name}: ${err.message}`);
        }
    }

    if (videoElementForHands && hands) {
        startVideoStream(videoElementForHands, hands);
    } else {
        console.error("Video element or Hands instance not ready for startVideoStream");
    }
}

// --- Hand Results Processing ---
function onHandsResults(results) {
    const gestureAreaElement = document.getElementById('gesture-area');
    const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    if (gestureAreaElement) {
        const targetHeight = handsArePresent ? '25vh' : '4px';
        if (gestureAreaElement.style.height !== targetHeight) {
            gestureAreaElement.style.height = targetHeight;
            console.log(`Gesture area height set to: ${targetHeight}`);
            updateHologramLayout(handsArePresent);
        }
    }

    if (!isGestureCanvasReady) { return; }

    handMeshGroup.clear();

    if (results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            if (!landmarks) continue;

            const handPoints3D = landmarks.map(lm => {
                let worldX = (lm.x - 0.5) * (GRID_WIDTH * 2);
                let worldY = (1 - lm.y) * GRID_HEIGHT;
                let worldZ = THREE.MathUtils.clamp(lm.z * GRID_DEPTH * 1.5 - GRID_DEPTH / 4, -GRID_DEPTH / 2, GRID_DEPTH / 2);
                return new THREE.Vector3(worldX, worldY, worldZ);
            });

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, linewidth: 3 });
            const pointsMaterial = new THREE.PointsMaterial({ size: 4, transparent: false, opacity: 1.0, vertexColors: true });

            const linesGeometry = new THREE.BufferGeometry().setFromPoints(HAND_CONNECTIONS.flatMap(conn => {
                const p1 = handPoints3D[conn[0]];
                const p2 = handPoints3D[conn[1]];
                return (p1 && p2) ? [p1, p2] : [];
            }));
            const pointsGeometry = new THREE.BufferGeometry().setFromPoints(handPoints3D.filter(p => p));

            const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
            const greenColor = new THREE.Color("#00cc00");
            const whiteColor = new THREE.Color("#ffffff");
            const positions = pointsGeometry.attributes.position;
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
            }

            if (linesGeometry.attributes.position && linesGeometry.attributes.position.count > 0) {
                const lines = new THREE.LineSegments(linesGeometry, lineMaterial);
                handMeshGroup.add(lines);
            }
            if (pointsGeometry.attributes.position && pointsGeometry.attributes.position.count > 0) {
                const points = new THREE.Points(pointsGeometry, pointsMaterial);
                handMeshGroup.add(points);
            }
        }
    }

    const gestureArea = document.getElementById('gesture-area');
    if (!gestureArea) return;

    gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

            fingerTips.forEach(tip => {
                const dot = document.createElement('div');
                dot.className = 'finger-dot-on-line';
                const gestureAreaHeight = gestureArea.clientHeight;
                const topPosition = tip.y * gestureAreaHeight;
                const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5);
                dot.style.top = `${topPosition - 3}px`;
                dot.style.transform = `scale(${scale})`;
                gestureArea.appendChild(dot);
            });
        }
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('>>> DOMContentLoaded fired');
    
    // Initialize all UI elements and event handlers
    initializeUI();
    
    // Setup Three.js scene
    setupScene();
    
    // Initialize MediaPipe Hands
    initializeMediaPipeHands();
    
    // Start animation loop
    animate();
    
    // Load initial files and setup editor
    loadInitialFilesAndSetupEditor();
    
    // Update timeline from server
    updateTimelineFromServer();
}); 