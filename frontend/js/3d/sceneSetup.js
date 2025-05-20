import * as THREE from 'three';
import { state } from '../core/init.js';
import { semitones, columns, createSphere, createLine } from './rendering.js'; // Импорт createSphere и createLine из rendering.js

// Константы для сетки
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;
const SPHERE_RADIUS = 5;

// Удалены дублирующиеся функции createSphere и createLine

function createAxis(length, sphereRadius, isLeftGrid) { // Удален неиспользуемый параметр yColor
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
  const yAxis = createSphere(0x00FF00, sphereRadius); // Используем хардкод цвет, т.к. параметр удален
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
  const axis = createAxis(width, SPHERE_RADIUS, isLeftGrid); // Удалены неиспользуемые параметры
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

// Удалены неиспользуемые функции createColumn, degreesToCells, updateColumnMesh, calculateInitialScale

// TODO: Функции initializeColumns, updateSequencerColumns и processAudio были удалены/закомментированы, так как их логика либо дублировалась, либо должна находиться в других модулях (например, audio). Требуется рефакторинг логики инициализации и обновления колонок.

  const height = 2 * Math.tan(fov / 2) * distance;
  const width = height * camera.aspect;
  
  // Предполагаем, что голограмма должна занимать примерно 80% ширины экрана
  const targetWidth = width * 0.8;
  const currentWidth = GRID_WIDTH * 2; // Примерная ширина голограммы
  
  return targetWidth / currentWidth;
}

// Функция инициализации сцены
export function initializeScene() {
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
}


// Экспортируем функции и объекты для использования в других модулях
export {
  createSphere,
  createLine,
  createAxis,
  createSequencerGrid,
  createGrid,
  createColumn,
  updateColumnMesh,
  calculateInitialScale,
  degreesToCells
};