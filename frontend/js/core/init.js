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
  xrSessionManagerInstance: null, // Added for WebXR

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
  tria: {
    isLearningActive: false, // Used by Tria button to toggle learning/training mode
    // currentLlmModel: 'mistral-small-latest', // This could also be part of state.tria
  },
  currentLlmModel: 'mistral-small-latest', // Or keep it separate if used more broadly

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
  isChatMode: false,          // Активен ли режим чата
  isLoading: false,           // Идет ли какая-либо загрузка
  debugMode: false            // Включен ли режим отладки
};

// Импортируем функцию инициализации Three.js сцены
import { initializeScene } from '../3d/sceneSetup.js';
import { MicrophoneManager } from '../audio/microphoneManager.js';
import { AudioAnalyzer } from '../audio/audioAnalyzer.js';
import { HologramRenderer } from '../3d/hologramRenderer.js';
import { XRSessionManager } from '../xr/webxr_session_manager.js'; // Added for WebXR
import PanelManager from '../ui/panelManager.js';

// Функция для инициализации ядра приложения
export async function initCore() {
  console.log('Инициализация ядра приложения...');
  
  // Инициализируем Three.js сцену
  const sceneInitialized = initializeScene(state); // Pass state and capture return value

  if (!sceneInitialized) {
    console.error('Scene setup failed (WebGL context error likely). Halting further rendering-dependent initialization.');
    // The error overlay is displayed by initializeScene itself.
    // No need to set a global error state here unless other non-rendering parts need to know.
    return; // Stop further initialization
  }

  // At this point, scene and renderer should be initialized if sceneInitialized is true.
  // state.renderer would be null if WebGLRenderer failed.
  if (!state.renderer) {
    console.error('Renderer not available after scene initialization, though initializeScene reported success. This should not happen. Halting.');
    return;
  }
  console.log('Three.js scene and renderer successfully initialized.');

  // Instantiate HologramRenderer
  // state.hologramPivot is created in initializeScene.
  // HologramRenderer creates its own pivot and adds it to the scene.
  // This means state.hologramPivot (from initializeScene) might become unused or represent a different group.
  // For now, let HologramRenderer manage its own pivot.
  // If state.hologramPivot needs to be THE pivot, HologramRenderer's constructor would need modification.
  state.hologramRendererInstance = new HologramRenderer(state.scene);
  console.log('HologramRenderer initialized.');

  // Instantiate XRSessionManager (requires state.renderer to be initialized)
  if (state.renderer) {
    state.xrSessionManagerInstance = new XRSessionManager(state.renderer);
    console.log('XRSessionManager initialized.');
  } else {
    console.error('Renderer not available for XRSessionManager initialization.');
  }

  // Initialize PanelManager
  state.panelManager = new PanelManager();
  state.panelManager.initializePanelManager(); // Key step for immediate initialization
  console.log('PanelManager initialized and stored in state.');

  // Instantiate MicrophoneManager
  state.microphoneManagerInstance = new MicrophoneManager(); // Can pass FFT_SIZE, SMOOTHING_TIME_CONSTANT if needed from config

  // Ensure AudioContext is available
  if (!state.audio.audioContext) {
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('AudioContext created during initCore.');
  }
  if (state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().catch(e => console.error("Error resuming AudioContext in initCore:", e));
  }

  // Always instantiate AudioAnalyzer instances, initially with null analysers
  state.audioAnalyzerLeftInstance = new AudioAnalyzer(null, state.audio.audioContext);
  state.audioAnalyzerRightInstance = new AudioAnalyzer(null, state.audio.audioContext);
  console.log('AudioAnalyzer instances created with null analysers.');

  // Initialize microphone only if user has previously interacted or granted permission.
  if (localStorage.getItem('microphonePermissionRequestedOnce') === 'true' &&
      localStorage.getItem('microphonePermissionGranted') === 'true') {
    console.log('Attempting to auto-initialize microphone based on previous grant.');
    try {
      // MicrophoneManager.init() returns its own audioContext, ensure consistency or decide which one to use.
      // For now, we assume MicrophoneManager's init might re-initialize or reuse a context.
      // The important part is that it returns analyser nodes.
      const { analyserLeft, analyserRight, audioContext: micAudioContext } = await state.microphoneManagerInstance.init();

      // It's possible micAudioContext is different from state.audio.audioContext if mic manager always creates a new one.
      // This needs to be handled consistently. For now, let's assume micAudioContext should be the one used by these analysers.
      // Or, ensure MicrophoneManager can use an externally provided AudioContext.
      // Let's assume we update the global audio context if mic manager provides one:
      if (micAudioContext) state.audio.audioContext = micAudioContext;

      state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

      // Now set the analyser nodes on the existing instances
      state.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
      state.audioAnalyzerLeftInstance.audioContext = micAudioContext; // Ensure context is also updated
      state.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
      state.audioAnalyzerRightInstance.audioContext = micAudioContext; // Ensure context is also updated

      state.audio.activeSource = 'microphone';
      console.log('MicrophoneManager and AudioAnalyzers auto-initialized successfully.');
    } catch (micError) {
      console.error('Failed to auto-initialize microphone or analyzers:', micError);
      localStorage.removeItem('microphonePermissionGranted'); // Clear grant flag if auto-init fails
    }
  } else {
    console.log('Microphone initialization deferred to user action (e.g., button click).');
    // AudioAnalyzer instances are already created with null analysers.
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