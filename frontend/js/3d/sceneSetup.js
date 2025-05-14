// frontend/js/3d/sceneSetup.js - Модуль инициализации Three.js сцены

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Константы ---
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;
const SPHERE_RADIUS = 5;
const COLUMN_ANIMATION_SPEED = 2.0;

// Цветовые константы
const START_HUE = 0;    // Red
const END_HUE = 270;    // Violet
const SATURATION = 1.0;
const LIGHTNESS = 0.5;

// Аудио константы
const BASE_FREQUENCY = 27.5;
const NOTES_PER_OCTAVE = 12;
const STARTING_OCTAVE = 2;
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Функция для вычисления ширины колонок на основе индекса
function degreesToCells(index) {
  const maxWidth = 130;
  const minWidth = 1;
  const totalSemitones = 130;
  const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
  return Math.max(minWidth, Math.round(width));
}

// Генерация массива полутонов
const semitones = Array.from({ length: 130 }, (_, i) => {
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
    key: note.replace("#", "s"), // Для React (если будет использоваться)
    note: note,
    f: f,
    width: width,
    color: color,
    deg: 180.00 - (i * 1.3846), // Угол для визуализации
  };
});

// --- Вспомогательные функции для создания 3D объектов ---

function createSphere(color, radius) {
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

function createLine(start, end, color, opacity) {
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthTest: false
  });
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  return new THREE.Line(geometry, material);
}

