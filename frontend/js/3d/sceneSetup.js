import * as THREE from 'three';
import { state } from '../core/init.js';
// import { semitones, createSequencerGrid } from './rendering.js'; // Import required functions from rendering.js - REMOVED

// Constants
const GRID_WIDTH = 130;
const GRID_HEIGHT = 260;
const GRID_DEPTH = 130;
const CELL_SIZE = 1; // Defines the size of each cell in the grid
const SPHERE_RADIUS = 5; // Defines the radius of the spheres used for axes and potentially other elements

// --- Semitones Generation Logic ---
function degreesToCells(index) {
  const totalCells = GRID_HEIGHT / CELL_SIZE;
  const cellIndex = Math.round((index / 11) * totalCells);
  return cellIndex * CELL_SIZE - GRID_HEIGHT / 2;
}

function generateSemitonesData() {
  const semitones_array = [
    { degree: 0, name: "C", color: 0xff0000, label: "C", y: degreesToCells(0) }, // Red
    { degree: 1, name: "C#", color: 0xff4500, label: "C#", y: degreesToCells(1) }, // OrangeRed
    { degree: 2, name: "D", color: 0xffa500, label: "D", y: degreesToCells(2) }, // Orange
    { degree: 3, name: "D#", color: 0xffff00, label: "D#", y: degreesToCells(3) }, // Yellow
    { degree: 4, name: "E", color: 0x9acd32, label: "E", y: degreesToCells(4) }, // YellowGreen
    { degree: 5, name: "F", color: 0x00ff00, label: "F", y: degreesToCells(5) }, // Lime
    { degree: 6, name: "F#", color: 0x00fa9a, label: "F#", y: degreesToCells(6) }, // MediumSpringGreen
    { degree: 7, name: "G", color: 0x00ffff, label: "G", y: degreesToCells(7) }, // Cyan
    { degree: 8, name: "G#", color: 0x0000ff, label: "G#", y: degreesToCells(8) }, // Blue
    { degree: 9, name: "A", color: 0x4b0082, label: "A", y: degreesToCells(9) }, // Indigo
    { degree: 10, name: "A#", color: 0x8a2be2, label: "A#", y: degreesToCells(10) }, // BlueViolet
    { degree: 11, name: "B", color: 0xc71585, label: "B", y: degreesToCells(11) }, // MediumVioletRed
  ];
  return semitones_array;
}

// --- Helper Geometry Functions ---
function createSphere(color, radius = SPHERE_RADIUS) {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    color: color,
    shininess: 100,
    specular: 0xffffff, // Цвет блика
  });
  return new THREE.Mesh(geometry, material);
}

function createLine(start, end, color, opacity = 0.5) {
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
  });
  return new THREE.Line(geometry, material);
}

