// frontend/js/rendering.js - Модуль для логики 3D-рендеринга

import * as THREE from 'three';
import { state } from '../core/init.js'; // Для доступа к state.scene, state.mainSequencerGroup

// --- Константы и конфигурация, перенесенные из script.js ---

// Color configuration constants
const START_HUE = 0;    // Red
const END_HUE = 270;    // Violet
const SATURATION = 1.0;
const LIGHTNESS = 0.5;

// Audio configuration constants (используются для semitones)
const BASE_FREQUENCY = 27.5;
const NOTES_PER_OCTAVE = 12;
const STARTING_OCTAVE = 2;

// Note names configuration (используются для semitones)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Grid and Scale Configuration (частично)
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;
const SPHERE_RADIUS = 5;

// --- Переменные модуля ---
export const columns = [];

// Функция для вычисления ширины колонок на основе индекса
function degreesToCells(index) {
  const maxWidth = 130;
  const minWidth = 1;
  const totalSemitones = 130;
  const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
  return Math.max(minWidth, Math.round(width));
}

// Генерация массива полутонов
export const semitones = Array.from({ length: 130 }, (_, i) => {
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
    key: note.replace("#", "s"), // Для React (если будет использоваться)\n    note: note,\n    f: f,\n    width: width,\n    color: color,\n    deg: 180.00 - (i * 1.3846) // Угол для визуализации
  });



// --- Функции рендеринга, перенесенные из script.js ---

export function createSphere(color, radius) {
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

export function createLine(start, end, color, opacity) {
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthTest: false
  });
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  return new THREE.Line(geometry, material);
}

export function createAxis(length, sphereRadius) { // Удалены неиспользуемые параметры цвета и isLeftGrid
  const axisGroup = new THREE.Group();

  // X-axis - Red for positive, Purple for negative
  const xAxisGroup = new THREE.Group();
  const xAxisOffset = 0; // isLeftGrid удален, смещение по умолчанию 0

  // Positive X - Red (оставляем только положительную ось X, как в оригинале без isLeftGrid)
  const xAxisPos = createSphere(0xFF0000, sphereRadius);
  xAxisPos.position.set(length, 0, 0);
  const xAxisLinePos = createLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length, 0, 0),
    0xFF0000,
    1.0
  );
  xAxisGroup.add(xAxisPos, xAxisLinePos);

  // Y-axis - Green
  const yAxisGroup = new THREE.Group();
  const yAxis = createSphere(0x00FF00, sphereRadius);
  yAxis.position.set(0, GRID_HEIGHT, 0); // Используем GRID_HEIGHT из этого модуля
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

