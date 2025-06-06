// frontend/js/core/init.js - Инициализация основного состояния и конфигурации приложения

// Глобальный объект состояния приложения
export const state = {
  // --- Состояние 3D сцены ---
  scene: null,                // Объект сцены Three.js
  camera: null,               // Камера Three.js // This is the fallback, activeCamera will be the primary
  orthoCamera: null,          // Added in Block A
  xrCamera: null,             // Added in Block A
  activeCamera: null,         // Added in Block A
  renderer: null,             // Рендерер Three.js
  hologramPivot: null,        // Опорная точка для голограммы (THREE.Group)
  gridHelper: null,           // Сетка-помощник
  ambientLight: null,         // Окружающий свет
  directionalLight: null,     // Направленный свет
  hemisphereLight: null,      // Added in previous step
  spotLight: null,            // Added in previous step
  gridPointLight: null,       // Added in previous step
  // --- Properties for new class instances ---
  microphoneManagerInstance: null,
  audioAnalyzerLeftInstance: null,
  audioAnalyzerRightInstance: null,
  hologramRendererInstance: null,

  // --- Состояние управления и взаимодействия ---
  controls: null,             // OrbitControls или другие элементы управления камерой
  raycaster: null,            // Raycaster для определения пересечений
  mouse: null,                // Вектор для позиции мыши (THREE.Vector2)
  isDragging: false,          // Флаг перетаскивания голограммы
  selectedObject: null,       // Текущий выбранный объект в сцене

  // --- Состояние жестов и MediaPipe ---
  // hands: null,                // Экземпляр MediaPipe Hands (переносим в multimodal)
  // gestureCanvas: null,        // Canvas для вывода отладочной информации жестов (переносим в multimodal)
  // gestureCanvasCtx: null,     // Контекст 2D для gestureCanvas (переносим в multimodal)
  // videoElement: null,         // Элемент <video> для захвата с камеры (переносим в multimodal)
  // handsVisible: false,        // Флаг, указывающий, видны ли руки (для调整 макета) (переносим в multimodal)
  // lastHandData: null,         // Последние полученные данные о руках (переносим в multimodal)

  // --- Состояние аудио ---
  // audioContext: null,         // Аудиоконтекст Web Audio API (переносим в audio)
  // analyser: null,             // AnalyserNode для визуализации аудио (переносим в audio)
  // microphoneStream: null,     // Поток с микрофона (переносим в audio)
  // audioSource: null,          // Источник аудио (микрофон или файл) (переносим в audio)

  // Группировка аудио состояния
  audio: {
    audioContext: null,
    microphoneStream: null,
    // analyserLeft: null, // General/fallback, or specifically for microphone if decided - Deprecating for specific ones
    // analyserRight: null, // General/fallback, or specifically for microphone if decided - Deprecating for specific ones
    audioSource: null,          // Can be the current MediaStreamAudioSourceNode or AudioBufferSourceNode
    audioBuffer: null,
    audioBufferSource: null,
    isPlaying: false,
    pausedAt: 0,
    startOffset: 0,
    activeSource: 'none',       // 'none', 'file', 'microphone'
    
    // Specific for file player (from script.js logic)
    filePlayerAnalysers: null, // Should be an object { left: AnalyserNode, right: AnalyserNode }
    filePlayerGainNode: null,

    // Specific for microphone (from script.js logic)
    microphoneAnalysers: null, // Should be an object { left: AnalyserNode, right: AnalyserNode }
    microphoneGainNode: null, 
    // analyser: null, // This might be deprecated if using specific ones below - confirmed deprecated
  },

  // Группировка мультимодального состояния
  multimodal: {
    handsInstance: null,        // Экземпляр MediaPipe Hands
    gestureCanvas: null,        // Canvas для вывода отладочной информации жестов
    gestureCanvasCtx: null,     // Контекст 2D для gestureCanvas
    videoElementForHands: null, // Элемент <video> для захвата с камеры для рук
    handsVisible: false,        // Флаг, указывающий, видны ли руки
    lastHandData: null,         // Последние полученные данные о руках
    handSpheres: { left: [], right: [] }, // Массив для хранения сфер рук
    isGestureCanvasReady: false, // Флаг готовности gestureCanvas
    currentStream: null,        // Текущий поток с камеры для рук
    handMeshGroup: null,        // Группа для отображения мешей рук в 3D сцене
  },

  // --- Состояние AI (Триа) ---
  isTriaModeActive: false,    // Активен ли режим Триа
  currentLlmModel: 'mistral-small-latest', // Текущая используемая LLM модель

  // --- Состояние NetHoloGlyph ---
  nethologlyph: {
    // Manages the state of the NetHoloGlyph client-side connection and data
    connectionStatus: 'disconnected', // e.g., 'disconnected', 'connecting', 'connected', 'error'
    currentSymbols: [], // Array to hold currently active/received holographic symbols
    serverUrl: 'ws://localhost:8001/ws/hologlyph/', // Default server URL, might be configurable
    clientId: 'user-' + Date.now(), // Example client ID
    error: null, // To store any connection or protocol errors
    // TODO: Add more specific state fields as NetHoloGlyph client develops
    // e.g., subscribed_topics: [], last_received_message_timestamp: null
  },

  // --- Состояние HoloGraph Economy ---
  holograph: {
    // Manages state related to the HoloGraph economy and DAO interactions
    userTokenBalance: 0, // User's HGT balance (fetched from a wallet or backend)
    daoProposals: [], // Array of DAO proposals fetched from backend/blockchain
    walletConnected: false, // Status of user's crypto wallet connection
    walletAddress: null, // User's wallet address
    lastTransactionStatus: null, // e.g., 'pending', 'success', 'failed'
    // TODO: Add more specific state fields as HoloGraph integration develops
    // e.g., staking_info: {}, intellectual_mining_rewards_pending: 0
  },

  // --- Конфигурация приложения (может загружаться извне) ---
  config: {
    GRID: { // Параметры для gridHelper и, возможно, других элементов
      WIDTH: 130, // Ширина основной части голограммы (условно)
      HEIGHT: 260 // Высота основной части голограммы (условно)
    },
    CAMERA: {
      fov: 75,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      initialPosition: { x: 0, y: 1.6, z: 5 } // Примерная начальная позиция
    },
    MAX_TEXTURE_SIZE: 2048, // Максимальный размер текстуры для WebGL
    // Другие параметры конфигурации...
  },

  // --- Прочее состояние ---
  isPanelsHidden: false,      // Скрыты ли боковые панели
  isChatMode: false,          // Активен ли режим чата
  isLoading: false,           // Идет ли какая-либо загрузка
  debugMode: false            // Включен ли режим отладки
};