function createAxis(length, sphereRadius, xColor, yColor, zColor, isLeftGrid) {
  const axisGroup = new THREE.Group();

  // X-axis - Red for positive, Purple for negative
  const xAxisGroup = new THREE.Group();
  const xAxisOffset = isLeftGrid ? GRID_WIDTH : 0;

  if (isLeftGrid) {
    // Negative X - Purple
    const xAxisNeg = createSphere(0x9400d3, sphereRadius);
    xAxisNeg.position.set(-length, 0, 0);
    const xAxisLineNeg = createLine(
      new THREE.Vector3(-length, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0x9400d3,
      1.0
    );
    xAxisGroup.add(xAxisNeg, xAxisLineNeg);
  } else {
    // Positive X - Red
    const xAxisPos = createSphere(0xFF0000, sphereRadius);
    xAxisPos.position.set(length, 0, 0);
    const xAxisLinePos = createLine(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length, 0, 0),
      0xFF0000,
      1.0
    );
    xAxisGroup.add(xAxisPos, xAxisLinePos);
  }

  // Y-axis - Green
  const yAxisGroup = new THREE.Group();
  const yAxis = createSphere(yColor, sphereRadius);
  yAxis.position.set(0, GRID_HEIGHT, 0);
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

function createSequencerGrid(width, height, depth, cellSize, color, position, isLeftGrid) {
  const grid = createGrid(width, height, depth, cellSize, color);
  if (isLeftGrid) {
    grid.material.color.set(0x9400d3);
  }
  const axis = createAxis(width, SPHERE_RADIUS, isLeftGrid ? 0x9400d3 : 0xFF0000, 0x00FF00, 0xFFFFFF, isLeftGrid);
  const sequencerGroup = new THREE.Group();
  sequencerGroup.add(grid);
  sequencerGroup.add(axis);
  sequencerGroup.position.copy(position);
  return sequencerGroup;
}

function createGrid(gridWidth, gridHeight, gridDepth, cellSize, color) {
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
  for (let z = 0; z <= gridWidth; z += 1) {
    for (let y = 0; y <= gridHeight; y += 1) {
      positions.push(z * cellSize, y * cellSize, 0, z * cellSize, y * cellSize, gridDepth * cellSize);
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

// --- Функции для создания и обновления колонок ---

function createColumn(offsetX, index, initialDB, isLeft) {
  const columnGroup = new THREE.Group();
  const columnWidth = 1;
  const columnDepth = 1;
  const columnHeight = 1;
  const semitone = semitones[index - 1];
  const baseColor = semitone ? semitone.color : new THREE.Color(0xffffff);
  
  // Создаем геометрию и материал для колонки
  const geometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth);
  const material = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: 0.5
  });
  
  // Создаем меш и добавляем его в группу
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(offsetX, 0, 0);
  columnGroup.add(mesh);
  
  return columnGroup;
}

function initializeColumns() {
  const columns = [];
  semitones.forEach((semitone, i) => {
    const initialDB = 0;
    const maxOffset = degreesToCells(semitone.deg);
    const offsetLeft = i;
    const columnLeft = createColumn(offsetLeft, i + 1, initialDB, true);
    const columnRight = createColumn(offsetLeft, i + 1, initialDB, false);
    columns.push({
      left: columnLeft,
      right: columnRight,
      offsetX: 0,
      direction: 1,
      maxOffset: maxOffset,
      speed: Math.random() * 0.1 + 0.1,
      dB: initialDB,
      dBDirection: 1
    });
  });
  return columns;
}

function updateSequencerColumns(columns, leftSequencerGroup, rightSequencerGroup) {
  columns.forEach(column => {
    if (!column.left.parent) leftSequencerGroup.add(column.left);
    if (!column.right.parent) rightSequencerGroup.add(column.right);
  });
}

function processAudio(analyserLeft, analyserRight, columns) {
  if (!analyserLeft || !analyserRight) return;

  const bufferLength = analyserLeft.frequencyBinCount;
  const dataArrayLeft = new Uint8Array(bufferLength);
  const dataArrayRight = new Uint8Array(bufferLength);
  
  analyserLeft.getByteFrequencyData(dataArrayLeft);
  analyserRight.getByteFrequencyData(dataArrayRight);
  
  columns.forEach((column, i) => {
    const semitone = semitones[i];
    if (!semitone) return;
    
    const binIndex = Math.round(semitone.f / (44100 / bufferLength));
    if (binIndex >= bufferLength) return;
    
    const valueLeft = dataArrayLeft[binIndex] / 255;
    const valueRight = dataArrayRight[binIndex] / 255;
    
    updateColumnMesh(column.left, valueLeft, semitone.color);
    updateColumnMesh(column.right, valueRight, semitone.color);
  });
}

function updateColumnMesh(columnGroup, value, baseColor) {
  if (!columnGroup || !columnGroup.children || columnGroup.children.length === 0) return;
  
  columnGroup.children.forEach(mesh => {
    const height = Math.max(0.001, value * 50);
    mesh.scale.y = height;
    mesh.position.y = height / 2;
    
    // Изменяем цвет в зависимости от значения
    const color = baseColor.clone();
    color.offsetHSL(0, 0, value * 0.5); // Увеличиваем яркость при большем значении
    mesh.material.color.copy(color);
  });
}

function calculateInitialScale(camera, hologramPivot) {
  // Расчет масштаба на основе расстояния от камеры и размера голограммы
  const distance = camera.position.distanceTo(hologramPivot.position);
  const fov = camera.fov * (Math.PI / 180);
  const height = 2 * Math.tan(fov / 2) * distance;
  const width = height * camera.aspect;
  
  // Предполагаем, что голограмма должна занимать примерно 80% ширины экрана
  const targetWidth = width * 0.8;
  const currentWidth = GRID_WIDTH * 2; // Примерная ширина голограммы
  
  return targetWidth / currentWidth;
}

// --- Основная функция инициализации Three.js сцены ---

export function initializeThreeJSScene() {
  console.log('Инициализация Three.js сцены...');
  
  // Создаем основные объекты Three.js
  const scene = new THREE.Scene();
  const hologramPivot = new THREE.Group();
  const mainSequencerGroup = new THREE.Group();
  
  // Создаем камеру
  const aspect = window.innerWidth / window.innerHeight;
  const orthoCamera = new THREE.OrthographicCamera(
    -window.innerWidth / 2, window.innerWidth / 2,
    window.innerHeight / 2, -window.innerHeight / 2,
    0.1, 1000
  );
  orthoCamera.position.set(0, 0, 500);
  orthoCamera.lookAt(0, 0, 0);
  
  // Создаем рендерер
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  
  // Добавляем рендерер в DOM
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    gridContainer.appendChild(renderer.domElement);
  } else {
    console.error('Элемент #grid-container не найден!');
    document.body.appendChild(renderer.domElement);
  }
  
  // Создаем освещение
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 10, 10);
  scene.add(directionalLight);
  
  // Создаем сетки секвенсора
  const leftSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    semitones[semitones.length - 1].color,
    new THREE.Vector3(-GRID_WIDTH, 0, -GRID_DEPTH / 2),
    true
  );
  
  const rightSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    semitones[0].color,
    new THREE.Vector3(0, 0, -GRID_DEPTH / 2),
    false
  );
  
  // Добавляем группы в основную группу
  mainSequencerGroup.add(leftSequencerGroup);
  mainSequencerGroup.add(rightSequencerGroup);
  
  // Добавляем основную группу в опорную точку голограммы
  hologramPivot.add(mainSequencerGroup);
  
  // Добавляем опорную точку голограммы в сцену
  scene.add(hologramPivot);
  
  // Инициализируем колонки
  const columns = initializeColumns();
  updateSequencerColumns(columns, leftSequencerGroup, rightSequencerGroup);
  
  // Устанавливаем начальный масштаб голограммы
  const initialScale = calculateInitialScale(orthoCamera, hologramPivot);
  hologramPivot.scale.set(initialScale, initialScale, initialScale);
  
  // Функция анимации
  function animate() {
    requestAnimationFrame(animate);
    
    // Обновляем колонки, если есть аудио анализаторы
    if (window.microphoneAnalyserLeft && window.microphoneAnalyserRight) {
      processAudio(window.microphoneAnalyserLeft, window.microphoneAnalyserRight, columns);
    }
    
    // Рендерим сцену
    renderer.render(scene, orthoCamera);
  }
  
  // Запускаем анимацию
  animate();
  
  // Обработчик изменения размера окна
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    orthoCamera.left = -width / 2;
    orthoCamera.right = width / 2;
    orthoCamera.top = height / 2;
    orthoCamera.bottom = -height / 2;
    orthoCamera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    
    // Пересчитываем масштаб голограммы
    const newScale = calculateInitialScale(orthoCamera, hologramPivot);
    hologramPivot.scale.set(newScale, newScale, newScale);
  });
  
  console.log('Инициализация Three.js сцены завершена');
  
  // Возвращаем объекты для использования в других модулях
  return {
    scene,
    camera: orthoCamera,
    renderer,
    hologramPivot,
    columns,
    leftSequencerGroup,
    rightSequencerGroup,
    mainSequencerGroup
  };
}

// Экспортируем функции и объекты для использования в других модулях
export {
  semitones,
  createSphere,
  createLine,
  createAxis,
  createSequencerGrid,
  createGrid,
  createColumn,
  initializeColumns,
  updateSequencerColumns,
  processAudio,
  updateColumnMesh,
  calculateInitialScale
};