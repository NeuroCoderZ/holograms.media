import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js';
import semitones from '../config/semitones.js';

const BASE_CELL_WIDTH_UNIT = GRID_WIDTH / 8515.0;

/**
 * HologramRenderer class manages the 3D visualization of the hologram in the Three.js scene.
 * It creates and updates a grid-like structure representing audio data, with columns 
 * that react to audio levels.
 */
export class HologramRenderer {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to which the hologram will be added.
   */
  constructor(scene) {
    this.scene = scene;

    // hologramPivot is the main group that holds all hologram elements.
    // It allows for easy positioning, rotation, and scaling of the entire hologram.
    this.hologramPivot = new THREE.Group();

    // mainSequencerGroup holds the left and right sequencer grids. It's positioned
    // relative to the hologramPivot.
    this.mainSequencerGroup = new THREE.Group();
    this.mainSequencerGroup.position.set(0, 0, 0); // Changed: No longer vertically centering mainSequencerGroup itself
    this.hologramPivot.add(this.mainSequencerGroup);

    // Add a central white sphere to the hologramPivot's origin
    const centralWhiteSphere = this._createCentralMarkerSphere(CELL_SIZE * 0.3, 0xffffff);
    this.hologramPivot.add(centralWhiteSphere);

    // Array to store references to the visual columns (meshes) that react to audio.
    this.columns = [];

    // Groups for the left and right sequencer grids, initialized later.
    this.leftSequencerGroup = null;
    this.rightSequencerGroup = null;

    // Initialize the 3D grid structures and columns.
    this._createSequencerGrids();
    this._initializeColumns();

    // Add the main hologram pivot to the Three.js scene.
    this.scene.add(this.hologramPivot);
  }

