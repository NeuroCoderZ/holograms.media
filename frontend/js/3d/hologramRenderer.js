import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js';
import { semitones, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js';

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

    // Create axis lines using _createLine2ForAxis
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, xEndPos.x, xEndPos.y, xEndPos.z], colorXpos, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, xEndNeg.x, xEndNeg.y, xEndNeg.z], colorXneg, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, yEndPos.x, yEndPos.y, yEndPos.z], colorYpos, desiredLineWidth));
    axisGroup.add(this._createLine2ForAxis([origin.x, origin.y, origin.z, zEndPos.x, zEndPos.y, zEndPos.z], colorZpos, desiredLineWidth));

    // Create spheres at the ends of the axes
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
    
    const sphereRadiusForAxis = cellSize * 0.5;

    const gridVis = this._createGridVisualization(width, height, depth, cellSize, color);
    group.add(gridVis);

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
    this.leftSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      leftColor,
      new THREE.Vector3(-GRID_WIDTH - (interGridSpacing / 2), -GRID_HEIGHT / 2, -GRID_DEPTH / 2),
      true // Indicate it's the left grid
    );
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    // Create the right sequencer grid
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
        return new THREE.Group(); // Return empty group if data is missing
    }
    const width = semitone.width; // Width of the column based on semitone data.
    const columnGroup = new THREE.Group();

    // Store initial X position relative to its grid for pan angle application
    const initialX = isLeftGrid ? (GRID_WIDTH - width) : 0;
    columnGroup.position.x = initialX;
    columnGroup.userData.initialX = initialX; // Store for later updates

    const geometry = new THREE.BoxGeometry(width, 2, 1); // width, height, depth
    const material = new MeshBasicNodeMaterial({ color: semitone.color }); // Color from semitone data
    const columnMesh = new THREE.Mesh(geometry, material);

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

  /**
   * Updates the visual appearance of the columns based on real-time audio data.
   * Each column's Z-scale (depth) and front-face brightness (emissiveIntensity) are adjusted.
   * Their X-position is also adjusted based on pan angles.
   * @param {Float32Array} dbLevels - Array of 260 decibel values (130 for left, 130 for right).
   * @param {Float32Array} panAngles - Array of 130 pan angles in degrees (-90 to +90).
   */
  updateVisuals(dbLevels, panAngles) {
    // if (!dbLevels || !panAngles || dbLevels.length !== 260 || panAngles.length !== 130) {
    //     // Optionally, reset all columns to a default silent/centered state
    //     this.columns.forEach((columnPair) => {
    //         const channels = [
    //             { meshGroup: columnPair.left, isLeft: true },
    //             { meshGroup: columnPair.right, isLeft: false },
    //         ];
    //         channels.forEach(channel => {
    //             if (channel.meshGroup && channel.meshGroup.children && channel.meshGroup.children.length > 0) {
    //                 const mesh = channel.meshGroup.children[0];
    //                 if (mesh instanceof THREE.Mesh) {
    //                     mesh.scale.z = 0.001;
    //                     mesh.position.z = 0.0005;
    //                     if (mesh.material instanceof THREE.MeshStandardMaterial) { // This check might also need update if material changes
    //                         mesh.material.emissiveIntensity = 0;
    //                     }
    //                     // Reset X position to initial state
    //                     if (channel.meshGroup.userData.initialX !== undefined) {
    //                         channel.meshGroup.position.x = channel.meshGroup.userData.initialX;
    //                     }
    //                 }
    //             }
    //         });
    //     });
    //     return;
    // }
    //
    // this.columns.forEach((columnPair, index) => { // 'index' corresponds to semitone index (0-129)
    //   const leftLevel = dbLevels[index];
    //   const rightLevel = dbLevels[index + 130];
    //   const panAngle = panAngles[index];
    //
    //   const channels = [
    //     { level: leftLevel, meshGroup: columnPair.left, isLeft: true },
    //     { level: rightLevel, meshGroup: columnPair.right, isLeft: false },
    //   ];
    //
    //   channels.forEach(channel => {
    //     if (!channel.meshGroup || !channel.meshGroup.children || channel.meshGroup.children.length === 0) {
    //       return;
    //     }
    //     const mesh = channel.meshGroup.children[0];
    //     if (!(mesh instanceof THREE.Mesh)) {
    //       return;
    //     }
    //     const material = mesh.material;
    //
    //     // Normalize dB value (-100 to 0) to an amplitude (0 to 1)
    //     const normalizedAmplitude = THREE.MathUtils.clamp((channel.level + 100) / 100.0, 0, 1);
    //
    //     // Ensure base color is set (safety check)
    //     if (material.color && columnPair.semitoneData && material.color.getHex() !== columnPair.semitoneData.color.getHex()) {
    //         material.color.copy(columnPair.semitoneData.color);
    //     }
    //
    //     let targetScaleZ = normalizedAmplitude * GRID_DEPTH;
    //     if (isNaN(targetScaleZ) || targetScaleZ <= 0.001) {
    //       targetScaleZ = 0.001; // Minimum visible depth
    //     }
    //
    //     // Directly assign the Z-scale and Z-position
    //     mesh.scale.z = targetScaleZ;
    //     mesh.position.z = targetScaleZ / 2; // Center the scaled mesh
    //
    //     // Update emissive intensity
    //     // For MeshBasicNodeMaterial, emissiveIntensity might not be directly applicable in the same way.
    //     // This part might need adjustment or removal if MeshBasicNodeMaterial doesn't support it or handles it differently.
    //     // For Phase 1, focusing on basic rendering, so complex material properties can be simplified.
    //     if (material instanceof THREE.MeshStandardMaterial) { // This condition will now be false
    //         if (material.emissive && material.emissive.getHex() === 0x000000 && columnPair.semitoneData) {
    //             material.emissive.copy(columnPair.semitoneData.color);
    //         }
    //         material.emissiveIntensity = normalizedAmplitude * 1.5; // Adjust multiplier for desired brightness
    //     }
    //
    //     // Apply pan angle to X-position
    //     const initialX = channel.meshGroup.userData.initialX;
    //     const panFactor = panAngle / 90.0; // Normalize angle from -90 to +90 to -1 to +1
    //     // Max shift for each column is its width / 2. This makes it pan within its own 'cell'
    //     const maxPanShift = columnPair.semitoneData.width / 2;
    //     let panShiftX = panFactor * maxPanShift;
    //
    //     if (channel.isLeft) {
    //         channel.meshGroup.position.x = initialX - panShiftX;
    //     } else {
    //         channel.meshGroup.position.x = initialX + panShiftX;
    //     }
    //
    //   });
    // });
  }

  /**
   * Returns the main pivot group of the hologram, which can be added to the scene.
   * @returns {THREE.Group} The main hologram pivot group.
   */
  getHologramPivot() {
    return this.hologramPivot;
  }
}
