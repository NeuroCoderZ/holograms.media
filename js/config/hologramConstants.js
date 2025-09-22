// js/config/hologramConstants.js
/**
 * Единый конфигурационный файл для всех констант голографической системы
 * Обеспечивает согласованность значений во всем проекте
 */

export const HOLOGRAM_CONSTANTS = {
  // Размеры сетки голограммы
  GRID: {
    WIDTH: 256,
    HEIGHT: 128,
    DEPTH: 256
  },

  // Аудио параметры
  AUDIO: {
    BUFFER_SIZE: 256,
    FFT_SIZE: 256,
    SAMPLE_RATE: 44100,
    CHANNELS: 1
  },

  // Визуальные параметры
  VISUAL: {
    PARTICLE_COUNT: 32768, // 256 * 128
    MAX_INTENSITY: 1.0,
    MIN_INTENSITY: 0.0,
    COLOR_DEPTH: 24
  },

  // Физические параметры
  PHYSICS: {
    GRAVITY: -9.81,
    DAMPING: 0.99,
    SPRING_CONSTANT: 0.1,
    MASS: 1.0
  },

  // Параметры рендеринга
  RENDERING: {
    FPS_TARGET: 60,
    MAX_DELTA_TIME: 1/30, // Максимальный дельта для стабильности
    LOD_LEVELS: 3,
    CULL_DISTANCE: 1000
  },

  // Параметры жестов
  GESTURES: {
    TRAJECTORY_BUFFER_SIZE: 50,
    MIN_GESTURE_DURATION: 100, // мс
    MAX_GESTURE_DURATION: 5000, // мс
    SIMILARITY_THRESHOLD: 0.8
  },

  // Параметры оптимизации
  OPTIMIZATION: {
    MAX_TEXTURE_SIZE: 4096,
    COMPRESSION_LEVEL: 6,
    CACHE_SIZE: 100,
    WORKER_THREADS: 4
  },

  // Параметры сети
  NETWORK: {
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 1000, // мс
    HEARTBEAT_INTERVAL: 30000, // мс
    TIMEOUT: 10000 // мс
  }
};

// Экспорт отдельных констант для обратной совместимости
export const GRID_WIDTH = HOLOGRAM_CONSTANTS.GRID.WIDTH;
export const GRID_HEIGHT = HOLOGRAM_CONSTANTS.GRID.HEIGHT;
export const GRID_DEPTH = HOLOGRAM_CONSTANTS.GRID.DEPTH;

export const AUDIO_BUFFER_SIZE = HOLOGRAM_CONSTANTS.AUDIO.BUFFER_SIZE;
export const FFT_SIZE = HOLOGRAM_CONSTANTS.AUDIO.FFT_SIZE;

// Функция для получения констант с учетом производительности устройства
export function getOptimizedConstants(deviceCapabilities) {
  const base = { ...HOLOGRAM_CONSTANTS };

  // Адаптация под мобильные устройства
  if (deviceCapabilities.isMobile) {
    base.GRID.WIDTH = Math.min(base.GRID.WIDTH, 128);
    base.GRID.HEIGHT = Math.min(base.GRID.HEIGHT, 64);
    base.RENDERING.FPS_TARGET = 30;
    base.OPTIMIZATION.WORKER_THREADS = 2;
  }

  // Адаптация под низкую производительность
  if (deviceCapabilities.performance < 0.5) {
    base.VISUAL.PARTICLE_COUNT = Math.floor(base.VISUAL.PARTICLE_COUNT * 0.5);
    base.RENDERING.LOD_LEVELS = 2;
    base.OPTIMIZATION.MAX_TEXTURE_SIZE = 2048;
  }

  return base;
}
