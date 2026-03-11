/**
 * Обработка ошибок загрузки Three.js
 * Если Three.js не загружается, показываем подробное сообщение об ошибке
 */

// Глобальная функция для обработки ошибок Three.js
window.handleThreeJSError = function (error, context = 'unknown') {
  console.error(`🚨 КРИТИЧЕСКАЯ ОШИБКА THREE.JS [${context.toUpperCase()}]:`, error);

  const errorInfo = {
    message: error.message || 'Неизвестная ошибка',
    name: error.name || 'UnknownError',
    stack: error.stack || 'Стек недоступен',
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    webglSupport: !!document.createElement('canvas').getContext('webgl')
  };

  console.error('📋 Диагностическая информация:', errorInfo);

  // Показываем пользователю понятное сообщение
  const errorDiv = document.createElement('div');
  errorDiv.id = 'threejs-error-overlay';
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.95);
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: 'Courier New', monospace;
    z-index: 9999;
    padding: 20px;
    text-align: center;
  `;

  errorDiv.innerHTML = `
    <h1 style="color: #ff6b6b; margin-bottom: 20px;">🚨 Ошибка 3D движка</h1>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3>Не удалось загрузить Three.js</h3>
      <p>Библиотека для 3D графики не может быть инициализирована</p>
      <p><strong>Контекст ошибки:</strong> ${context}</p>
      <p><strong>Тип ошибки:</strong> ${errorInfo.name}</p>
    </div>
    <div style="margin: 20px 0;">
      <button onclick="location.reload()" style="padding:15px 30px; margin:10px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer; font-size:16px;">
        🔄 Обновить страницу
      </button>
      <button onclick="toggleErrorDetails()" style="padding:15px 30px; margin:10px; background:#2196F3; color:white; border:none; border-radius:5px; cursor:pointer; font-size:16px;">
        📋 Подробности
      </button>
    </div>
    <div id="error-details" style="display:none; margin-top:20px; text-align:left; max-width:600px; background:rgba(255,255,255,0.1); padding:15px; border-radius:5px;">
      <h4>Техническая информация:</h4>
      <pre style="font-size:12px; white-space:pre-wrap;">${JSON.stringify(errorInfo, null, 2)}</pre>
    </div>
    <script>
      function toggleErrorDetails() {
        const details = document.getElementById('error-details');
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
      }
    </script>
  `;

  document.body.appendChild(errorDiv);

  // Отправляем ошибку в систему логирования, если она есть
  if (window.errorReporting && typeof window.errorReporting === 'function') {
    window.errorReporting(errorInfo);
  }

  return errorInfo;
};

// Функция для проверки поддержки WebGL
window.checkWebGLSupport = function () {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      throw new Error('WebGL не поддерживается браузером');
    }

    // Проверяем поддержку необходимых расширений
    const requiredExtensions = ['OES_standard_derivatives', 'OES_texture_float'];
    const supportedExtensions = gl.getSupportedExtensions() || [];

    const missingExtensions = requiredExtensions.filter(ext =>
      !supportedExtensions.includes(ext)
    );

    if (missingExtensions.length > 0) {
      console.warn('Предупреждение: отсутствуют расширения WebGL:', missingExtensions);
    }

    return { supported: true, extensions: supportedExtensions };
  } catch (error) {
    return { supported: false, error: error.message };
  }
};

// Резервный динамический импорт THREE удален (используются статические импорты)
import { GestureManager } from '../managers/gestureManager.js';
import { autoReloadService } from '../services/AutoReloadService.js';
import { lightingManager } from '../ui/LightingManager.js';
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
  microphoneManagerInstance: null, // Corrected to match mediaInitializer.js
  // audioAnalyzerLeftInstance: null, // Obsolete
  // audioAnalyzerRightInstance: null, // Obsolete
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
    activeSource: 'none', // 'microphone', 'file', or 'none'
    microphoneAnalysers: null, // {left: AnalyserNode, right: AnalyserNode}
    filePlayerAnalysers: null, // {left: AnalyserNode, right: AnalyserNode}
    filePlayerGainNode: null, // GainNode for file player
  },

  // --- Состояние пользовательского интерфейса ---
  uiElements: {
    buttons: {
      microphoneButton: null,
      audioFileInput: null,
      loadAudioButton: null,
      playAudioButton: null,
      pauseAudioButton: null,
      stopAudioButton: null,
    },
    panels: {
      chatPanel: null,
      gesturePanel: null,
      hologramPanel: null,
    },
  },

  // --- Состояние мультимодального взаимодействия ---
  multimodal: {
    currentStream: null, // MediaStream from getUserMedia
    handsTracking: null,
    speechInput: null,
    webRTC: null,
  },

  // --- Состояние отладки ---
  debugMode: false,
};

// Импортируем функцию инициализации Three.js сцены
import { HologramRenderer } from '../3d/hologramRenderer.js';
import { initializeScene } from '../3d/sceneSetup.js';
import { AudioFilePlayer } from '../audio/audioFilePlayer.js'; // Added AudioFilePlayer import
import { MicrophoneManager } from '../audio/microphoneManager.js';
import PanelManager from '../ui/panelManager.js';
// import { WebAudioEngine } from '../audio/webAudioEngine.js'; // REMOVED LEGACY
import { XRSessionManager } from '../xr/webxr_session_manager.js';
import GestureUIManager from '../ui/GestureUIManager.js';
import eventBus from '../core/eventBus.js';
import { GestureCommandEngine } from '../core/GestureCommandEngine.js';
import { GestureToCodeExecutor } from '../core/GestureToCodeExecutor.js';
import { GestureLiveStudio } from '../ui/GestureLiveStudio.js';
import { TriaOrchestrator } from './TriaOrchestrator.js';
import VersionTimelinePanel from '../ui/VersionTimelinePanel.js';

export async function initCore() {
  console.log('🚀 Инициализация ядра приложения...');

  try {
    // Проверяем поддержку WebGL
    const webglCheck = window.checkWebGLSupport();
    if (!webglCheck.supported) {
      throw new Error(`WebGL не поддерживается: ${webglCheck.error}`);
    }

    const sceneInitialized = await initializeScene(state);

    if (!sceneInitialized) {
      throw new Error('Scene setup failed (WebGL context error likely)');
    }

    // This should be AFTER initializeScene(state) and its related check
    if (!state.renderer) {
      throw new Error('CRITICAL CHECK FAILED: state.renderer is null after initializeScene');
    }

    console.log('✅ Three.js сцена и рендерер успешно инициализированы');

    // Инициализируем HologramRenderer с обработкой ошибок
    try {
      state.hologramRendererInstance = new HologramRenderer(state.scene, "test_room", "user_local_test");
      console.log('✅ HologramRenderer инициализирован');
    } catch (error) {
      window.handleThreeJSError(error, 'hologram_renderer_init');
      throw error;
    }

    // Инициализируем GestureManager
    try {
      state.gestureManager = new GestureManager();

      // Инициализируем GestureManager после создания контейнера
      const gridContainer = document.getElementById('grid-container');
      if (gridContainer) {
        await state.gestureManager.init(gridContainer);
        console.log('✅ GestureManager инициализирован');
      } else {
        console.warn('⚠️ Grid container не найден для GestureManager');
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации GestureManager:', error);
      window.handleThreeJSError(error, 'gesture_manager_init');
    }

    // Инициализируем PanelManager
    try {
      state.panelManager = new PanelManager();
      state.panelManager.initializePanelManager();
      console.log('✅ PanelManager инициализирован');

      // Инициализируем панель версий
      state.versionTimelinePanel = new VersionTimelinePanel(state, eventBus);
      console.log('✅ VersionTimelinePanel инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации PanelManager/VersionTimelinePanel:', error);
    }

    // Инициализируем GestureUIManager
    try {
      state.gestureUIManager = new GestureUIManager(eventBus, state);

      // --- TRIA EVOLUTION v0.20.125: ГИПЕРМОЗГ ---
      const { TriaFileSystem } = await import('./TriaFileSystem.js');
      const { ReintegrationManager } = await import('./ReintegrationManager.js');
      const { triaPulse } = await import('./TriaPulse.js');
      const { TriaDBClientInstance } = await import('./TriaDBClient.js');
      const { HyperbrainSynthesizer } = await import('./HyperbrainSynthesizer.js');

      // 1. Инициализация Пульса (Динамический FPS + Такты 0/1)
      state.triaPulse = triaPulse;
      await state.triaPulse.init();

      // 2. Инициализация ФС (Сосуды маппятся на Тор BasilaQ)
      state.triaFS = new TriaFileSystem(state.triaPulse, TriaDBClientInstance);
      window.triaFS = state.triaFS; 

      // 3. Инициализация Реинтегратора (Сборка из хаоса)
      state.reintegrationManager = new ReintegrationManager(state.triaFS, TriaDBClientInstance);
      state.triaFS.setReintegrationManager(state.reintegrationManager);

      // 4. Инициализация Жестового Синтезатора (Одежда для жестов)
      state.gestureSynthesizer = new HyperbrainSynthesizer(state.triaFS, state.triaPulse);


      // 5. Визуализация Гипермозга (Тор памяти)
      const { TorusVOM } = await import('../3d/TorusVom.js');
      state.torusVom = new TorusVOM(state.scene, state.triaFS);

      // 6. Матка Агентов (Эмерджентность)
      const { AgentWomb } = await import('./AgentWomb.js');
      state.agentWomb = new AgentWomb(state.triaOrchestrator, state.triaFS);

      console.log('✅ Hyperbrain initialized: Pulse (dynamic), TriaFS (Torus), Reintegrator, Synthesizer, TorusVOM, AgentWomb');
      // ------------------------------------------
      // ТЗ v4.5: Инициализация Gesture Phase модулей
      state.gestureCommandEngine = new GestureCommandEngine();
      state.gestureToCodeExecutor = new GestureToCodeExecutor(state.gestureCommandEngine);
      state.gestureLiveStudio = new GestureLiveStudio(state.gestureUIManager, state.gestureCommandEngine);

      // Инициализация TriaOrchestrator
      state.triaOrchestrator = new TriaOrchestrator(null, state);

      console.log('✅ Gesture Phase modules (v4.5) initialized');
    } catch (error) {
      console.error('❌ Ошибка инициализации Gesture UI/Phase:', error);
    }

    // Инициализируем XRSessionManager
    if (state.renderer) {
      state.xrSessionManagerInstance = new XRSessionManager(state.renderer);
      console.log('✅ XRSessionManager инициализирован');
    }

    // Инициализируем аудио компоненты через AudioService (Single Source of Truth)
    try {
      const { default: audioService } = await import('../services/AudioService.js');
      await audioService.initialize();
      state.audioService = audioService; // Сохраняем в state для доступа
      console.log('✅ AudioService инициализирован');

      // state.webAudioEngine = new WebAudioEngine(); // REMOVED LEGACY

      if (!state.audio.audioContext) {
        state.audio.audioContext = audioService.getAudioContext();
        console.log('✅ AudioContext получен из AudioService');
      }
    } catch (audioError) {
      console.warn('⚠️ Ошибка инициализации AudioService/WebAudioEngine:', audioError.message);
      console.error(audioError);
    }

    // Предзагрузка CWT AudioWorklet для оптимальной производительности
    try {
      const { initializeCwtWorklet } = await import('../audio/audioProcessing.js');
      await initializeCwtWorklet(state.audio.audioContext);
      console.log('✅ CWT AudioWorklet инициализирован');
    } catch (error) {
      console.warn('⚠️ CWT Worklet не загружен. Работа приложения в режиме без аудио-анализа:', error.message);
    }

    state.microphoneManagerInstance = new MicrophoneManager(state.audio.audioContext, state);
    state.audioFilePlayerInstance = new AudioFilePlayer(state.audio.audioContext, state);

    // Инициализируем обработчики для кнопок плеера
    state.audioFilePlayerInstance.initializeAudioPlayerControls();
    console.log('✅ Обработчики аудио плеера инициализированы');

    // --- MediaPipe Hands Initialization ---
    try {
      const { initializeMediaPipeHands, startVideoStream } = await import('../multimodal/handsTracking.js');
      initializeMediaPipeHands();

      if (state.multimodal.videoElementForHands && state.multimodal.handsInstance) {
        await startVideoStream(state.multimodal.videoElementForHands, state.multimodal.handsInstance);
        console.log('✅ MediaPipe HandTracking started successfully.');
      } else {
        console.warn('⚠️ MediaPipe initialized but videoElement or handsInstance is missing.');
      }

    } catch (mpError) {
      console.error('❌ Failed to initialize MediaPipe Hands:', mpError);
    }
    // --------------------------------------

    // Обновляем размер камеры
    if (state.camera) {
      state.camera.aspect = window.innerWidth / window.innerHeight;
      state.camera.updateProjectionMatrix();
    }

    console.log('✅ Ядро приложения инициализировано успешно');
    // --- Start Auto-Reload & Lighting Managers ---
    autoReloadService.start();
    lightingManager.initialize(state);

    return state;

  } catch (error) {
    console.error('❌ Критическая ошибка в initCore:', error);
    window.handleThreeJSError(error, 'core_initialization');
    return null;
  }
}