function createGrid(gridWidth, gridHeight, gridDepth, cellSize, color = 0xcccccc) {
  const group = new THREE.Group();
  const divisionsX = Math.floor(gridWidth / cellSize);
  const divisionsY = Math.floor(gridHeight / cellSize);
  const divisionsZ = Math.floor(gridDepth / cellSize);

  // Create lines along X, Y, Z axes
  for (let i = 0; i <= divisionsY; i++) { // Horizontal lines (along X)
    group.add(createLine(new THREE.Vector3(-gridWidth / 2, i * cellSize - gridHeight / 2, -gridDepth / 2), new THREE.Vector3(gridWidth / 2, i * cellSize - gridHeight / 2, -gridDepth / 2), color));
    group.add(createLine(new THREE.Vector3(-gridWidth / 2, i * cellSize - gridHeight / 2, gridDepth / 2), new THREE.Vector3(gridWidth / 2, i * cellSize - gridHeight / 2, gridDepth / 2), color));
  }
  for (let i = 0; i <= divisionsX; i++) { // Vertical lines (along Y)
    group.add(createLine(new THREE.Vector3(i * cellSize - gridWidth / 2, -gridHeight / 2, -gridDepth / 2), new THREE.Vector3(i * cellSize - gridWidth / 2, gridHeight / 2, -gridDepth / 2), color));
    group.add(createLine(new THREE.Vector3(i * cellSize - gridWidth / 2, -gridHeight / 2, gridDepth / 2), new THREE.Vector3(i * cellSize - gridWidth / 2, gridHeight / 2, gridDepth / 2), color));
  }
   for (let i = 0; i <= divisionsZ; i++) { // Depth lines (along Z)
    group.add(createLine(new THREE.Vector3(-gridWidth / 2, -gridHeight/2, i * cellSize - gridDepth/2), new THREE.Vector3(gridWidth/2, -gridHeight/2, i * cellSize - gridDepth/2), color));
    group.add(createLine(new THREE.Vector3(-gridWidth / 2, gridHeight/2, i * cellSize - gridDepth/2), new THREE.Vector3(gridWidth/2, gridHeight/2, i * cellSize - gridDepth/2), color));
   }
  // Create lines connecting corners
  group.add(createLine(new THREE.Vector3(-gridWidth / 2, -gridHeight / 2, -gridDepth / 2), new THREE.Vector3(-gridWidth / 2, -gridHeight / 2, gridDepth / 2), color));
  group.add(createLine(new THREE.Vector3(gridWidth / 2, -gridHeight / 2, -gridDepth / 2), new THREE.Vector3(gridWidth / 2, -gridHeight / 2, gridDepth / 2), color));
  group.add(createLine(new THREE.Vector3(-gridWidth / 2, gridHeight / 2, -gridDepth / 2), new THREE.Vector3(-gridWidth / 2, gridHeight / 2, gridDepth / 2), color));
  group.add(createLine(new THREE.Vector3(gridWidth / 2, gridHeight / 2, -gridDepth / 2), new THREE.Vector3(gridWidth / 2, gridHeight / 2, gridDepth / 2), color));

  return group;
}

// --- Sequencer Grid Creation ---
function createSequencerGrid(width, height, depth, cellSize, color, position, isLeftGrid = false) {
  const group = new THREE.Group();
  group.position.copy(position);

  const grid = createGrid(width, height, depth, cellSize, color);
  group.add(grid);

  const axisLength = Math.max(width, height, depth) / 2; // Or a fixed value
  const axis = createAxis(axisLength, SPHERE_RADIUS, 0xff0000, 0x00ff00, 0x0000ff, isLeftGrid);
  group.add(axis);

  return group;
}

function createAxis(length, sphereRadius, xColor = 0xff0000, yColor = 0x00ff00, zColor = 0x0000ff, isLeftGrid = false) {
  const group = new THREE.Group();
  const origin = new THREE.Vector3(0, 0, 0);

  // Create spheres for origin and axis ends
  const originSphere = createSphere(0xffffff, sphereRadius / 2); // White origin
  group.add(originSphere);

  const xSphere = createSphere(xColor, sphereRadius);
  xSphere.position.x = isLeftGrid ? -length : length;
  group.add(xSphere);

  const ySphere = createSphere(yColor, sphereRadius);
  ySphere.position.y = length; // Y is always positive for end
  group.add(ySphere);

  const zSphere = createSphere(zColor, sphereRadius);
  zSphere.position.z = length;
  group.add(zSphere);
  
  const zSphereNeg = createSphere(zColor, sphereRadius); // Negative Z sphere
  zSphereNeg.position.z = -length;
  group.add(zSphereNeg);


  // Create lines for axes
  // X-axis (red)
  group.add(createLine(origin, new THREE.Vector3(isLeftGrid ? -length : length, 0, 0), xColor));
  // Y-axis (green)
  group.add(createLine(origin, new THREE.Vector3(0, length, 0), yColor));
  group.add(createLine(origin, new THREE.Vector3(0, -length, 0), yColor)); // Negative Y
  // Z-axis (blue)
  group.add(createLine(origin, new THREE.Vector3(0, 0, length), zColor));
  group.add(createLine(origin, new THREE.Vector3(0, 0, -length), zColor)); // Negative Z

  return group;
}

