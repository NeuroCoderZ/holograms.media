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
import * as THREE from 'three';
window.THREE = THREE; // Для совместимости с XR-модулями (TorusVom и др.)

import { semitones } from '../config/hologramConfig.js';

// ═══ Torus Geometry Constants (Canonical v2.0) ═══
export const TORUS_PARAMS = {
    H_Y: 3.44,      // высота (Y): 3440мм / 128 ячеек = 26.875мм/ячейка
    D_Z: 1.72,      // глубина (Z): 1720мм / 128 ячеек = 13.4мм/ячейка
    R_in: 1.0,      // внутренний радиус = размах одной руки
    // Угловой шаг по X (при среднем радиусе 1.86м):
    // arc = 2π×1860мм / 256 ≈ 45.7мм/ячейка
    N_Y: 128,       // ячеек по вертикали
    N_Z: 128,       // ячеек по глубине  
    N_X: 256,       // угловых позиций
    TOTAL_VOXELS: 4_194_304  // 128*128*256
};
// В WebXR: 1 unit = 1 метр. Тор создавать с РЕАЛЬНЫМИ значениями выше.

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
    latestAudioData: null, // Fallback audio data for hologram renderer
    isPlaying: false,
    isPaused: false,
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
import { IntentAccumulator } from '../gestures/IntentAccumulator.js';
import { GestureSemanticLayer } from '../gestures/GestureSemanticLayer.js';
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
      state.hyperbrainSynthesizer = new HyperbrainSynthesizer(state.triaFS, state.triaPulse);


      // 5. Визуализация Гипермозга (Тор памяти)
      const { TorusVOM } = await import('../3d/TorusVom.js');
      state.torusVom = new TorusVOM(state.scene, state.triaFS);

      // 6. Матка Агентов (Эмерджентность)
      const { AgentWomb } = await import('./AgentWomb.js');
      state.agentWomb = new AgentWomb(state.triaOrchestrator, state.triaFS);

      console.log('✅ Hyperbrain initialized: Pulse (dynamic), TriaFS (Torus), Reintegrator, Synthesizer, TorusVOM, AgentWomb');
      
      // --- TRIA EVOLUTION v0.20.125: Web3 & P2P Integration (Stage 1) ---
      const { TriaMemory } = await import('../tria/TriaMemory.js');
      const { LocalChain } = await import('../tria/LocalChain.js');
      const { MaturityDaemon } = await import('../tria/MaturityDaemon.js');
      const { hermaionWallet } = await import('../tria/HermaionWallet.js');
      const { default: GestureVectorStore } = await import('../tria/GestureVectorStore.js');

      // 7. Инициализация Памяти (Hippocampus)
      state.triaMemory = new TriaMemory();
      await state.triaMemory.init();

      // --- ENKEPHALON WASM BRIDGE ---
      try {
          const { enkephalon } = await import('./EnkephalonBridge.js');
          
          // Загружаем Enkephalon WASM (holographic_core с brain_* функциями)
          let wasmExports = null;
          try {
              // Load from public/wasm/ using wasm_loader pattern
              const { loadWasmModule } = await import('../wasm/wasm_loader.js');
              wasmExports = await loadWasmModule('holographic_core_bg.wasm');
              console.log('[Enkephalon] WASM loaded via wasm_loader');
          } catch (wasmErr) {
              console.warn('[Enkephalon] WASM load failed:', wasmErr.message);
          }

              if (wasmExports) {
                enkephalon.init(wasmExports);
                state.enkephalon = enkephalon;
                
                state.intentAccumulator = new IntentAccumulator({
                    intentDim: 25,
                    threshold: 0.75,
                    decayFast: 0.60
                });
                state.gestureSemanticLayer = new GestureSemanticLayer();
                
                state.intentAccumulator.addEventListener('intentReady', (e) => {
                    const { intent, confidence, switchedFrom } = e.detail;
                    eventBus.emit('gesture_intent', { intent, confidence });
                    if (switchedFrom) {
                        console.log('[IntentAccumulator] Intent switched at confidence:', confidence);
                    }
                });
                
                enkephalon.scheduleWeightSnapshot(state.triaMemory);
          } else {
              console.warn('[Enkephalon] WASM instance not found. Stub mode active.');
          }
      } catch (e) {
          console.error('[Enkephalon] Init error:', e);
      }

      // 8. Инициализация Цепочки (LocalChain)
      state.localChain = new LocalChain();

      // 9. Инициализация Векторного Хранилища (GestureVectorStore)
      state.gestureVectorStore = new GestureVectorStore();
      await state.gestureVectorStore.init({ includeZ: true });

      // 10. Запуск Lethe-демона (теперь с реальным Enkephalon и ReintegrationManager)
      state.maturityDaemon = new MaturityDaemon(state.enkephalon, state.triaMemory, state.reintegration);
      state.maturityDaemon.start();

      // 11. Подключение Кошелька (Hermaion)
      state.wallet = hermaionWallet;
      
      // 12. EarthZero: Shared WebXR Layer
      try {
          const { EarthZero } = await import('../3d/EarthZero.js');
          state.earthZero = new EarthZero(state.scene);
      } catch (e) {
          console.warn('[EarthZero] Layer skip:', e);
      }

      console.log('✅ Web3 & Tria Memory modules (Stage 1 + EarthZero) initialized');

      // --- Stage 2: Data Pipeline (Takt 0 -> Soma -> Obolos) ---
      state.lastGestureFrameRaw = null;
      state.lastAudioSpectrum = null;

      // Слушатель жестов
      eventBus.on('handsUpdate', (data) => {
          if (data.landmarks && data.landmarks.length > 0) {
              state.lastGestureFrameRaw = data.landmarks[0]; // Берем первую руку
          } else {
              state.lastGestureFrameRaw = null;
          }
      });

      // --- Stage 2: AI+Web3 Data Pipeline (Pulse Takt 0/1) ---
      
      // Выносим импорты из высокочастотного цикла для предотвращения jank
      const [{ proofOfGesture }, { agenticDAO }] = await Promise.all([
          import('./ProofOfGesture.js'),
          import('../services/AgenticDAO.js')
      ]);

      // Инициализируем DAO один раз при старте Stage 2
      if (agenticDAO && !agenticDAO._memory && state.triaMemory) {
          await agenticDAO.init(state.triaMemory);
      }

      // Слушатель жестов
      eventBus.on('handsUpdate', (data) => {
          if (data.landmarks && data.landmarks.length > 0) {
              state.lastGestureFrameRaw = data.landmarks[0]; // Берем первую руку
          } else {
              state.lastGestureFrameRaw = null;
          }
      });

      // Слушатель аудио
      eventBus.on('audio:spectralData', (data) => {
          state.lastAudioSpectrum = data.levels;
      });

      // Основной цикл обработки Такта 0/1 (Enkephalon + Soma + ProofOfGesture)
      eventBus.on('tria:pulse', async (pulseData) => {
          if (!state.lastGestureFrameRaw || !state.enkephalon?.isReady) return;

          try {
              // 1. Flatten landmarks [21 × {x,y,z}] → Float32Array[63]
              const landmarks = state.lastGestureFrameRaw;
              const gestureFlat = new Float32Array(63);
              for (let i = 0; i < Math.min(21, landmarks.length); i++) {
                  gestureFlat[i * 3]     = landmarks[i].x || 0;
                  gestureFlat[i * 3 + 1] = landmarks[i].y || 0;
                  gestureFlat[i * 3 + 2] = landmarks[i].z || 0;
              }

              // 2. Encode через WASM brain
              const embedding = state.enkephalon.encode(gestureFlat);
              
              // 3. Recall predicted intent
              const predictedIntent = state.enkephalon.recall(embedding);

              // IntentAccumulator: накопление и смена намерения (C-3)
              if (state.intentAccumulator) {
                  const confidence = state.intentAccumulator.update(predictedIntent);
                  
                  // GestureSemanticLayer: интерпретация в XR-команды
                  if (confidence >= 0.7) {
                      const currentIntent = state.intentAccumulator.getCurrentIntent();
                      state.gestureSemanticLayer.interpret(currentIntent, confidence);
                  }
              }

              // 4. Learning (Hebbian)
              state.enkephalon.learn(embedding, predictedIntent);

              // 5. Создание Soma-блока (с привязкой к цепочке Soma-Pneuma)
              const audioSpectrum = state.lastAudioSpectrum
                  ? new Float32Array(state.lastAudioSpectrum)
                  : new Float32Array(128);
              
              const prevHash = state.lastSoma?.pneuma?.hash || "0x0";
              const soma = state.localChain.createSoma(gestureFlat, audioSpectrum, prevHash);
              state.lastSoma = soma;

              // 6. Сохранение в Hippocampus
              if (state.triaMemory) {
                  await state.triaMemory.saveSoma(soma);
              }

              // 7. ProofOfGesture и AgenticDAO (уже импортированы выше)
              const p2pCount = state.collective?.getConnectionCount?.() || 0;
              proofOfGesture.createSomaBlock(embedding, { takt: pulseData.takt }, p2pCount);
              
              if (agenticDAO) {
                  await agenticDAO.registerComputeFactor(1, 'gesture_frame');
              }

              // P2P Pulse (G-1v)
              if (state.collective && state.collective._peers.size > 0) {
                  state.collective.broadcastPulse({
                      embedding: Array.from(embedding),
                      takt: pulseData.takt
                  });
              }

              // Обновление UI Казначейства
              const countEl = document.getElementById('treasury-block-count');
              if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;

          } catch (e) {
              console.warn('[TriaPulse] Pipeline error:', e);
          }
      });

      console.log('✅ AI+Web3 Data Pipeline (Stage 2) active');

      // --- Stage 3: P2P Collective Sync (Takt 1) ---
      const TriaCollectiveService = (await import('../tria/TriaCollectiveService.js')).default;
      state.collective = new TriaCollectiveService();
      
      // WebSocket signaling - room_id это НЕ чат-рум, а WebRTC signaling room
      // room_id нужен для P2P соединения между пользователями
      // Примечание: Koyeb не поддерживает долгие WebSocket соединения - ошибка 1006
      const signalingUrl = state.config?.signalingUrl || 'wss://dev.holograms.media/ws/signaling/default_room';
      
      // Тест: пробуем без room_id
      const testUrl = 'wss://dev.holograms.media/ws/signaling';
      console.log('[TriaCollective] Testing WebSocket connection to:', testUrl);
      await state.collective.connect(testUrl);

      state.lastSoma = null; // Буфер между тактами

      // Расширяем существующий tria:pulse для Такта 1
      eventBus.on('tria:pulse', async (pulseData) => {
          // Такт 0 (уже реализован выше) - сохраняем soma для Такта 1
          if (pulseData.takt === 0) {
              // Логика выше создала soma блок. Нам нужно его "запомнить". 
              // (Добавим сохранение ссылки в блок Такта 0 выше)
          }

          // Такт 1 = Сцепка (P2P Broadcast)
          if (pulseData.takt === 1 && state.lastSoma && state.collective) {
              try {
                  const soma = state.lastSoma;
                  // Транслируем дельту намерения в P2P сеть
                  await state.collective.broadcastIntent({
                      type: 'soma_delta',
                      hash: soma.pneuma.hash,
                      intent: Array.from(soma.sarx.predicted_intent),
                      confidence: soma.sarx.confidence,
                      ts: Date.now()
                  });
              } catch (e) {
                  console.warn('[Stage 3] P2P Broadcast error:', e);
              }
          }
      });

      // Обработка входящих P2P сигналов (Резонанс + EarthZero)
      state.collective.receiveStream((msg, peerId) => {
          if (msg.type === 'intent-delta' && msg.payload.type === 'soma_delta') {
              eventBus.emit('tria:resonance', { peerId, delta: msg.payload });
              
              // Визуализация в EarthZero (H-3: Детерминированные позиции на основе peerId)
              if (state.earthZero) {
                  // Генерируем псевдо-случайную позицию на основе хеша peerId
                  const hash = (str) => {
                      let h = 0;
                      for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
                      return h;
                  };
                  const h = hash(peerId);
                  const pos = {
                      x: ((h % 100) / 100 - 0.5) * 10,
                      y: 1.2 + ((Math.abs(h >> 8) % 100) / 100) * 1.5,
                      z: ((Math.abs(h >> 16) % 100) / 100 - 0.5) * 10
                  };
                  const intensity = msg.payload.confidence || 0.5;
                  state.earthZero.addEcho(peerId, pos, intensity);
              }
          }
      });

      console.log('✅ Tria Collective P2P (Stage 3) active');
      // ------------------------------------------

      // ------------------------------------------
      // ТЗ v4.5: Инициализация Gesture Phase модулей
      state.gestureCommandEngine = new GestureCommandEngine();
      state.gestureToCodeExecutor = new GestureToCodeExecutor(state.gestureCommandEngine);
      state.gestureLiveStudio = new GestureLiveStudio(state.gestureUIManager, state.gestureCommandEngine);

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
    // --- Start Auto-Reload ---
    autoReloadService.start();
    // NOTE: lightingManager.initialize() moved to main.js (after UI is visible)
    // to prevent double-init and ensure elements are in DOM when refreshElements() runs

    return state;

  } catch (error) {
    console.error('❌ Критическая ошибка в initCore:', error);
    window.handleThreeJSError(error, 'core_initialization');
    return null;
  }
}