export function createGrid(gridWidth, gridHeight, gridDepth, cellSize, color) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
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
  // Исправлено: z должно итерироваться до gridDepth, а не gridWidth для Z-плоскости сетки
  for (let x = 0; x <= gridWidth; x += 1) { // Итерация по X
    for (let y = 0; y <= gridHeight; y += 1) { // Итерация по Y
      // Линии вдоль оси Z
      positions.push(x * cellSize, y * cellSize, 0, x * cellSize, y * cellSize, gridDepth * cellSize);
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

export function createSequencerGrid(width, height, depth, cellSize, color, position) { // Удален isLeftGrid
  const grid = createGrid(width, height, depth, cellSize, color);
  // if (isLeftGrid) { // Логика isLeftGrid удалена
  //   grid.material.color.set(0x9400d3);
  // }
  const axis = createAxis(width, SPHERE_RADIUS); // Передаем только длину и радиус сферы
  const sequencerGroup = new THREE.Group();\n  sequencerGroup.add(grid);\n  sequencerGroup.add(axis);\n  sequencerGroup.position.copy(position);\n  return sequencerGroup;\n}\n\n// Функция createColumn, адаптированная для rendering.js\n// Примечание: эта функция отличается от той, что в sceneSetup.js. Мы переносим ту, что была в script.js
export function createColumn(x, y, dB) { // Удален isLeftGrid
  const group = new THREE.Group();
  const semitone = semitones[y - 1]; // y - это индекс + 1
  if (!semitone) {
    console.warn(`No semitone data for index ${y - 1}`);
    return group; // Возвращаем пустую группу, если нет данных
  }

  const columnWidth = semitone.width;
  const material = new THREE.MeshStandardMaterial({
    color: semitone.color,
    roughness: 0.5,
    metalness: 0.5,
    transparent: true,
    opacity: 0.8
  });

  const geometry = new THREE.BoxGeometry(columnWidth, 1, 1); // Высота и глубина 1
  const mesh = new THREE.Mesh(geometry, material);

  // Начальное положение и масштаб
  mesh.scale.z = Math.max(0.001, dB); // dB определяет высоту (масштаб по Z)
  mesh.position.set(x * CELL_SIZE, 0, mesh.scale.z / 2); // Позиционируем относительно низа

  group.add(mesh);
  return group;
}

export function initializeColumns() {
  if (columns.length === 0) {
    semitones.forEach((semitone, i) => {
      const initialDB = 0;
      // const maxOffset = degreesToCells(semitone.deg); // semitone.deg не используется в createColumn из script.js
      const offsetLeft = i; // Используем индекс как смещение по X для простоты
      const columnLeft = createColumn(offsetLeft, i + 1, initialDB);
      const columnRight = createColumn(offsetLeft, i + 1, initialDB);
      columns.push({
        left: columnLeft,
        right: columnRight,
        offsetX: 0, // Эти свойства, похоже, для анимации, которая может быть в другом месте
        direction: 1,
        // maxOffset: maxOffset, // Зависит от degreesToCells и semitone.deg
        speed: Math.random() * 0.1 + 0.1,
        dB: initialDB,
        dBDirection: 1
      });
    });
  }
  columns.forEach(column => {
    if (state.mainSequencerGroup) { // Убедимся, что mainSequencerGroup существует
      if (column.left) state.mainSequencerGroup.add(column.left);
      if (column.right) state.mainSequencerGroup.add(column.right);
    } else {
      console.warn("state.mainSequencerGroup не определена при инициализации колонок");
    }
  });
  console.log('Колонки инициализированы и добавлены в mainSequencerGroup (если он доступен)');
}

// --- Функции аудиовизуализации ---

/**
 * Обновляет визуализацию аудио на основе данных из анализатора
 * @param {Uint8Array} dataArray - Массив данных из анализатора
 * @param {number} bufferLength - Длина буфера
 */
export function updateAudioVisualization(dataArray, bufferLength) {
  if (!state.mainSequencerGroup) return;
  
  // Обновляем визуализацию для каждой колонки
  for (let i = 0; i < Math.min(bufferLength, columns.length); i++) {
    const value = dataArray[i] / 255.0; // Нормализуем значение от 0 до 1
    const column = columns[i];
    
    if (column && column.left && column.right) {
      // Обновляем левую и правую колонки
      updateColumnVisualization(column.left, value);
      updateColumnVisualization(column.right, value);
    }
  }
}

/**
 * Обновляет визуализацию отдельной колонки
 * @param {THREE.Group} columnGroup - Группа колонки
 * @param {number} value - Нормализованное значение (0-1)
 */
export function updateColumnVisualization(columnGroup, value) {
  if (!columnGroup || !columnGroup.children) return;
  
  columnGroup.children.forEach(mesh => {
    // Обновляем масштаб и позицию меша в зависимости от значения
    const scaleFactor = Math.max(0.001, value * 5); // Минимальный масштаб 0.001
    mesh.scale.z = scaleFactor;
    
    // Обновляем позицию, чтобы колонка росла от основания
    mesh.position.z = scaleFactor / 2;
    
    // Обновляем цвет в зависимости от интенсивности
    if (mesh.material) {
      const baseColor = mesh.userData.baseColor || new THREE.Color(0xffffff);
      const brightColor = new THREE.Color().copy(baseColor).multiplyScalar(1 + value);
      mesh.material.color.copy(brightColor);
    }
  });
}

/**
 * Сбрасывает визуализацию всех колонок до исходного состояния
 */
export function resetVisualization() {
  columns.forEach((column, i) => {
    const baseColor = semitones[i] ? semitones[i].color : new THREE.Color(0xffffff);
    
    if (column.left && column.right) {
      column.left.children.forEach(mesh => { 
        mesh.scale.z = 0.001; 
        mesh.position.z = 0; 
        mesh.material.color.copy(baseColor);
        // Сохраняем базовый цвет для будущего использования
        mesh.userData.baseColor = baseColor.clone();
      });
      
      column.right.children.forEach(mesh => { 
        mesh.scale.z = 0.001; 
        mesh.position.z = 0; 
        mesh.material.color.copy(baseColor);
        // Сохраняем базовый цвет для будущего использования
        mesh.userData.baseColor = baseColor.clone();
      });
    }
  });
}

/**
 * Создает визуализацию для аудиоданных
 * @param {Float32Array} audioData - Массив аудиоданных
 * @param {number} sampleRate - Частота дискретизации
 */
export function createAudioVisualization(audioData, sampleRate) {
  if (!state.mainSequencerGroup || !columns.length) return;
  
  // Создаем временный анализатор для обработки данных
  const tempContext = new (window.AudioContext || window.webkitAudioContext)();
  const tempAnalyser = tempContext.createAnalyser();
  tempAnalyser.fftSize = 256;
  
  const bufferLength = tempAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Создаем буфер с аудиоданными
  const audioBuffer = tempContext.createBuffer(1, audioData.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  channelData.set(audioData);
  
  // Создаем источник и подключаем к анализатору
  const source = tempContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(tempAnalyser);
  
  // Получаем данные из анализатора
  tempAnalyser.getByteFrequencyData(dataArray);
  
  // Обновляем визуализацию
  updateAudioVisualization(dataArray, bufferLength);
  
  // Закрываем временный контекст
  tempContext.close();
}

/**
 * Получает уровни амплитуды для каждого полутона из анализатора
 * @param {AnalyserNode} analyser - Аудио анализатор
 * @returns {Array<number>} Массив уровней в дБ для каждого полутона
 */
export function getSemitoneLevels(analyser) {
  if (!analyser) {
    console.warn("Analyser is not initialized.");
    return semitones.map(() => -100); // Return default values if analyser is null
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  // Получаем частоту дискретизации из аудиоконтекста
  const sampleRate = analyser.context.sampleRate;
  const binSize = sampleRate / (2 * bufferLength);
  
  return semitones.map(semitone => {
    const binIndex = Math.round(semitone.f / binSize);
    if (binIndex >= bufferLength) return -100;
    const amplitude = dataArray[binIndex];
    if (amplitude === 0) return -100;
    const dB = 20 * Math.log10(amplitude / 255) * 1.5;
    return THREE.MathUtils.clamp(dB, -100, 30);
  });
}

/**
 * Обновляет колонки секвенсора на основе амплитуд
 * @param {Array<number>} amplitudes - Массив амплитуд для каждого полутона
 * @param {string} channel - Канал ('left' или 'right')
 */
export function updateSequencerColumns(amplitudes, channel) {
  columns.forEach((column, i) => {
    const dB = amplitudes[i];
    if (isNaN(dB)) return;

    // Нормализация значения
    const normalizedDB = THREE.MathUtils.clamp(
      (dB + 100) / (130 + 100),
      0,
      1
    );

    const columnGroup = channel === 'left' ? column.left : column.right;
    const { color } = semitones[i];

    columnGroup.children.forEach(mesh => {
      // Немедленное обновление визуализации
      mesh.material.opacity = 1.0;
      mesh.material.transparent = false;
      mesh.material.color = color;

      // Прямое обновление позиции без анимации
      const targetDepth = normalizedDB * 260;
      mesh.scale.z = targetDepth;
      mesh.position.z = targetDepth / 2;
    });
  });
}

/**
 * Обновляет колонки на основе данных с микрофона
 * @param {AnalyserNode} analyserLeft - Анализатор левого канала
 * @param {AnalyserNode} analyserRight - Анализатор правого канала
 */
export function updateColumnsForMicrophone(analyserLeft, analyserRight) {
  if (!analyserLeft || !analyserRight) {
    console.warn("Микрофонные анализаторы не инициализированы.");
    return;
  }

  // Получаем уровни для левого и правого каналов
  const leftLevels = getSemitoneLevels(analyserLeft);
  const rightLevels = getSemitoneLevels(analyserRight);

  // Обновляем колонки для обоих каналов
  updateSequencerColumns(leftLevels, 'left');
  updateSequencerColumns(rightLevels, 'right');
}

// --- Функция анимации и рендеринга ---

export function animate() {
  requestAnimationFrame(animate);

  // Проверяем, что необходимые объекты Three.js инициализированы в state
  if (!state.scene || !state.camera || !state.renderer) {
      console.error('[Animation] Rendering setup incomplete:', { scene: state.scene, camera: state.camera, renderer: state.renderer });
      return;
  }

  // Обновляем анимации TWEEN.js (предполагается, что TWEEN глобально доступен)
  if (typeof TWEEN !== 'undefined') {
      TWEEN.update();
  }

  // Очищаем буферы
  state.renderer.clear();

  // Обрабатываем аудио, если воспроизводится
  // Предполагаем, что isPlaying и processAudio будут доступны через state или импорт
  // Временно используем updateColumnsForMicrophone, как в script.js.backup
  if (state.isPlaying && state.microphoneAnalyserLeft && state.microphoneAnalyserRight) {
      updateColumnsForMicrophone(state.microphoneAnalyserLeft, state.microphoneAnalyserRight);
  }

  // Рендерим сцену
  state.renderer.render(state.scene, state.camera);
}