// --- Column Creation Logic ---
function createColumn(x, y, dB, isLeftGrid = false) {
  // Column dimensions and geometry
  const columnWidth = 10; // Width of the column
  const columnDepth = 10; // Depth of the column
  const maxHeight = GRID_HEIGHT; // Max height based on grid
  const columnHeight = Math.max(0, (dB / 100) * maxHeight); // Calculate height based on dB

  const geometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth);
  
  // Find the appropriate semitone color
  let closestSemitone = state.semitones[0];
  for (let i = 1; i < state.semitones.length; i++) {
    if (Math.abs(state.semitones[i].y - y) < Math.abs(closestSemitone.y - y)) {
      closestSemitone = state.semitones[i];
    }
  }
  const material = new THREE.MeshPhongMaterial({ color: closestSemitone.color });
  const column = new THREE.Mesh(geometry, material);

  // Position the column
  // The y position should be such that the base of the column is at y, then add half its height.
  column.position.set(x, y + columnHeight / 2 - GRID_HEIGHT / 2, 0); 
  column.userData = { type: 'column', isLeft: isLeftGrid, originalY: y, originalDb: dB };

  return column;
}


function initializeColumns() {
  if (!state.semitones || state.semitones.length === 0) {
    console.error("Semitones not initialized in state. Call generateSemitonesData first.");
    return;
  }
  if (!state.leftSequencerGroup || !state.rightSequencerGroup) {
    console.error("Sequencer groups not initialized in state.");
    return;
  }

  state.columns = []; // Clear existing columns

  const numColumnsPerGrid = 12; // Example: 12 columns per grid
  const columnSpacing = GRID_WIDTH / (numColumnsPerGrid + 1);

  for (let i = 0; i < numColumnsPerGrid; i++) {
    const xPos = (i + 1) * columnSpacing - GRID_WIDTH / 2;
    // Initial dB value (e.g., 0, or some default)
    const initialDB = 0; // Or a small value to make them visible like 10-20

    // For each column position, create one for left and one for right grid
    // Y position will be determined by the semitone it represents, but for initialization,
    // we can place them at the bottom or associate with a default semitone.
    // Here, we'll just use a placeholder Y, actual Y in createColumn is based on semitone.
    // The critical part is adding them to the correct group.

    const leftColumnMesh = createColumn(xPos, 0, initialDB, true); // y=0 is placeholder
    state.leftSequencerGroup.add(leftColumnMesh);

    const rightColumnMesh = createColumn(xPos, 0, initialDB, false); // y=0 is placeholder
    state.rightSequencerGroup.add(rightColumnMesh);
    
    // Store references or data if needed, for now, meshes are directly added.
    // state.columns.push({ left: leftColumnMesh, right: rightColumnMesh, x: xPos });
    // The instruction asks to store the resulting columns array into state.columns.
    // script.js stores an object { left, right, x } for each column.
     state.columns.push({
        left: leftColumnMesh,
        right: rightColumnMesh,
        x: xPos,
        // Storing initial dB might be useful for updates
        // currentDBLeft: initialDB, 
        // currentDBRight: initialDB
    });
  }
  console.log('Columns initialized and added to sequencer groups and state.columns.');
}

