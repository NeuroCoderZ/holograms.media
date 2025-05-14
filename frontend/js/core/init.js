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
  hands: null,                // Экземпляр MediaPipe Hands
  gestureCanvas: null,        // Canvas для вывода отладочной информации жестов
  gestureCanvasCtx: null,     // Контекст 2D для gestureCanvas
  videoElement: null,         // Элемент <video> для захвата с камеры
  handsVisible: false,        // Флаг, указывающий, видны ли руки (для调整 макета)
  lastHandData: null,         // Последние полученные данные о руках

  // --- Состояние аудио ---
  audioContext: null,         // Аудиоконтекст Web Audio API
  analyser: null,             // AnalyserNode для визуализации аудио
  microphoneStream: null,     // Поток с микрофона
  audioSource: null,          // Источник аудио (микрофон или файл)

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
import { initializeThreeJSScene } from '../3d/sceneSetup.js';

// Функция для инициализации ядра приложения
export function initCore() {
  console.log('Инициализация ядра приложения...');
  
  // Инициализируем Three.js сцену
  try {
    const threeContext = initializeThreeJSScene();
    
    // Присваиваем возвращенные значения полям state
    state.scene = threeContext.scene;
    state.camera = threeContext.camera;
    state.renderer = threeContext.renderer;
    state.hologramPivot = threeContext.hologramPivot;
    
    console.log('Three.js сцена успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации Three.js сцены:', error);
    
    // Запасной вариант: инициализация из глобальных объектов (для обратной совместимости)
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