  _createColumnMesh(semitoneId, semitoneColor) {
    const id = Math.max(0, Math.min(129, semitoneId));
    const columnWidth = (130.0 - id) * BASE_CELL_WIDTH_UNIT;
    const columnHeight = GRID_HEIGHT * 0.01; // Initial small height
    const columnDepth = BASE_CELL_WIDTH_UNIT * 10.0; // Proportional depth

    const geometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth);
    const material = new THREE.MeshStandardMaterial({
        color: semitoneColor,
        emissive: semitoneColor,
        emissiveIntensity: 0.0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = columnHeight / 2.0;
    return mesh;
  }

  // --- Private Helper Methods for 3D Object Creation ---

  /**
   * Creates a small sphere mesh for marking central points.
   * @param {number} radius - Radius of the sphere.
   * @param {number} color - Hexadecimal color of the sphere.
   * @returns {THREE.Mesh} A Three.js Mesh object representing a sphere.
   */
  _createCentralMarkerSphere(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color }));
  }

  /**
   * Creates a sphere mesh for axis visualization.
   * @param {number} radius - Radius of the sphere.
   * @param {number} color - Hexadecimal color of the sphere.
   * @returns {THREE.Mesh} A Three.js Mesh object representing a sphere.
   */
  _createSphereForAxis(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color }));
  }

  /**
   * Creates a line segment for axis visualization.
   * @param {THREE.Vector3} startVec - Starting point of the line.
   * @param {THREE.Vector3} endVec - Ending point of the line.
   * @param {number} color - Hexadecimal color of the line.
   * @returns {THREE.Line} A Three.js Line object.
   */
  _createLineForAxis(startVec, endVec, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([startVec, endVec]);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  }

  _createLine2ForAxis(points, color, linewidth) {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flat()); // points should be an array of [x1,y1,z1, x2,y2,z2, ...]

    const material = new LineMaterial({
      color: color,
      linewidth: linewidth, // in world units
      // Other properties like vertexColors, dashed, gapSize, dashSize can be added if needed
    });
    // material.resolution.set(window.innerWidth, window.innerHeight); // you may need to set resolution
    const line = new Line2(geometry, material);
    line.computeLineDistances(); // Important for correct rendering
    line.scale.set(1, 1, 1); // Ensure scale is identity
    return line;
  }

  /**
   * Creates a set of XYZ axes (lines and spheres) for a grid.
   * @param {number} xLength - Length of the X-axis.
   * @param {number} yLength - Length of the Y-axis.
   * @param {number} zLength - Length of the Z-axis.
   * @param {number} sphereRadiusInput - Radius for the spheres at axis ends/origin.
   * @param {boolean} isLeftGrid - True if creating axes for the left grid. (Retained for signature compatibility, but not used for axis coloring directly now)
   * @returns {THREE.Group} A Three.js Group containing the axis visualization.
   */
  _createAxis(xLength, yLength, zLength, sphereRadiusInput, isLeftGrid) {
    const axisGroup = new THREE.Group();
    // const sphereRadius = (sphereRadiusInput || (0.5 * CELL_SIZE)) * 4; // Original line modified
    const sphereRadius = (0.5 * CELL_SIZE) * 4; // Simplified as per subtask, assuming sphereRadiusInput is effectively 0.5 * CELL_SIZE

    const desiredLineWidth = 0.02; // World units for LineMaterial

    const origin = new THREE.Vector3(0, 0, 0);
    
    // Define end points for positive and negative axes
    const xEndPos = new THREE.Vector3(xLength, 0, 0);
    const xEndNeg = new THREE.Vector3(-xLength, 0, 0); // Negative X-axis
    const yEndPos = new THREE.Vector3(0, yLength, 0);
    const zEndPos = new THREE.Vector3(0, 0, zLength);

    // Define colors for each axis
    const colorXpos = 0xFF0000; // Red for X+
    const colorXneg = 0x800080; // Purple for X-
    const colorYpos = 0x00FF00; // Green for Y+
    const colorZpos = 0xFFFFFF; // White for Z+
    // const colorOriginSphere = 0x808080; // Grey for origin sphere, if needed

    // Create axis lines using _createLine2ForAxis
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, xEndPos.x, xEndPos.y, xEndPos.z], colorXpos, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, xEndNeg.x, xEndNeg.y, xEndNeg.z], colorXneg, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, yEndPos.x, yEndPos.y, yEndPos.z], colorYpos, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, zEndPos.x, zEndPos.y, zEndPos.z], colorZpos, desiredLineWidth));

    // Create spheres at the ends of the axes
    // No longer adding a sphere at the origin directly here, only at ends.
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorXpos).translateX(xLength));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorXneg).translateX(-xLength));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorYpos).translateY(yLength));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorZpos).translateZ(zLength));

    return axisGroup;
  }

  /**
   * Creates a wireframe grid visualization (a cube of lines).
   * @param {number} gridWidth - Total width of the grid.
   * @param {number} gridHeight - Total height of the grid.
   * @param {number} gridDepth - Total depth of the grid.
   * @param {number} cellSize - Size of each cell in the grid.
   * @param {number} color - Hexadecimal color of the grid lines.
   * @returns {THREE.LineSegments} A Three.js LineSegments object representing the grid.
   */
  _createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color) {
    const points = [];
    const divisionsX = Math.floor(gridWidth / cellSize);
    const divisionsY = Math.floor(gridHeight / cellSize);
    const divisionsZ = Math.floor(gridDepth / cellSize);

    // Generate points for lines along X, Y, and Z axes to form a 3D grid.
    // Lines along X-axis (varying Y, Z positions)
    for (let i = 0; i <= divisionsY; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(0, i * cellSize, j * cellSize, gridWidth, i * cellSize, j * cellSize);
      }
    }
    // Lines along Y-axis (varying X, Z positions)
    for (let i = 0; i <= divisionsX; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(i * cellSize, 0, j * cellSize, i * cellSize, gridHeight, j * cellSize);
      }
    }
    // Lines along Z-axis (varying X, Y positions)
    for (let i = 0; i <= divisionsX; i++) {
      for (let j = 0; j <= divisionsY; j++) {
        points.push(i * cellSize, j * cellSize, 0, i * cellSize, j * cellSize, gridDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
        color, 
        opacity: 0.002, // Changed from 0.001
        transparent: true,
        // Disable depth testing/writing to ensure grid lines are always visible
        // and don't interfere with objects drawn at the same Z-depth.
        depthWrite: false,
        depthTest: false
    });
    return new THREE.LineSegments(geometry, material);
  }

  /**
   * Creates a single sequencer grid, comprising a wireframe grid and its axes.
   * @param {number} width - Width of the grid.
   * @param {number} height - Height of the grid.
   * @param {number} depth - Depth of the grid.
   * @param {number} cellSize - Size of each cell.
   * @param {number} color - Color of the grid and axes.
   * @param {THREE.Vector3} position - Position of this grid group relative to its parent.
   * @param {boolean} isLeftGrid - Flag to determine axis colors.
   * @returns {THREE.Group} A Three.js Group containing the grid visualization and axes.
   */
  _createSequencerGrid(width, height, depth, cellSize, color, position, isLeftGrid) {
    const group = new THREE.Group();
    
    // The sphereRadiusInput parameter to _createAxis was cellSize * 0.5.
    // Since _createAxis now multiplies this by 4 internally, we pass the original value.
    const sphereRadiusForAxis = cellSize * 0.5;

    const gridVis = this._createGridVisualization(width, height, depth, cellSize, color);
    // group.add(gridVis);

    const axis = this._createAxis(width, height, depth, sphereRadiusForAxis, isLeftGrid);
    group.add(axis);

    // Add a green marker sphere at the center of this grid group
    const gridCenterSphere = this._createCentralMarkerSphere(CELL_SIZE * 0.3, 0x00ff00);
    group.add(gridCenterSphere);

    group.position.copy(position);
    return group;
  }

  /**
   * Initializes the left and right sequencer grids and adds them to the main sequencer group.
   * The colors are derived from the `semitones` configuration.
   */
  _createSequencerGrids() {
    // Use colors from semitones config or fall back to defaults.
    const leftColor = semitones.length > 0 ? semitones[semitones.length - 1].color : new THREE.Color(0x800080); // Default purple
    const rightColor = semitones.length > 0 ? semitones[0].color : new THREE.Color(0xFF0000); // Default red

    const interGridSpacing = 0; // Changed from CELL_SIZE * 2

    // Create the left sequencer grid
    // Positioned so its right edge is at -(interGridSpacing / 2)
    // Vertically centered by applying -GRID_HEIGHT / 2 to its Y position
    // Z position is -GRID_DEPTH / 2 to center it along Z if depth is considered
    this.leftSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      leftColor,
      new THREE.Vector3(-GRID_WIDTH - (interGridSpacing / 2), -GRID_HEIGHT / 2, -GRID_DEPTH / 2),
      true // Indicate it's the left grid
    );
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    // Create the right sequencer grid
    // Positioned so its left edge is at (interGridSpacing / 2)
    // Vertically centered by applying -GRID_HEIGHT / 2 to its Y position
    // Z position is -GRID_DEPTH / 2
    this.rightSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      rightColor,
      new THREE.Vector3(interGridSpacing / 2, -GRID_HEIGHT / 2, -GRID_DEPTH / 2),
      false // Indicate it's the right grid
    );
    this.mainSequencerGroup.add(this.rightSequencerGroup);
  }

  /**
   * Creates a single visual column (a Three.js BoxGeometry) representing a semitone.
   * These columns will later be scaled based on audio levels.
   * @param {number} semitoneIndex - Index of the semitone in the `semitones` array.
   * @param {boolean} isLeftGrid - True if the column belongs to the left grid.
   * @returns {THREE.Group} A Three.js Group containing the column mesh.
   */
  _createColumn(semitoneIndex, isLeftGrid) {
    const semitone = semitones[semitoneIndex];
    if (!semitone) {
        console.error(`No semitone data for index: ${semitoneIndex}. Returning empty group.`);
        return new THREE.Group(); // Return empty group if data is missing
    }
    const width = semitone.width; // Width of the column based on semitone data.
    const columnGroup = new THREE.Group();

    // Position the column group within its respective grid.
    // For the left grid, columns are placed starting from the right edge and grow inwards.
    // For the right grid, columns are placed starting from the left edge and grow outwards.
    columnGroup.position.x = isLeftGrid ? (GRID_WIDTH - width) : 0;

    // Create the basic box geometry for the column. Height and depth are initially fixed.
    const geometry = new THREE.BoxGeometry(width, 2, 1); // width, height, depth
    const material = new THREE.MeshStandardMaterial({ color: semitone.color }); // Color from semitone data
    const columnMesh = new THREE.Mesh(geometry, material);

    // Position the mesh within its parent group.
    // The mesh's local X should be its center (half its width).
    // Y position is based on the semitone index (to stack them vertically).
    // Z position is initially at 0, as its depth will be animated.
    columnMesh.position.set(width / 2, (semitoneIndex + 1) * 2, 0);
    
    columnGroup.add(columnMesh);
    return columnGroup;
  }

  /**
   * Initializes all columns based on the `semitones` configuration
   * and adds them to their respective sequencer groups.
   */
  _initializeColumns() {
    if (!this.leftSequencerGroup || !this.rightSequencerGroup) {
        console.error("Sequencer groups not initialized before columns can be created.");
        return;
    }

    if (this.leftSequencerGroup) {
        while(this.leftSequencerGroup.children.length > 0) {
            this.leftSequencerGroup.remove(this.leftSequencerGroup.children[0]);
        }
    }
    if (this.rightSequencerGroup) {
        while(this.rightSequencerGroup.children.length > 0) {
            this.rightSequencerGroup.remove(this.rightSequencerGroup.children[0]);
        }
    }

    this.columns = new Array(semitones.length);

    let currentOffsetLeft = 0.0;
    let currentOffsetRight = 0.0;

    for (let i = 0; i < semitones.length; i++) {
        const semitone = semitones[i];

        const leftColumnMesh = this._createColumnMesh(semitone.id, semitone.color);
        const rightColumnMesh = this._createColumnMesh(semitone.id, semitone.color);

        const columnWidth = leftColumnMesh.geometry.parameters.width;

        leftColumnMesh.position.x = -currentOffsetLeft - (columnWidth / 2.0);
        this.leftSequencerGroup.add(leftColumnMesh);
        currentOffsetLeft += columnWidth;

        rightColumnMesh.position.x = currentOffsetRight + (columnWidth / 2.0);
        this.rightSequencerGroup.add(rightColumnMesh);
        currentOffsetRight += columnWidth;

        this.columns[semitone.id] = {
            leftMesh: leftColumnMesh,
            rightMesh: rightColumnMesh,
            semitoneData: semitone,
            initialLeftMeshX: leftColumnMesh.position.x,
            initialRightMeshX: rightColumnMesh.position.x
        };
    }
  }

  updateVisuals(levels, angles) {
    if (!levels || !angles || levels.length !== 260 || angles.length !== 130) {
        this.columns.forEach(colPair => {
            if (colPair && colPair.leftMesh) {
                colPair.leftMesh.scale.y = 0.01;
                colPair.leftMesh.position.y = (GRID_HEIGHT * 0.01) / 2.0;
                colPair.leftMesh.material.emissiveIntensity = 0.0;
            }
            if (colPair && colPair.rightMesh) {
                colPair.rightMesh.scale.y = 0.01;
                colPair.rightMesh.position.y = (GRID_HEIGHT * 0.01) / 2.0;
                colPair.rightMesh.material.emissiveIntensity = 0.0;
            }
        });
        return;
    }

    const MAX_PAN_SHIFT = GRID_WIDTH / 10.0;

    for (let i = 0; i < 130; i++) {
        const columnPair = this.columns[i];
        if (!columnPair || !columnPair.leftMesh || !columnPair.rightMesh) {
            continue;
        }

        const leftMesh = columnPair.leftMesh;
        const rightMesh = columnPair.rightMesh;

        const dbLeft = levels[i];
        const dbRight = levels[i + 130];

        const normalizedVolLeft = Math.max(0.0, Math.min(1.0, (dbLeft + 60.0) / 60.0));
        const normalizedVolRight = Math.max(0.0, Math.min(1.0, (dbRight + 60.0) / 60.0));

        const targetScaleYLeft = Math.max(0.01, normalizedVolLeft * GRID_HEIGHT);
        const targetScaleYRight = Math.max(0.01, normalizedVolRight * GRID_HEIGHT);

        leftMesh.scale.y = targetScaleYLeft;
        leftMesh.position.y = targetScaleYLeft / 2.0;
        leftMesh.material.emissiveIntensity = normalizedVolLeft;
        if (normalizedVolLeft > 0.001 && leftMesh.material.emissive.getHex() === 0x000000) {
            leftMesh.material.emissive.set(columnPair.semitoneData.color);
        } else if (normalizedVolLeft <= 0.001) {
            leftMesh.material.emissiveIntensity = 0.0;
        }

        rightMesh.scale.y = targetScaleYRight;
        rightMesh.position.y = targetScaleYRight / 2.0;
        rightMesh.material.emissiveIntensity = normalizedVolRight;
        if (normalizedVolRight > 0.001 && rightMesh.material.emissive.getHex() === 0x000000) {
            rightMesh.material.emissive.set(columnPair.semitoneData.color);
        } else if (normalizedVolRight <= 0.001) {
            rightMesh.material.emissiveIntensity = 0.0;
        }

        const panAngle = angles[i];
        const normalizedPan = Math.max(-1.0, Math.min(1.0, panAngle / 90.0));
        const shiftAmount = normalizedPan * MAX_PAN_SHIFT;

        leftMesh.position.x = columnPair.initialLeftMeshX + shiftAmount;
        rightMesh.position.x = columnPair.initialRightMeshX + shiftAmount;
    }
  }

  /**
   * Returns the main pivot group of the hologram, which can be added to the scene.
   * @returns {THREE.Group} The main hologram pivot group.
   */
  getHologramPivot() {
    return this.hologramPivot;
  }
}
