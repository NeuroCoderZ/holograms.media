// frontend/js/core/init.js - Инициализация основного состояния и конфигурации приложения

import * as THREE from 'three';
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
  microphoneManagerInstance: null, // Corrected to match mediaInitializer.js
  audioAnalyzerLeftInstance: null,
  audioAnalyzerRightInstance: null,
  hologramRendererInstance: null,
  xrSessionManagerInstance: null, // Added for WebXR
  audioFilePlayerInstance: null, // Corrected to match mediaInitializer.js

  // --- Состояние управления и взаимодействия ---
  controls: null,             // OrbitControls или другие элементы управления камерой
  raycaster: null,            // Raycaster для определения пересечений
  mouse: null,                // Вектор для позиции мыши (THREE.Vector2)
  isDragging: false,          // Флаг перетаскивания голограммы
  selectedObject: null,       // Текущий выбранный объект в сцене

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
    activeSource: 'microphone',
    
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
    previousHandsVisible: false, // Added for tracking hand presence changes
    handOpacity: 0, // Added for fade animations
    handOpacityTween: null, // Stores the TWEEN object for hand opacity
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
  
  const sceneInitialized = await initializeScene(state);

  if (!sceneInitialized) {
    console.error('Scene setup failed (WebGL context error likely). Halting further rendering-dependent initialization.');
    return;
  }

  // This should be AFTER initializeScene(state) and its related check
  if (!state.renderer) {
    console.error('CRITICAL CHECK FAILED: state.renderer is null after initializeScene. Halting core initialization because scene setup failed (WebGL context unavailable).');
    // Display a user-friendly message on the page if possible, similar to sceneSetup.js
    // This could be a simplified version or a call to a shared error display function if available.
    // For now, the console error is the primary requirement.
    // Optionally, you can try to show the same modal if it exists:
    const errorModal = document.getElementById('webgl-error-modal');
    if (errorModal) {
        const errorMessageElement = errorModal.querySelector('.error-message-details');
        if(errorMessageElement && !errorMessageElement.textContent) { // Show if not already populated by sceneSetup
            errorMessageElement.textContent = 'WebGL context could not be created. Core app initialization halted.';
        }
        errorModal.style.display = 'flex';
    }
    return; // Полностью прекращаем дальнейшее выполнение initCore
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
  state.microphoneManagerInstance = new MicrophoneManager(state.audio.audioContext, state); // Corrected name
  state.audioFilePlayerInstance = new AudioFilePlayer(state.audio.audioContext, state); // Corrected name

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

  // Removed auto-initialization of microphone here, it's now handled by initializeMultimedia on user action (or by explicit call in main.js)
  // The check for localStorage.getItem('microphonePermissionRequestedOnce') should be in initializeMultimedia or its caller
  console.log('Microphone and AudioFilePlayer instances initialized, auto-initialization logic for microphone moved.');
  
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
