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
  // Add a check for state and its properties at the beginning
  if (!state || typeof state !== 'object') {
      console.error("State object is not initialized or invalid in initializeScene!");
      // Optionally, attempt a re-initialization or return
      // initCore(); // This might cause issues if called multiple times
      return; // Stop execution if state is bad
  }
  if (state.scene === null) {
      console.log('[DEBUG] initializeScene: state.scene is null, initializing...');
      state.scene = new THREE.Scene();
  }
  if (state.hologramPivot === null) {
      console.log('[DEBUG] initializeScene: state.hologramPivot is null, initializing...');
      state.hologramPivot = new THREE.Group();
  }
  // Инициализация основных групп, если они еще не созданы
  if (state.scene === null) {
      console.log('[DEBUG] initializeScene: state.scene is null, initializing...');
      state.scene = new THREE.Scene();
  }
  if (state.hologramPivot === null) {
      console.log('[DEBUG] initializeScene: state.hologramPivot is null, initializing...');
      state.hologramPivot = new THREE.Group();
  }
  // КРИТИЧНО: Инициализация mainSequencerGroup ДО добавления в него дочерних элементов
  if (state.mainSequencerGroup === null) {
       console.log('[DEBUG] initializeScene: state.mainSequencerGroup is null, initializing...');
       state.mainSequencerGroup = new THREE.Group();
  }


  console.log('[DEBUG] initializeScene: state.hologramPivot initialized:', state.hologramPivot);
  console.log('[DEBUG] initializeScene: state.mainSequencerGroup initialized:', state.mainSequencerGroup);

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
  // Добавляем защитные проверки на случай, если объекты по какой-то причине null
  // These checks are already present, but let's ensure they are correct
  if (state.mainSequencerGroup) { // Check if mainSequencerGroup is valid before adding
      if (state.leftSequencerGroup) {
        state.mainSequencerGroup.add(state.leftSequencerGroup);
      } else {
        console.warn("leftSequencerGroup is null, cannot add to mainSequencerGroup.");
      }
      if (state.rightSequencerGroup) {
        state.mainSequencerGroup.add(state.rightSequencerGroup);
      } else {
        console.warn("rightSequencerGroup is null, cannot add to mainSequencerGroup.");
      }
  } else {
      console.error("Main Sequencer Group is null before adding children!");
  }


  if (state.hologramPivot) { // Check if hologramPivot is valid before adding
      if (state.mainSequencerGroup) {
          state.hologramPivot.add(state.mainSequencerGroup);
      } else {
          console.warn("mainSequencerGroup is null, cannot add to hologramPivot.");
      }
  } else {
      console.error("Hologram Pivot is null before adding mainSequencerGroup!");
  }


  if (state.scene) { // Check if scene is valid before adding
      if (state.hologramPivot) {
          state.scene.add(state.hologramPivot);
      } else {
          console.warn("hologramPivot is null, cannot add to scene.");
      }
  } else {
      console.error("Scene is null before adding pivot!");
  }


  // Центрируем геометрию относительно пивота
  state.mainSequencerGroup.position.set(0, -260 / 2, 0);
  state.hologramPivot.position.set(0, 0, 0); // Начальная позиция пивота
  state.mainSequencerGroup.rotation.set(0, 0, 0);
}