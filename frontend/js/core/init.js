// frontend/js/core/init.js - Инициализация основного состояния и конфигурации приложения

import { semitones } from '../config/hologramConfig.js';

// Глобальный объект состояния приложения
export const state = {
  // --- Состояние 3D сцены ---
  scene: null,                // Объект сцены Three.js
  camera: null,               // Камера Three.js // This is the fallback, activeCamera will be the primary
  orthoCamera: null,          // Added in Block A
  xrCamera: null,             // Added in Block A
  activeCamera: null,         // Added in Block A
  renderer: null,
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
  audio: {
    audioContext: null,
    microphoneStream: null,
    audioSource: null,
    audioBuffer: null,
    audioBufferSource: null,
    isPlaying: false,
    pausedAt: 0,
    startOffset: 0,
    activeSource: 'microphone', // 'none', 'file', 'microphone'
    
    // Specific for file player (from script.js logic)
    filePlayerAnalysers: null,
    filePlayerGainNode: null,

    // Specific for microphone (from script.js logic)
    microphoneAnalysers: null,
    microphoneGainNode: null,

    // Data processed by WASM module
    currentDbLevels: new Float32Array(260).fill(-100.0), // 130 Left, 130 Right
    currentPanAngles: new Float32Array(130).fill(0.0), // 130 Pan angles
    targetFrequencies: semitones.map(s => s.f), // Frequencies for WASM CWT
  },

  // Группировка мультимодального состояния
  multimodal: {
    handsInstance: null,
    gestureCanvas: null,
    gestureCanvasCtx: null,
    videoElementForHands: null,
    handsVisible: false,
    lastHandData: null,
    handSpheres: { left: [], right: [] },
    isGestureCanvasReady: false,
    currentStream: null,
    handMeshGroup: null,
  },

  // --- Состояние AI (Триа) ---
  tria: {
    isLearningActive: false,
  },
  currentLlmModel: 'mistral-small-latest',

  // --- Состояние NetHoloGlyph ---
  nethologlyph: {
    connectionStatus: 'disconnected',
    currentSymbols: [],
    serverUrl: 'ws://localhost:8001/ws/hologlyph/',
    clientId: 'user-' + Date.now(),
    error: null,
  },

  // --- Состояние HoloGraph Economy ---
  holograph: {
    userTokenBalance: 0,
    daoProposals: [],
    walletConnected: false,
    walletAddress: null,
    lastTransactionStatus: null,
  },

  // --- Конфигурация приложения (может загружаться извне) ---
  config: {
    GRID: {
      WIDTH: 130,
      HEIGHT: 260,
      DEPTH: 130, // Updated to 130 for Z-scale
    },
    CAMERA: {
      fov: 75,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      initialPosition: { x: 0, y: 1.6, z: 5 }
    },
    MAX_TEXTURE_SIZE: 2048,
  },

  // --- Прочее состояние ---
  isChatMode: false,
  isLoading: false,
  debugMode: false,
};

// Импортируем функцию инициализации Three.js сцены
import { initializeScene } from '../3d/sceneSetup.js';
import { MicrophoneManager } from '../audio/microphoneManager.js';
import { AudioFilePlayer } from '../audio/audioFilePlayer.js'; // Added AudioFilePlayer import
import { HologramRenderer } from '../3d/hologramRenderer.js';
import { XRSessionManager } from '../xr/webxr_session_manager.js';
import PanelManager from '../ui/panelManager.js';

export async function initCore() {
  console.log('Инициализация ядра приложения...');
  
  const sceneInitialized = initializeScene(state);

  if (!sceneInitialized) {
    console.error('Scene setup failed (WebGL context error likely). Halting further rendering-dependent initialization.');
    return;
  }

  if (!state.renderer) {
    console.error('Renderer not available after scene initialization, though initializeScene reported success. This should not happen. Halting.');
    return;
  }
  console.log('Three.js scene and renderer successfully initialized.');

  state.hologramRendererInstance = new HologramRenderer(state.scene);
  console.log('HologramRenderer initialized.');

  if (state.renderer) {
    state.xrSessionManagerInstance = new XRSessionManager(state.renderer);
    console.log('XRSessionManager initialized.');
  } else {
    console.error('Renderer not available for XRSessionManager initialization.');
  }

  state.panelManager = new PanelManager();
  state.panelManager.initializePanelManager();
  console.log('PanelManager initialized and stored in state.');

  // Create and store MicrophoneManager and AudioFilePlayer instances in state
  state.microphoneManager = new MicrophoneManager(state.audio.audioContext, state);
  state.audioFilePlayer = new AudioFilePlayer(state.audio.audioContext, state);

  if (!state.audio.audioContext) {
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('AudioContext created during initCore.');
  }
  if (state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().catch(e => console.error("Error resuming AudioContext in initCore:", e));
  }

  // Deprecating AudioAnalyzer instances as WASM now handles processing
  // state.audioAnalyzerLeftInstance = new AudioAnalyzer(null, state.audio.audioContext);
  // state.audioAnalyzerRightInstance = new AudioAnalyzer(null, state.audio.audioContext);
  // console.log('AudioAnalyzer instances created with null analysers.');

  if (localStorage.getItem('microphonePermissionRequestedOnce') === 'true' &&
      localStorage.getItem('microphonePermissionGranted') === 'true') {
    console.log('Attempting to auto-initialize microphone based on previous grant.');
    try {
      const { stream, audioContext: micAudioContext } = await state.microphoneManagerInstance.init(); // Adjusted to get stream

      if (micAudioContext) state.audio.audioContext = micAudioContext;

      // Pass the stream to audioProcessing.setupAudioProcessing directly
      // Analysers are no longer needed from MicrophoneManager directly for WASM path
      if (stream) {
        const { setupAudioProcessing } = await import('../audio/audioProcessing.js');
        await setupAudioProcessing(state.audio.audioContext.createMediaStreamSource(stream), 'microphone');
      }

      state.audio.activeSource = 'microphone';
      console.log('MicrophoneManager auto-initialized and WASM processing set up successfully.');
    } catch (micError) {
      console.error('Failed to auto-initialize microphone or set up WASM processing:', micError);
      localStorage.removeItem('microphonePermissionGranted');
    }
  } else {
    console.log('Microphone initialization deferred to user action (e.g., button click).');
  }
  
  if (state.camera) {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
  }
  if (state.renderer && !state.renderer.domElement.parentElement) {
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer) {
      gridContainer.appendChild(state.renderer.domElement);
    } else {
        console.warn("Grid container not found during initCore fallback renderer append.");
    }
  }
  console.log('Ядро приложения инициализировано.', state);
}

export function initializeState() {
  console.log('Initial state:', state);
}
