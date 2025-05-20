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

// frontend/js/3d/sceneSetup.js - Модуль инициализации Three.js сцены

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { state } from '../core/init.js'; // Импортируем state
import { createSequencerGrid, initializeColumns, semitones } from '../rendering.js'; // Импортируем функции и данные из rendering.js

// --- Константы ---
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;
const SPHERE_RADIUS = 5;
const TIMELINE_OFFSET = 180; // Константа для позиционирования

// --- Переменные модуля (будут храниться в state) ---
// let scene, camera, renderer, hologramPivot, mainSequencerGroup, leftSequencerGroup, rightSequencerGroup;

export function initializeScene() {
  console.log('Инициализация Three.js сцены...');

  // Создание сцены
  state.scene = new THREE.Scene();

  // Создание камеры (используем OrthographicCamera как в script.js)
  const gridContainer = document.getElementById('grid-container');
  const initialAvailableWidth = gridContainer ? gridContainer.clientWidth : window.innerWidth;
  const initialAvailableHeight = gridContainer ? gridContainer.clientHeight : window.innerHeight;

  const initialAspect = initialAvailableWidth / initialAvailableHeight;
  const initialOrthoLeft = -initialAvailableWidth / 2;
  const initialOrthoRight = initialAvailableWidth / 2;
  const initialOrthoTop = initialAvailableHeight / 2;
  const initialOrthoBottom = -initialAvailableHeight / 2;

  state.camera = new THREE.OrthographicCamera(
    initialOrthoLeft, initialOrthoRight, initialOrthoTop, initialOrthoBottom,
    -10000, 10000
  );
  state.camera.position.set(0, 0, 1200);
  state.camera.lookAt(0, 0, 0);
  console.log('Initial Camera:', { left: state.camera.left, right: state.camera.right, top: state.camera.top, bottom: state.camera.bottom });

  // Создание рендерера
  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.setSize(initialAvailableWidth, initialAvailableHeight);
  state.renderer.setClearColor(0x000000, 0); // Прозрачный фон
  state.renderer.autoClear = false; // Отключаем автоматическую очистку для ручного управления

  // Добавление рендерера в DOM
  if (gridContainer) {
    gridContainer.appendChild(state.renderer.domElement);
  } else {
    console.error('Элемент #grid-container не найден для добавления рендерера.');
    document.body.appendChild(state.renderer.domElement); // Добавляем в body как запасной вариант
  }

  // Добавление освещения
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  state.scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(0, 1, 1);
  state.scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 0.6);
  hemisphereLight.position.set(0, 200, 0);
  state.scene.add(hemisphereLight);

  const spotLight = new THREE.SpotLight(0xffffff, 0.5);
  spotLight.position.set(0, 300, 100);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 0.2;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 10;
  spotLight.shadow.camera.far = 1000;
  state.scene.add(spotLight);

  const gridPointLight = new THREE.PointLight(0xffffff, 0.8);
  gridPointLight.position.set(0, TIMELINE_OFFSET / 2, 500);
  state.scene.add(gridPointLight);

  // Создание групп для секвенсоров и пивота
  state.hologramPivot = new THREE.Group();
  state.mainSequencerGroup = new THREE.Group();

  // Создание левой и правой сетки секвенсора
  // Используем semitones из rendering.js
  state.leftSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    semitones[semitones.length - 1].color, // Цвет последнего (фиолетового) полутона
    new THREE.Vector3(-GRID_WIDTH, 0, -GRID_DEPTH / 2), // Move left grid further left
    true
  );
  state.rightSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    semitones[0].color, // Цвет первого (красного) полутона
    new THREE.Vector3(0, 0, -GRID_DEPTH / 2), // Move right grid to center
    false
  );

  // Добавление групп в сцену
  state.mainSequencerGroup.add(state.leftSequencerGroup);
  state.mainSequencerGroup.add(state.rightSequencerGroup);
  state.hologramPivot.add(state.mainSequencerGroup);
  state.scene.add(state.hologramPivot);

  // Центрируем геометрию относительно пивота
  state.mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0);
  state.hologramPivot.position.set(0, 0, 0); // Начальная позиция пивота
  state.mainSequencerGroup.rotation.set(0, 0, 0);

  // Инициализация колонок (перенесено в rendering.js)
  // initializeColumns(); // Этот вызов, возможно, нужно будет сделать из main.js после инициализации сцены

  console.log('Инициализация Three.js сцены завершена');

  // Возвращаем объекты через state
  // return { scene, camera, renderer, hologramPivot, mainSequencerGroup, leftSequencerGroup, rightSequencerGroup };
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