// Импортируем функцию инициализации Three.js сцены
import { initializeScene } from '../3d/sceneSetup.js';
import { MicrophoneManager } from '../audio/microphoneManager.js';
import { AudioAnalyzer } from '../audio/audioAnalyzer.js';
import { HologramRenderer } from '../3d/hologramRenderer.js';

// Функция для инициализации ядра приложения
export async function initCore() {
  console.log('Инициализация ядра приложения...');
  
  // Инициализируем Three.js сцену
  try {
    // initializeScene теперь напрямую модифицирует объект state
    initializeScene(state); // Pass state to initializeScene
    
    console.log('Three.js сцена успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации Three.js сцены:', error);
    // Fallback might not be useful if scene itself failed to init
    // Consider if the app can run without a scene. If not, maybe rethrow or set a global error state.
  }

  // Proceed with other initializations only if scene is available
  if (!state.scene) {
    console.error('Scene not initialized, cannot proceed with Hologram and Audio setup.');
    return; 
  }

  // Instantiate HologramRenderer
  // state.hologramPivot is created in initializeScene.
  // HologramRenderer creates its own pivot and adds it to the scene.
  // This means state.hologramPivot (from initializeScene) might become unused or represent a different group.
  // For now, let HologramRenderer manage its own pivot.
  // If state.hologramPivot needs to be THE pivot, HologramRenderer's constructor would need modification.
  state.hologramRendererInstance = new HologramRenderer(state.scene);
  console.log('HologramRenderer initialized.');

  // Instantiate MicrophoneManager
  state.microphoneManagerInstance = new MicrophoneManager(); // Can pass FFT_SIZE, SMOOTHING_TIME_CONSTANT if needed from config

  // Initialize microphone only if user has previously interacted or granted permission.
  // This check prevents unsolicited permission prompts on page load.
  // A UI element (e.g., a "Start Microphone" button) should handle the initial call
  // to a function that includes microphoneManagerInstance.init() and sets this flag.
  if (localStorage.getItem('microphonePermissionRequestedOnce') === 'true' &&
      localStorage.getItem('microphonePermissionGranted') === 'true') { // Example of a more refined check
    // Optionally, could attempt to query permission status API first if available.
    // For now, rely on a flag set after first user-initiated attempt.
    console.log('Attempting to auto-initialize microphone based on previous grant.');
    try {
      const { analyserLeft, analyserRight, audioContext } = await state.microphoneManagerInstance.init();

      state.audio.audioContext = audioContext;
      state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };
      state.audioAnalyzerLeftInstance = new AudioAnalyzer(analyserLeft, audioContext);
      state.audioAnalyzerRightInstance = new AudioAnalyzer(analyserRight, audioContext);
      state.audio.activeSource = 'microphone';
      console.log('MicrophoneManager and AudioAnalyzers auto-initialized successfully.');
    } catch (micError) {
      console.error('Failed to auto-initialize microphone or analyzers:', micError);
      localStorage.removeItem('microphonePermissionGranted'); // Clear grant flag if auto-init fails
    }
  } else {
    console.log('Microphone initialization deferred to user action (e.g., button click).');
    // Ensure audio analyzers are instantiated, even if with null analysers,
    // so that calls to them don't fail, but they won't process audio until an analyser is set.
    // This might require AudioAnalyzer to handle null initially or be instantiated later.
    // For simplicity here, we assume they are either robust to null analysers or
    // will be properly initialized when the microphone is actually started by user action.
    // The init() of MicrophoneManager itself updates state.audioAnalyzerLeft/RightInstance.setAnalyserNode().
    // So, they will be correctly configured when mic is truly started.
  }
  
  // Установка начального аспекта камеры (если не было установлено в initializeThreeJSScene)
  // This might be redundant if initializeScene handles it correctly with window resize listeners.
  if (state.camera) {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
  }
  // This check for renderer parent might also be redundant if initializeScene appends it.
  if (state.renderer && !state.renderer.domElement.parentElement) {
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer) {
      // Ensure container is empty before appending, if initializeScene didn't do it
      // gridContainer.innerHTML = ''; 
      gridContainer.appendChild(state.renderer.domElement);
    } else {
        // Fallback handled in initializeScene, but good to be aware.
        console.warn("Grid container not found during initCore fallback renderer append.");
    }
  }
  console.log('Ядро приложения инициализировано.', state);
}

// Можно добавить функции для обновления частей state, если это необходимо глобально
// export function updateCameraAspect(aspect) {
//   if (state.camera) {
//     state.camera.aspect = aspect;
//     state.camera.updateProjectionMatrix();
//   }
// }

// Инициализация базовых объектов состояния (может быть расширено в других модулях)
export function initializeState() {
  // Здесь можно добавить логику инициализации, если требуется
  console.log('Initial state:', state);
}

// Пример использования (для демонстрации или отладки)
// import { state } from './init.js';
// state.scene = new THREE.Scene();