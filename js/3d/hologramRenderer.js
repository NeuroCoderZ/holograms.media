import { state } from '../core/init.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
// import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js'; // This was commented out, keeping it so
import eventBus from '../core/eventBus.js'; // Added for WebAudioEngine integration
import netHoloGlyphClient from '../services/netHoloGlyphClient.js'; // New WebRTC client

// Column width constants
const MIN_DEG_INPUT = 1.40625;
const MAX_DEG_INPUT = 180;
const MIN_COLUMN_WIDTH = 2;
const MAX_COLUMN_WIDTH = 16;

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
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: false, opacity: 1.0 }));
  }

  /**
   * Creates a sphere mesh for axis visualization.
   * @param {number} radius - Radius of the sphere.
   * @param {number} color - Hexadecimal color of the sphere.
   * @returns {THREE.Mesh} A Three.js Mesh object representing a sphere.
   */
  _createSphereForAxis(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: false, opacity: 1.0 }));
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

  _createLine2ForAxis(points, color, linewidth, depthTest = true) {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flat());

    const material = new LineMaterial({
      color: color,
      linewidth: linewidth,
      depthTest: depthTest,
      transparent: !depthTest
    });
    material.resolution.set(window.innerWidth, window.innerHeight);
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    if (!depthTest) line.renderOrder = 999;
    return line;
  }

  /**
   * Creates a set of XYZ axes (lines and spheres) for a grid.
   * @param {number} xLength - Length of the X-axis.
   * @param {number} yLength - Length of the Y-axis.
   * @param {number} zLength - Length of the Z-axis.
   * @param {number} sphereRadiusInput - Radius for the spheres at axis ends/origin.
   * @param {boolean} isLeftGrid - True if creating axes for the left grid.
   * @returns {THREE.Group} A Three.js Group containing the axis visualization.
   */
  _createAxis(xLength, yLength, zLength, sphereRadiusInput, isLeftGrid) {
    const axisGroup = new THREE.Group();
    const sphereRadius = (0.5 * CELL_SIZE) * 2; // Reduced by 2 (was * 4)

    const origin = [0, 0, 0];

    // Define end points
    const xEndPos = [xLength, 0, 0];
    const xEndNeg = [-xLength, 0, 0];
    const yEndPos = [0, yLength, 0];
    const zEndPos = [0, 0, zLength];

    // Define colors
    const colorXpos = 0xFF0000; // Red
    const colorXneg = 0x800080; // Purple
    const colorYpos = 0x00FF00; // Green
    const colorZpos = 0xFFFFFF; // White

    const linewidth = 1.5; // Reduced by 2 (was 3)

    if (isLeftGrid) {
      // Left grid axis: Purple (-X)
      axisGroup.add(this._createLine2ForAxis([...origin, ...xEndNeg], colorXneg, linewidth, false));
      axisGroup.add(this._createSphereForAxis(sphereRadius, colorXneg).translateX(-xLength));
    } else {
      // Right grid axis: Red (+X)
      axisGroup.add(this._createLine2ForAxis([...origin, ...xEndPos], colorXpos, linewidth, false));
      axisGroup.add(this._createSphereForAxis(sphereRadius, colorXpos).translateX(xLength));
    }

    // Common axes (Green Y and White Z) with depthTest: false to ensure visibility
    axisGroup.add(this._createLine2ForAxis([...origin, ...yEndPos], colorYpos, linewidth, false));
    axisGroup.add(this._createLine2ForAxis([...origin, ...zEndPos], colorZpos, linewidth, false));

    // End spheres for Y and Z
    const greenSphere = this._createSphereForAxis(sphereRadius, colorYpos).translateY(yLength);
    const whiteSphere = this._createSphereForAxis(sphereRadius, colorZpos).translateZ(zLength);

    // Ensure spheres are also visible on top
    greenSphere.material.depthTest = false;
    greenSphere.renderOrder = 999;
    whiteSphere.material.depthTest = false;
    whiteSphere.renderOrder = 999;

    axisGroup.add(greenSphere);
    axisGroup.add(whiteSphere);

    // Minor offset to avoid being exactly inside depth surfaces
    axisGroup.position.z = 0.1;

    return axisGroup;
  }

  /**
   * Creates a wireframe grid visualization (a cube of lines).
   * @param {number} gridWidth - Total width of the grid (can be negative).
   * @param {number} gridHeight - Total height of the grid.
   * @param {number} gridDepth - Total depth of the grid.
   * @param {number} cellSize - Size of each cell in the grid.
   * @param {number} color - Hexadecimal color of the grid lines.
   * @returns {THREE.LineSegments} A Three.js LineSegments object representing the grid.
   */
  _createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color) {
    const points = [];
    const divisionsX = Math.floor(Math.abs(gridWidth) / cellSize);
    const divisionsY = Math.floor(gridHeight / cellSize);
    const divisionsZ = Math.floor(gridDepth / cellSize);
    const signX = Math.sign(gridWidth) || 1;

    // Generate points for lines along X, Y, and Z axes to form a 3D grid.
    // Lines along X-axis (varying Y, Z positions)
    for (let i = 0; i <= divisionsY; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(0, i * cellSize, j * cellSize, gridWidth, i * cellSize, j * cellSize);
      }
    }
    // Lines along Y-axis (varying X, Z positions)
    for (let i = 0; i <= divisionsX; i++) {
      const x = i * cellSize * signX;
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(x, 0, j * cellSize, x, gridHeight, j * cellSize);
      }
    }
    // Lines along Z-axis (varying X, Y positions)
    for (let i = 0; i <= divisionsX; i++) {
      const x = i * cellSize * signX;
      for (let j = 0; j <= divisionsY; j++) {
        points.push(x, j * cellSize, 0, x, j * cellSize, gridDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color,
      opacity: 0.005,
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

    const gridVis = this._createGridVisualization(isLeftGrid ? -width : width, height, depth, cellSize, color);
    group.add(gridVis);

    const axis = this._createAxis(width, height, depth, sphereRadiusForAxis, isLeftGrid);
    group.add(axis);

    // Add a marker sphere at the center of this grid group (now shared spine)
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
    const leftColor = semitones.length > 0 ? semitones[semitones.length - 1].color : new THREE.Color(0x800080);
    const rightColor = semitones.length > 0 ? semitones[0].color :.new THREE.Color(0xFF0000);

    const commonSpinePosition = new THREE.Vector3(0, -GRID_HEIGHT / 2, -GRID_DEPTH / 2);

    // Create the left sequencer grid aligned at the spine
    this.leftSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      leftColor,
      commonSpinePosition,
      true
    );
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    // Create the right sequencer grid aligned at the spine
    this.rightSequencerGroup = this._createSequencerGrid(
      GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE,
      rightColor,
      commonSpinePosition,
      false
    );
    this.mainSequencerGroup.add(this.rightSequencerGroup);

    // Shared Blue center sphere at the junction origin (0, -128, -64 in world-ish, 0,0,0 local to group)
    const blueGeometry = new THREE.SphereGeometry(2, 16, 16);
    const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, depthTest: false, transparent: true });
    const blueSphere = new THREE.Mesh(blueGeometry, blueMaterial);
    blueSphere.renderOrder = 999;
    blueSphere.position.set(0, -128, -64); // Spine bottom-back point
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
      return new THREE.Group();
    }
    const width = THREE.MathUtils.mapLinear(semitone.deg, MIN_DEG_INPUT, MAX_DEG_INPUT, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH);
    const columnGroup = new THREE.Group();

    const baseColorObj = new THREE.Color(semitone.color);

    // Position relative to the spine (X=0)
    const initialX = isLeftGrid ? -width : 0;
    columnGroup.position.x = initialX;
    columnGroup.userData.initialX = initialX;
    columnGroup.userData.baseColor = baseColorObj;

    const geometry = new THREE.BoxGeometry(width, 2, 1);
    const material = new THREE.MeshBasicMaterial({
      color: baseColorObj,
      transparent: false,
      opacity: 1.0
    });
    const columnMesh = new THREE.Mesh(geometry, material);

    // Set mesh center relative to the group origin (spine)
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
   * @param {Float32Array | null} dbLevels - Array of 256 decibel values (128 for left, 128 for right), or null to reset.
   * @param {Float32Array | null} panAngles - Array of 128 pan angles in degrees (-90 to +90), or null to reset.
   */
  /**
   * Updates the visual appearance of the columns based on real-time audio data.
   * Each column's Z-scale (depth) and brightness are adjusted based on dB levels.
   * Pan angles from CWT determine X-position for each semitone independently.
   * @param {Float32Array | null} dbLevels - Array of 256 decibel values (-128 to 0).
   * @param {Float32Array | null} panAngles - Array of 128 pan values (-1 to +1) from CWT.
   */
  updateVisuals() {
    // If audio is paused (specifically for file playback), freeze the visuals
    if (state.audio && state.audio.activeSource === 'file' && state.audio.isPaused) {
      return;
    }

    let audioData = null;

    // 1. Priority: CWT data from AudioWorklet (most accurate)
    if (state.audio && state.audio.latestCwtData) {
      audioData = state.audio.latestCwtData;
    }

    // 2. Fallback to native FFT analyzer
    if (!audioData && state.audio && state.audio.globalAnalyzer) {
      audioData = state.audio.globalAnalyzer.getAnalysisData();
    }

    // 3. Final fallback to event-based data
    if (!audioData) {
      audioData = this.latestAudioData;
    }

    if (!audioData || !audioData.dbLevels || !audioData.panAngles) {
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
      gesture: null
    });

    this.columns.forEach((columnPair, index) => {
      const leftLevelDb = dbLevels[index];
      const rightLevelDb = dbLevels[index + 128];

      // Get pan value for this specific semitone from CWT analysis
      // Range: -1 (full left) to +1 (full right)
      const semitonePan = panAngles[index];

      // Calculate linear amplitudes from dB
      let ampL = (leftLevelDb + 128) / 128.0;
      ampL = THREE.MathUtils.clamp(ampL, 0, 1);

      let ampR = (rightLevelDb + 128) / 128.0;
      ampR = THREE.MathUtils.clamp(ampR, 0, 1);

      // Calculate Max Shift for this column width
      // Pan 0 = center (source in front)
      // Pan -1 = inner wall (source left/behind-left for left grid)
      // Pan +1 = outer wall (source right/behind-right)
      const colWidth = THREE.MathUtils.mapLinear(columnPair.semitoneData.deg, MIN_DEG_INPUT, MAX_DEG_INPUT, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH);
      const maxShift = (GRID_WIDTH - colWidth) / 2;

      // Shift based on CWT-calculated pan for THIS semitone
      // Positive pan = shift outward, Negative pan = shift inward
      const shiftX = semitonePan * maxShift;

      // Update both Left and Right Grid Columns
      const channels = [
        { meshGroup: columnPair.left, levelDb: leftLevelDb, baseAmp: ampL, isLeft: true },
        { meshGroup: columnPair.right, levelDb: rightLevelDb, baseAmp: ampR, isLeft: false },
      ];


      channels.forEach(channel => {
        if (!channel.meshGroup || !channel.meshGroup.children || channel.meshGroup.children.length === 0) {
          return;
        }
        const mesh = channel.meshGroup.children[0];
        if (!(mesh instanceof THREE.Mesh)) {
          return;
        }

        // Use linear amplitude from specific channel for Height/Brightness
        const visualAmplitude = channel.baseAmp;

        // Update Z Scale (Length)
        const targetScaleZ = Math.max(0.001, visualAmplitude * GRID_DEPTH);
        mesh.scale.z = targetScaleZ;
        mesh.position.z = targetScaleZ / 2;

        // Update Brightness
        const baseColor = channel.meshGroup.userData.baseColor;
        if (baseColor) {
          const hsl = {};
          baseColor.getHSL(hsl);
          const targetL = hsl.l * visualAmplitude;
          mesh.material.color.setHSL(hsl.h, hsl.s, targetL);
        }

        // Pan shifting
        const initialX = channel.meshGroup.userData.initialX;

        // Move AWAY from the spine.
        // Left Grid (isLeft=true): initialX is at spine (approx), direction is Negative X (Left).
        // Right Grid (isLeft=false): initialX is at spine, direction is Positive X (Right).

        if (channel.isLeft) {
          channel.meshGroup.position.x = initialX - shiftX;
        } else {
          channel.meshGroup.position.x = initialX + shiftX;
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
