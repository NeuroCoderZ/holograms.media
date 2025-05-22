// frontend/js/core/init.js - Инициализация основного состояния и конфигурации приложения

// Глобальный объект состояния приложения
export const state = {
  // --- Состояние 3D сцены ---
  scene: null,                // Объект сцены Three.js
  camera: null,               // Камера Three.js
  renderer: null,             // Рендерер Three.js
  hologramPivot: null,        // Опорная точка для голограммы (THREE.Group)
  gridHelper: null,           // Сетка-помощник
  ambientLight: null,         // Окружающий свет
  directionalLight: null,     // Направленный свет

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
    audioContext: null,         // Аудиоконтекст Web Audio API
    analyser: null,
    microphoneStream: null,
    analyserLeft: null,
    analyserRight: null,
    audioSource: null,
    audioBuffer: null,          // Буфер загруженного аудиофайла
    audioBufferSource: null,    // Источник буфера для воспроизведения файла
    isPlaying: false,           // Флаг воспроизведения аудиофайла
    pausedAt: 0,                // Позиция паузы в секундах
    startOffset: 0,             // Смещение начала воспроизведения
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

// Функция для инициализации ядра приложения
export function initCore() {
  console.log('Инициализация ядра приложения...');
  
  // Инициализируем Three.js сцену
  try {
    // initializeScene теперь напрямую модифицирует объект state
    initializeScene();
    
    console.log('Three.js сцена успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации Three.js сцены:', error);
    
    // Запасной вариант: инициализация из глобальных объектов (для обратной совместимости)
    // Этот блок оставлен для отладки, но в модульной структуре не должен использоваться
    if (window.hologramPivot && !state.hologramPivot) {
      state.hologramPivot = window.hologramPivot;
      console.log('hologramPivot инициализирован из глобального объекта');
    }
    
    if (window.scene && !state.scene) {
      state.scene = window.scene;
      console.log('scene инициализирована из глобального объекта');
    }
    
    if (window.camera && !state.camera) {
      state.camera = window.camera;
      console.log('camera инициализирована из глобального объекта');
    }
    
    if (window.renderer && !state.renderer) {
      state.renderer = window.renderer;
      console.log('renderer инициализирован из глобального объекта');
    }
  }
  
  // Установка начального аспекта камеры (если не было установлено в initializeThreeJSScene)
  if (state.camera) {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
  }
  if (state.renderer && !state.renderer.domElement.parentElement) {
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer) {
      gridContainer.appendChild(state.renderer.domElement);
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