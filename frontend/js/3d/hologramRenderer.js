import * as THREE from 'three';
import { semitones, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js';

export class HologramRenderer {
  constructor(scene) {
    this.scene = scene;
    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0);
    this.hologramPivot.add(this.mainSequencerGroup);

    this.columns = [];
    this.leftSequencerGroup = null; // Will be initialized in _createSequencerGrids
    this.rightSequencerGroup = null; // Will be initialized in _createSequencerGrids

    this._createSequencerGrids();
    this._initializeColumns();

    this.scene.add(this.hologramPivot);
  }

  // Private helper methods for axis creation
  _createSphereForAxis(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color }));
  }

  _createLineForAxis(startVec, endVec, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([startVec, endVec]);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  }

  _createAxis(xLength, yLength, zLength, sphereRadiusInput, isLeftGrid) {
    const axisGroup = new THREE.Group();
    const sphereRadius = sphereRadiusInput || (0.5 * CELL_SIZE);

    const origin = new THREE.Vector3(0, 0, 0);
    const xEnd = new THREE.Vector3(xLength, 0, 0);
    const yEnd = new THREE.Vector3(0, yLength, 0);
    const zEnd = new THREE.Vector3(0, 0, zLength);

    const colorX = isLeftGrid ? 0x800080 : 0xFF0000; // Purple for left, Red for right
    const colorY = 0x00FF00; // Green
    const colorZ = 0xFFFFFF; // White

    // Spheres at origin and ends of axes
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorX)); // Origin sphere (X color)
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorX).translateX(xLength));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorY).translateY(yLength));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorZ).translateZ(zLength));
    
    // Lines for axes
    axisGroup.add(this._createLineForAxis(origin, xEnd, colorX)); // X-axis
    axisGroup.add(this._createLineForAxis(origin, yEnd, colorY)); // Y-axis
    axisGroup.add(this._createLineForAxis(origin, zEnd, colorZ)); // Z-axis

    return axisGroup;
  }

  _createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color) {
    const points = [];
    const divisionsX = Math.floor(gridWidth / cellSize);
    const divisionsY = Math.floor(gridHeight / cellSize);
    const divisionsZ = Math.floor(gridDepth / cellSize);

    // Lines along X-axis
    for (let i = 0; i <= divisionsY; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(0, i * cellSize, j * cellSize, gridWidth, i * cellSize, j * cellSize);
      }
    }
    // Lines along Y-axis
    for (let i = 0; i <= divisionsX; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(i * cellSize, 0, j * cellSize, i * cellSize, gridHeight, j * cellSize);
      }
    }
    // Lines along Z-axis
    for (let i = 0; i <= divisionsX; i++) {
      for (let j = 0; j <= divisionsY; j++) {
        points.push(i * cellSize, j * cellSize, 0, i * cellSize, j * cellSize, gridDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ 
        color, 
        opacity: 0.1, 
        transparent: true, 
        depthWrite: false, // To prevent grid lines from obscuring objects behind them
        depthTest: false   // To ensure grid lines are always visible (or based on transparency)
    });
    return new THREE.LineSegments(geometry, material);
  }

  _createSequencerGrid(width, height, depth, cellSize, color, position, isLeftGrid) {
    const group = new THREE.Group();
    
    const gridVis = this._createGridVisualization(width, height, depth, cellSize, color);
    group.add(gridVis);

    const axis = this._createAxis(width, height, depth, cellSize * 0.5, isLeftGrid);
    group.add(axis);

    group.position.copy(position);
    return group;
  }

  _createSequencerGrids() {
    const leftColor = semitones.length > 0 ? semitones[semitones.length - 1].color : new THREE.Color(0x800080); // Default purple
    const rightColor = semitones.length > 0 ? semitones[0].color : new THREE.Color(0xFF0000); // Default red

    this.leftSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      leftColor,
      new THREE.Vector3(-GRID_WIDTH, 0, -GRID_DEPTH / 2),
      true
    );
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      rightColor,
      new THREE.Vector3(0, 0, -GRID_DEPTH / 2),
      false
    );
    this.mainSequencerGroup.add(this.rightSequencerGroup);
  }

  _createColumn(semitoneIndex, isLeftGrid) {
    const semitone = semitones[semitoneIndex];
    if (!semitone) {
        console.error(`No semitone data for index: ${semitoneIndex}`);
        return new THREE.Group(); // Return empty group if data is missing
    }
    const width = semitone.width;
    const columnGroup = new THREE.Group();

    // Position the group itself. The mesh within will be relative to this group.
    // For left grid, X is at the "far right" of its grid space, columns grow "inwards" (negative X for mesh)
    // For right grid, X is at the "far left" of its grid space, columns grow "outwards" (positive X for mesh)
    // The prompt seems to imply columns are positioned based on their own width within their grid space:
    // isLeftGrid ? (GRID_WIDTH - width) : 0; This might mean the group's origin.
    // Let's stick to the prompt's positioning logic for the group.
    columnGroup.position.x = isLeftGrid ? (GRID_WIDTH - width) : 0;

    const geometry = new THREE.BoxGeometry(width, 2, 1); // width, height, depth
    const material = new THREE.MeshBasicMaterial({ color: semitone.color });
    const columnMesh = new THREE.Mesh(geometry, material);

    // Position the mesh within its group.
    // The mesh's local X should be its center (width / 2).
    // Y position is based on semitoneIndex.
    // Z position will be animated (starts at 0, relative to group).
    columnMesh.position.set(width / 2, (semitoneIndex + 1) * 2, 0);
    
    columnGroup.add(columnMesh);
    return columnGroup;
  }

  _initializeColumns() {
    if (!this.leftSequencerGroup || !this.rightSequencerGroup) {
        console.error("Sequencer groups not initialized before columns.");
        return;
    }
    for (let i = 0; i < semitones.length; i++) {
      const columnLeft = this._createColumn(i, true);
      const columnRight = this._createColumn(i, false);

      this.columns.push({
        left: columnLeft,
        right: columnRight,
        semitoneData: semitones[i],
      });

      this.leftSequencerGroup.add(columnLeft);
      this.rightSequencerGroup.add(columnRight);
    }
  }

  updateColumnVisuals(leftAudioLevels, rightAudioLevels) {
    if (!leftAudioLevels || !rightAudioLevels) {
        // console.warn("Audio levels not provided for column update.");
        return; // Or set all to minimum
    }

    this.columns.forEach((columnPair, i) => {
      const channels = [
        { levels: leftAudioLevels, meshGroup: columnPair.left, isLeft: true },
        { levels: rightAudioLevels, meshGroup: columnPair.right, isRight: true },
      ];

      channels.forEach(channel => {
        if (!channel.meshGroup || !channel.meshGroup.children || channel.meshGroup.children.length === 0) {
          // console.warn(`Mesh group or mesh not found for column ${i}, channel ${channel.isLeft ? 'left' : 'right'}`);
          return;
        }
        const mesh = channel.meshGroup.children[0];
        if (!(mesh instanceof THREE.Mesh)) {
            // console.warn(`Child is not a mesh for column ${i}, channel ${channel.isLeft ? 'left' : 'right'}`);
            return;
        }

        const audioLevel = channel.levels[i] !== undefined ? channel.levels[i] : -100; // Default to silence
        const normalizedDB = THREE.MathUtils.clamp((audioLevel + 100) / 130, 0, 1);

        // Ensure material color is set (it might change if we add features like selection later)
        mesh.material.color.copy(columnPair.semitoneData.color);

        if (!normalizedDB || normalizedDB <= 0.001) { // Handles NaN, null, undefined, 0, and very low values
          mesh.scale.z = 0.001;
          mesh.position.z = 0.0005; // Position slightly to avoid z-fighting if at 0
        } else {
          mesh.scale.z = normalizedDB * GRID_HEIGHT; // Max depth extent is GRID_HEIGHT
          mesh.position.z = (normalizedDB * GRID_HEIGHT) / 2; // Position center of scaled mesh
        }
      });
    });
  }

  getHologramPivot() {
    return this.hologramPivot;
  }
}
