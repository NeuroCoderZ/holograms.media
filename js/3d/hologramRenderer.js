import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { semitones, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js';
// import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js'; // This was commented out, keeping it so
import netHoloGlyphClient from '../services/netHoloGlyphClient.js'; // New WebRTC client
import eventBus from '../core/eventBus.js'; // Added for WebAudioEngine integration

// Direct imports are used, so these lines are not necessary.

/**
 * HologramRenderer class manages the 3D visualization of the hologram in the Three.js scene.
 * It creates and updates a grid-like structure representing audio data, with columns 
 * that react to audio levels.
 */
export class HologramRenderer {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to which the hologram will be added.
   * @param {string} roomId - The ID of the room for WebRTC communication.
   * @param {string} userId - The unique ID of the current user.
   */
  constructor(scene, roomId, userId) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient; // Use the new WebRTC client
    this.latestAudioData = null; // Property to store the latest audio data
    this.roomId = roomId;
    this.userId = userId;

    // hologramPivot is the main group that holds all hologram elements.
    // It allows for easy positioning, rotation, and scaling of the entire hologram.
    this.hologramPivot = new THREE.Group();
    this.hologramPivot.position.set(0, 0, 0); // Center the hologram at origin

    // mainSequencerGroup holds the left and right sequencer grids. It's positioned
    // relative to the hologramPivot.
    this.mainSequencerGroup = new THREE.Group();
    this.mainSequencerGroup.position.set(0, 0, 0); // Center the grids at origin
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

    // Subscribe to CWT results from the eventBus
    this.eventBus.on('cwtResult', this.handleCwtResult.bind(this));

    // Connect to the NetHoloGlyph service
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    // Subscribe to incoming quanta from other peers
    this.netHoloGlyphClient.onQuantumReceived(this.handleRemoteQuantum.bind(this));

    // Initiate offer if this is the first peer to connect (simple logic for now)
    this.netHoloGlyphClient.onPeerConnected(() => {
        // This callback fires when a peer connection is established.
        // If we are the initiator, we might want to send an offer here.
        // For a simple two-peer setup, the client that connects first can create the offer.
        // More robust signaling would involve checking if an offer is needed.
        if (!this.netHoloGlyphClient.peerConnection.remoteDescription) {
            this.netHoloGlyphClient.createOffer();
        }
    });
  }

  handleCwtResult(data) {
    // Store the latest data, to be used by updateVisuals in the render loop
    this.latestAudioData = data;
  }

  /**
   * Handles incoming holographic quanta from other peers.
   * For now, just log the data. Later, this will involve rendering a second hologram.
   * @param {object} quantumData - The received holographic quantum.
   */
  handleRemoteQuantum(quantumData) {
    console.log("Received remote quantum:", quantumData);
    // TODO: Implement rendering of remote holograms based on quantumData
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
    const redSphere = this._createSphereForAxis(sphereRadius, colorXpos).translateX(xLength);
    const purpleSphere = this._createSphereForAxis(sphereRadius, colorXneg).translateX(0);
    if (!isLeftGrid) {
        axisGroup.add(redSphere);
    }
    if (isLeftGrid) {
        axisGroup.add(purpleSphere);
    }
    const greenSphere = this._createSphereForAxis(sphereRadius, colorYpos).translateY(yLength);
    const whiteSphere = this._createSphereForAxis(sphereRadius, colorZpos).translateZ(zLength);
    if (isLeftGrid) {
        greenSphere.translateX(128);
        whiteSphere.translateX(128);
    }
    axisGroup.add(greenSphere);
    axisGroup.add(whiteSphere);

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

    // Blue center point at the junction of both grids (x=128)
    const blueGeometry = new THREE.SphereGeometry(4, 8, 8);
    const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const blueSphere = new THREE.Mesh(blueGeometry, blueMaterial);
    blueSphere.position.set(0, -128, -64);
    this.mainSequencerGroup.add(blueSphere);
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
    const material = new THREE.MeshBasicMaterial({ color: semitone.color }); // Color from semitone data
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
   * @param {Float32Array | null} dbLevels - Array of 260 decibel values (130 for left, 130 for right), or null to reset.
   * @param {Float32Array | null} panAngles - Array of 130 pan angles in degrees (-90 to +90), or null to reset.
   */
  updateVisuals() {
    const audioData = this.latestAudioData;

    if (!audioData || !audioData.dbLevels || !audioData.panAngles) {
        // If no data is available, do nothing and keep the last visual state.
        return;
    }

    const { dbLevels, panAngles } = audioData;

    // Send the quantum of data via the NetHoloGlyph service
    this.netHoloGlyphClient.sendQuantum({
        type: "quantum_update",
        userId: this.userId,
        timestamp: Date.now(),
        quantum: {
            dbLevels: Array.from(dbLevels),
            panAngles: Array.from(panAngles)
        },
        gesture: null // Placeholder for future gesture data
    });

    this.columns.forEach((columnPair, index) => {
      const leftLevelDb = dbLevels[index];
      const rightLevelDb = dbLevels[index + 130]; // 130 is the number of frequencies
      const panAngle = panAngles[index];
      
      const channels = [
        { meshGroup: columnPair.left, levelDb: leftLevelDb, isLeft: true },
        { meshGroup: columnPair.right, levelDb: rightLevelDb, isLeft: false },
      ];

      channels.forEach(channel => {
        if (!channel.meshGroup || !channel.meshGroup.children || channel.meshGroup.children.length === 0) {
          return;
        }
        const mesh = channel.meshGroup.children[0];
        if (!(mesh instanceof THREE.Mesh)) {
          return;
        }

        // Normalize dB level to an amplitude of 0.0 - 1.0
        const amplitude = THREE.MathUtils.clamp((channel.levelDb + 100) / 100.0, 0, 1);

        const targetScaleZ = Math.max(0.001, amplitude * GRID_DEPTH);
        mesh.scale.z = targetScaleZ;
        mesh.position.z = targetScaleZ / 2;

        // Pan calculation
        const initialX = channel.meshGroup.userData.initialX;
        const panFactor = panAngle / 90.0; // Normalize pan angle from -90..+90 to -1..+1
        const maxPanShift = columnPair.semitoneData.width / 2;
        let panShiftX = panFactor * maxPanShift;

        if (channel.isLeft) {
            channel.meshGroup.position.x = initialX - panShiftX;
        } else {
            channel.meshGroup.position.x = initialX + panShiftX;
        }
      });
    });
  }

  /**
   * Returns the main pivot group of the hologram, which can be added to the scene.
   * @returns {THREE.Group} The main hologram pivot group.
   */
  getHologramPivot() {
    return this.hologramPivot;
  }
}