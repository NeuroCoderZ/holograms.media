import * as THREE from 'three';
import { state } from '../core/init.js';
import { semitones, createSequencerGrid } from './rendering.js'; // Import required functions from rendering.js
// TODO: calculateInitialScale не реализована и не экспортируется из rendering.js

// Константы для сетки (используются из rendering.js)
// const GRID_WIDTH = 130;
// const GRID_HEIGHT = 260;
// const GRID_DEPTH = 130;
// const CELL_SIZE = 1;
// const SPHERE_RADIUS = 5;

// TODO: Функции initializeColumns, updateSequencerColumns и processAudio были удалены/закомментированы, так как их логика либо дублировалась, либо должна находиться в других модулях (например, audio). Требуется рефакторинг логики инициализации и обновления колонок.

// Удалены неиспользуемые функции createColumn, updateColumnMesh

// TODO: Этот блок кода, вероятно, должен быть внутри функции, которая рассчитывает позицию камеры или размер голограммы.
// const height = 2 * Math.tan(fov / 2) * distance;
// const width = height * camera.aspect;
  
// // Предполагаем, что голограмма должна занимать примерно 80% ширины экрана
// const targetWidth = width * 0.8;
// const currentWidth = 130 * 2; // Примерная ширина голограмма (используем хардкод или импорт из rendering.js)
  

// Функция инициализации сцены
export function initializeScene() {
  // Создание групп для секвенсоров и пивота
  state.hologramPivot = new THREE.Group();
  state.mainSequencerGroup = new THREE.Group();

  // Создание левой и правой сетки секвенсора
  // Используем semitones из rendering.js
  state.leftSequencerGroup = createSequencerGrid(
    130, 260, 130, 1,
    semitones[semitones.length - 1].color, // Цвет последнего (фиолетового) полутона
    new THREE.Vector3(-130, 0, -130 / 2) // Move left grid further left
  );
  state.rightSequencerGroup = createSequencerGrid(
    130, 260, 130, 1,
    semitones[0].color, // Цвет первого (красного) полутона
    new THREE.Vector3(0, 0, -130 / 2) // Move right grid to center
  );

  // Добавление групп в сцену
  state.mainSequencerGroup.add(state.leftSequencerGroup);
  state.mainSequencerGroup.add(state.rightSequencerGroup);
  state.hologramPivot.add(state.mainSequencerGroup);
  state.scene.add(state.hologramPivot);

  // Центрируем геометрию относительно пивота
  state.mainSequencerGroup.position.set(0, -260 / 2, 0);
  state.hologramPivot.position.set(0, 0, 0); // Начальная позиция пивота
  state.mainSequencerGroup.rotation.set(0, 0, 0);
}


// Функция initializeScene уже экспортирована при объявлении