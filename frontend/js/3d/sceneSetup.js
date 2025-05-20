import * as THREE from 'three';
import { state } from '../core/init.js';
import { semitones, columns, createSphere, createLine, degreesToCells, createAxis, createSequencerGrid, createGrid } from './rendering.js'; // Импорт необходимых функций из rendering.js

// Константы для сетки
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1;
const SPHERE_RADIUS = 5;

// TODO: Функции initializeColumns, updateSequencerColumns и processAudio были удалены/закомментированы, так как их логика либо дублировалась, либо должна находиться в других модулях (например, audio). Требуется рефакторинг логики инициализации и обновления колонок.

// Удалены неиспользуемые функции createColumn, updateColumnMesh

  const height = 2 * Math.tan(fov / 2) * distance;
  const width = height * camera.aspect;
  
  // Предполагаем, что голограмма должна занимать примерно 80% ширины экрана
  const targetWidth = width * 0.8;
  const currentWidth = GRID_WIDTH * 2; // Примерная ширина голограммы
  

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


// Функция initializeScene уже экспортирована при объявлении