// --- Setup Hologram Visuals ---
export function setupHologramVisuals() {
  if (!state.hologramPivot) {
    console.error("setupHologramVisuals: state.hologramPivot is not initialized. Call this after hologramPivot is created in initializeScene.");
    return;
  }

  state.semitones = generateSemitonesData();

  // Ensure mainSequencerGroup is initialized
  // It might be initialized in initializeScene, but ensure it here or pass it.
  // For this refactor, we'll assume it's created if not present.
  if (!state.mainSequencerGroup) {
      console.warn("setupHologramVisuals: state.mainSequencerGroup was not initialized. Creating it now.");
      state.mainSequencerGroup = new THREE.Group();
  }
  // Clear any existing children from mainSequencerGroup if we are re-setting up visuals
  while(state.mainSequencerGroup.children.length > 0){ 
    state.mainSequencerGroup.remove(state.mainSequencerGroup.children[0]); 
  }


  // Create sequencer grids
  state.leftSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    state.semitones[state.semitones.length - 1].color, // Last semitone color (e.g., violet)
    new THREE.Vector3(-GRID_WIDTH, 0, -GRID_DEPTH / 2), // Position for left grid
    true // isLeftGrid = true
  );
  state.rightSequencerGroup = createSequencerGrid(
    GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
    state.semitones[0].color, // First semitone color (e.g., red)
    new THREE.Vector3(0, 0, -GRID_DEPTH / 2),      // Position for right grid
    false // isLeftGrid = false
  );
  
  // Add groups to main sequencer group and then to pivot
  if (state.leftSequencerGroup) state.mainSequencerGroup.add(state.leftSequencerGroup);
  if (state.rightSequencerGroup) state.mainSequencerGroup.add(state.rightSequencerGroup);

  // Add main sequencer group to hologram pivot if not already added
  if (!state.hologramPivot.children.includes(state.mainSequencerGroup)) {
      state.hologramPivot.add(state.mainSequencerGroup);
  }
  
  state.mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0);

  // Initialize columns
  initializeColumns(); // This will use state.semitones and add columns to state.left/rightSequencerGroup
  console.log("Hologram visuals (sequencer grids and columns) set up.");
}


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
      return; // Stop execution if state is bad
  }

  // Calculate Available Dimensions
  const leftPanelWidthInitial = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
  const rightPanelWidthInitial = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
  const initialAvailableWidth = window.innerWidth - leftPanelWidthInitial - rightPanelWidthInitial;
  const initialAvailableHeight = window.innerHeight;

  // Инициализация основных объектов сцены, если они еще не созданы
  if (state.scene === null) {
      console.log('[DEBUG] initializeScene: state.scene is null, initializing...');
      state.scene = new THREE.Scene();
  }
  // Scene Background
  state.scene.background = null; // For transparency

  if (state.hologramPivot === null) {
      console.log('[DEBUG] initializeScene: state.hologramPivot is null, initializing...');
      state.hologramPivot = new THREE.Group();
      // Add hologramPivot to the scene IF it's newly created
      if (state.scene && !state.scene.children.includes(state.hologramPivot)) {
          state.scene.add(state.hologramPivot);
      }
  }
  // Ensure hologramPivot is in the scene (in case it was created earlier but not added)
  if (state.scene && state.hologramPivot && !state.scene.children.includes(state.hologramPivot)) {
    state.scene.add(state.hologramPivot);
  }


  // MainSequencerGroup should be initialized here or ensured by setupHologramVisuals
  // For clarity, let's ensure it's initialized before setupHologramVisuals potentially uses it.
  if (state.mainSequencerGroup === null) {
    state.mainSequencerGroup = new THREE.Group();
  }


  console.log('[DEBUG] initializeScene: state.hologramPivot ensured:', state.hologramPivot);
  // console.log('[DEBUG] initializeScene: state.mainSequencerGroup ensured:', state.mainSequencerGroup); // Will be logged in setupHologramVisuals

  // REMOVED old sequencer grid creation logic
  // state.leftSequencerGroup = createSequencerGrid(...);
  // state.rightSequencerGroup = createSequencerGrid(...);
  // if (state.mainSequencerGroup) { ... }
  // if (state.hologramPivot) { ... } // hologramPivot now adds mainSequencerGroup within setupHologramVisuals
  // if (state.scene) { ... } // scene now adds hologramPivot directly

  // Call setupHologramVisuals to create semitones, sequencer grids, and columns
  setupHologramVisuals(); // This will populate state.semitones, state.left/rightSequencerGroup, state.columns

  // The following lines for positioning mainSequencerGroup and hologramPivot
  // are now handled within setupHologramVisuals or should be set there.
  // state.mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0); // Done in setupHologramVisuals
  state.hologramPivot.position.set(0, 0, 0); // Initial position for pivot
  // state.mainSequencerGroup.rotation.set(0, 0, 0); // Default, can be set if needed

  // Camera Setup
  // Orthographic Camera
  state.orthoCamera = new THREE.OrthographicCamera(
    initialAvailableWidth / -2,
    initialAvailableWidth / 2,
    initialAvailableHeight / 2,
    initialAvailableHeight / -2,
    1,
    2000 // Increased far plane for ortho camera to see objects at z=1200
  );
  state.orthoCamera.position.set(0, 0, 1200);
  state.orthoCamera.lookAt(0, 0, 0);

  // Perspective Camera (for XR)
  state.xrCamera = new THREE.PerspectiveCamera(70, initialAvailableWidth / initialAvailableHeight, 0.1, 10000);
  state.xrCamera.position.set(0, 0, 0); // XR camera typically starts at origin
  state.xrCamera.lookAt(new THREE.Vector3(0, 0, -1)); // Looking down the -Z axis

  // Active Camera
  state.activeCamera = state.orthoCamera;

  // Existing state.camera (Perspective for general use, if still needed)
  // For now, we prioritize orthoCamera as active. If state.camera is used elsewhere,
  // ensure its configuration is compatible or update those usages.
  if (state.camera === null) {
    console.log('[DEBUG] initializeScene: state.camera (fallback perspective) is null, initializing...');
    state.camera = new THREE.PerspectiveCamera(
      state.config.CAMERA.fov,
      initialAvailableWidth / initialAvailableHeight, // Use calculated aspect
      state.config.CAMERA.near,
      state.config.CAMERA.far
    );
    state.camera.position.set(
      state.config.CAMERA.initialPosition.x,
      state.config.CAMERA.initialPosition.y,
      state.config.CAMERA.initialPosition.z
    );
    console.log('[DEBUG] initializeScene: state.camera (fallback perspective) initialized:', state.camera);
  } else {
    // If state.camera already exists, update its aspect ratio
    state.camera.aspect = initialAvailableWidth / initialAvailableHeight;
    state.camera.updateProjectionMatrix();
  }


  // Lights Setup
  state.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  state.scene.add(state.ambientLight);

  state.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  state.directionalLight.position.set(0, 1, 1); // Position from script.js (adjust if needed)
  state.scene.add(state.directionalLight);

  state.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6); // Sky, Ground, Intensity
  state.scene.add(state.hemisphereLight);

  state.spotLight = new THREE.SpotLight(0xffffff, 0.7, 0, Math.PI / 4, 1); // color, intensity, distance, angle, penumbra
  state.spotLight.position.set(0, 500, 200); // Example position, adjust as per script.js if specified
  state.spotLight.target = state.hologramPivot; // Assuming spotlight should target the pivot
  state.scene.add(state.spotLight);
  // Note: script.js had spotLight.target.position.set(0,0,0) which is default for new Object3D.
  // If hologramPivot is not at (0,0,0), this might need adjustment or ensure target is added to scene if not hologramPivot.

  // gridPointLight in script.js seems to be a regular PointLight for the grid.
  state.gridPointLight = new THREE.PointLight(0xffffff, 0.75, 1000); // color, intensity, distance
  state.gridPointLight.position.set(0, 0, 250); // Position from script.js
  state.scene.add(state.gridPointLight);


  // Renderer Setup
  if (state.renderer === null) {
    console.log('[DEBUG] initializeScene: state.renderer is null, initializing...');
    state.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false, // from script.js
      logarithmicDepthBuffer: true // from script.js
    });
    console.log('[DEBUG] initializeScene: state.renderer initialized:', state.renderer);
  }
  // Common renderer setup regardless of whether it was just created or existed
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.setSize(initialAvailableWidth, initialAvailableHeight);
  state.renderer.autoClear = false; // Added as per Block C instructions (missed from Block A)
  state.renderer.domElement.style.zIndex = '5';
  state.renderer.domElement.style.position = 'relative';


  // Добавление элемента рендерера в DOM
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    if (!gridContainer.contains(state.renderer.domElement)) { // Avoid appending multiple times
        gridContainer.appendChild(state.renderer.domElement);
    }
    console.log('[DEBUG] initializeScene: renderer.domElement ensured in #grid-container');
  } else {
    console.error('initializeScene: #grid-container not found, cannot append renderer.domElement.');
  }


  // Обновление аспекта камеры и размера рендерера при изменении размера окна
  window.addEventListener('resize', () => {
    const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
    const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
    const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;
    const availableHeight = window.innerHeight;

    if (state.orthoCamera) {
        state.orthoCamera.left = availableWidth / -2;
        state.orthoCamera.right = availableWidth / 2;
        state.orthoCamera.top = availableHeight / 2;
        state.orthoCamera.bottom = availableHeight / -2;
        state.orthoCamera.updateProjectionMatrix();
    }
    if (state.xrCamera) {
        state.xrCamera.aspect = availableWidth / availableHeight;
        state.xrCamera.updateProjectionMatrix();
    }
    // Update the fallback perspective camera as well
    if (state.camera) {
      state.camera.aspect = availableWidth / availableHeight;
      state.camera.updateProjectionMatrix();
    }

    if (state.renderer) {
      state.renderer.setSize(availableWidth, availableHeight);
      // state.renderer.setPixelRatio(window.devicePixelRatio); // Usually not needed on resize, but doesn't harm.
    }
  });
}