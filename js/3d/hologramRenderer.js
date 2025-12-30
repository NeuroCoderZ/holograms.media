import { state } from '../core/init.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
// import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js'; // This was commented out, keeping it so
import eventBus from '../core/eventBus.js'; // Added for WebAudioEngine integration
import netHoloGlyphClient from '../services/netHoloGlyphClient.js'; // New WebRTC client

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

    // Subscribe to Audio Data results from the eventBus (standardized event)
    this.eventBus.on('audioData', this.handleCwtResult.bind(this));

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
    // Debug Trace for Data Flow
    // console.log('Renderer received data:', data.levels ? data.levels[0] : 'no levels');
    if (Math.random() < 0.05) console.log('Renderer received data (Sample):', data.levels ? data.levels[0] : 'no levels');

    // Store the latest data (levels: Float32Array[256], pans: Float32Array[256])
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
      axisGroup.add(this._createLine2ForAxis([...origin, ...xEndNeg], colorXneg, linewidth, true));
      axisGroup.add(this._createSphereForAxis(sphereRadius, colorXneg).translateX(-xLength));
    } else {
      // Right grid axis: Red (+X)
      axisGroup.add(this._createLine2ForAxis([...origin, ...xEndPos], colorXpos, linewidth, true));
      axisGroup.add(this._createSphereForAxis(sphereRadius, colorXpos).translateX(xLength));
    }

    // Common axes
    // Green Y Axis (Spine) - VISIBLE ON TOP
    const spineLine = this._createLine2ForAxis([...origin, ...yEndPos], colorYpos, 1.5, true);
    spineLine.renderOrder = 999; // Ensure it renders ON TOP of everything
    spineLine.material.depthTest = false; // Disable depth test to force visibility
    axisGroup.add(spineLine);

    // Z Axis
    axisGroup.add(this._createLine2ForAxis([...origin, ...zEndPos], colorZpos, linewidth, true));

    // End spheres for Y and Z
    const greenSphere = this._createSphereForAxis(sphereRadius, colorYpos).translateY(yLength);
    const whiteSphere = this._createSphereForAxis(sphereRadius, colorZpos).translateZ(zLength);

    // Ensure spheres are also visible on top
    greenSphere.renderOrder = 999;
    greenSphere.material.depthTest = false;
    whiteSphere.renderOrder = 0;

    axisGroup.add(greenSphere);
    axisGroup.add(whiteSphere);

    // Offset slightly forward to prevent Z-fighting with grid planes if any
    axisGroup.position.z = 0.5;

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

    // Double the height to match the column vertical scale (scale.y = 2.0)
    const visualHeight = height * 2;

    const gridVis = this._createGridVisualization(isLeftGrid ? -width : width, visualHeight, depth, cellSize, color);
    group.add(gridVis);

    const axis = this._createAxis(width, visualHeight, depth, sphereRadiusForAxis, isLeftGrid);
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
    const rightColor = semitones.length > 0 ? semitones[0].color : new THREE.Color(0xFF0000);

    // Since visual height is now 2x (GRID_HEIGHT * 2), we need to lower the spine to -GRID_HEIGHT to center it vertically.
    // Width and Depth are unchanged.
    const commonSpinePosition = new THREE.Vector3(0, -GRID_HEIGHT, -GRID_DEPTH / 2);

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
    // Blue sphere radius increased by 20% to create "HALO" effect behind the white center point
    // The previous radius was 2, now 2.4. 
    // Wait, the prompt asked for the Blue sphere to be the "Back" sphere at (0,0,0) and White at (0,0,129).
    // Let's verify the positions.
    // The "Central Marker" created in constructor (line 44) is White at 0,0,0. 
    // The Block 2 instructions say: "Blue sphere: Center (0,0,0). White sphere: End of Z axis (0,0,129)."
    // Current code at line 44 adds a WHITE sphere at origin.
    // Let's adjust access to this method to swap/adjust colors or sizes to match the prompt.
    // The prompt says: "Blue sphere (Center) overlaps White sphere (Z-end). Make Blue 20% larger."
    // Actually, usually Blue is Z-axis in standard 3D, but here Z is White.
    // Let's look at `_createAxis`: Z-axis is White.
    // So the White sphere is at the TIP of the Z-axis.
    // The Blue sphere is at the ORIGIN (Center).
    // The user wants Blue Sphere > White Sphere visually IF they overlap?
    // "Blue sphere: Center coordinates (0,0,0). White sphere: End of axis Z (0,0,129)."
    // "Problem: Front view, Blue sphere covers White sphere."
    // This implies the camera looks from Z+ towards origin? No, usually camera is at Z+.
    // If camera is at Z+ looking at origin: White sphere is CLOSE (at 129), Blue is FAR (at 0).
    // So White should cover Blue.
    // If "Blue sphere covers White", maybe the radii are wrong or positions inverted?
    // User says: "Make Blue sphere (back) 20% larger than White. Ensure White (front) renders on top."
    // So we want a Halo effect: Blue (Background, Origin) is larger than White (Foreground, Z-Tip)?
    // Wait, if White is at Z=129 and Blue is at Z=0, and we look from Z=200...
    // White is in FRONT of Blue. White should occlude Blue.
    // If we want a "Halo", then Blue must be visible AROUND White.
    // So Blue must be LARGER than White (in screen space) Or White is semi-transparent?
    // User says "Blue sphere 20% larger radius than White."
    // Let's implement that.

    // SPHERE ORDERING: Blue (Back, Opaque), White (Front, Opaque)
    // Blue Sphere: At Origin, Large (Halo Effect)
    const blueGeometry = new THREE.SphereGeometry(3.024, 32, 32);
    const blueMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      depthTest: true,
      transparent: false,
      opacity: 1.0
    });
    const blueSphere = new THREE.Mesh(blueGeometry, blueMaterial);
    blueSphere.renderOrder = 0; // Back
    blueSphere.position.set(0, -GRID_HEIGHT, -GRID_DEPTH / 2);
    this.mainSequencerGroup.add(blueSphere);

    // White Sphere: At Origin, Smaller (Front, on top of Blue)
    const whiteGeometry = new THREE.SphereGeometry(2.52, 32, 32); // 20% smaller than Blue
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: true,
      transparent: false,
      opacity: 1.0
    });
    const whiteSphere = new THREE.Mesh(whiteGeometry, whiteMaterial);
    whiteSphere.renderOrder = 999; // Front, renders on top
    whiteSphere.position.set(0, -GRID_HEIGHT, -GRID_DEPTH / 2);
    this.mainSequencerGroup.add(whiteSphere);
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
    const width = semitone.width;
    const columnGroup = new THREE.Group();

    const baseColorObj = new THREE.Color(semitone.color);

    // Position relative to the spine (X=0)
    const initialX = isLeftGrid ? -width : 0;
    columnGroup.position.x = initialX;
    columnGroup.userData.initialX = initialX;
    columnGroup.userData.baseColor = baseColorObj;

    // Parallelepiped Geometry: Height (Y) = 2.0 * Width/Depth base
    // We use a base Box(width, 1, 1).
    // We set Scale Y to 2.0 to achieve the "elongated" look.
    // Z scale will be modulated by audio.
    const geometry = new THREE.BoxGeometry(width, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: baseColorObj,
      transparent: false,
      opacity: 1.0
    });
    const columnMesh = new THREE.Mesh(geometry, material);

    // Apply strict geometric rules: Scale Y = 2.0
    // Initial Z Scale = CELL_SIZE * 2 for visible depth (Greeting)
    columnMesh.scale.set(1, 2.0, CELL_SIZE * 2);

    // Set mesh center relative to the group origin (spine)
    // Since we scale Y by 2, the visual height is 2. Center at Y=1 puts bottom at Y=0?
    // Box height 1, scaled to 2. Center is at 0. Extends -0.5 to 0.5 * 2 = -1 to 1.
    // To sit on "floor" (or spine), we might want Y position.
    // Previous code: (semitoneIndex + 1) * 2. This arranges them vertically?
    // Wait, the grid is likely strictly arranged.
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
   * Each column's Z-scale (depth) and brightness are adjusted based on dB levels.
   * Pan angles from CWT determine X-position for each semitone independently.
   * @param {Float32Array | null} dbLevels - Array of 256 decibel values (-128 to 0).
   * @param {Float32Array | null} panAngles - Array of 128 pan values (-1 to +1) from CWT.
   */
  /**
   * Updates the visual appearance of the columns based on real-time audio data.
   * 
   * DIGITAL COCHLEA PHYSICS:
   * - Y-Axis (Green | Frequency): Static. Position = semitoneIndex * CELL_SIZE * 2
   * - X-Axis (Red/Purple | Pan & Width): 
   *     - Width (Scale X): Static from semitones[i].width
   *     - Position (Shift): Dynamic. Pan=0 → centered, Pan=-1/+1 → spread outward
   * - Z-Axis (White | Depth): Dynamic. dB level → depth toward viewer
   *
   * @param {Float32Array | null} dbLevels - Array of 256 decibel values (-128 to 0).
   * @param {Float32Array | null} panAngles - Array of 256 pan values (-1 to +1).
   */
  updateVisuals() {
    // If audio is paused (specifically for file playback), freeze the visuals
    if (state.audio && state.audio.activeSource === 'file' && state.audio.isPaused) {
      return;
    }

    let audioData = this.latestAudioData;

    // Fallback to global state if local not updated
    if (!audioData && state.audio && state.audio.latestAudioData) {
      audioData = state.audio.latestAudioData;
    }

    // Use silence data if nothing available
    if (!audioData) {
      if (this.lastNoDataWarning === undefined || performance.now() - this.lastNoDataWarning > 60000) {
        this.lastNoDataWarning = performance.now();
      }
      audioData = {
        levels: new Float32Array(256).fill(-128),
        pans: new Float32Array(256).fill(0)
      };
    }

    // Support both property naming conventions
    const dbLevels = audioData.levels || audioData.dbLevels;
    const panAngles = audioData.pans || audioData.panAngles;

    if (!dbLevels || !panAngles) return;

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

    // BasilaQ-127: Check if audio is active
    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
    const numSemitones = semitones.length; // 128

    this.columns.forEach((columnPair, index) => {
      // 1. Get Mesh Groups
      const leftMeshGroup = columnPair.left;
      const rightMeshGroup = columnPair.right;
      const leftMesh = leftMeshGroup && leftMeshGroup.children[0];
      const rightMesh = rightMeshGroup && rightMeshGroup.children[0];

      const semitoneConfig = semitones[index];
      if (!semitoneConfig) return;
      const columnWidth = semitoneConfig.width;

      // ========================================
      // GREETING MODE: Flat, Bright, Spine-Aligned
      // ========================================
      if (!isActive) {
        const greetingDepth = 1.5; // Super flat

        if (leftMesh) {
          leftMesh.scale.z = greetingDepth;
          leftMesh.position.z = greetingDepth / 2; // One-Way Growth
          // Restore full brightness
          const baseColorL = leftMeshGroup.userData.baseColor;
          if (baseColorL) {
            const hsl = {};
            baseColorL.getHSL(hsl);
            leftMesh.material.color.setHSL(hsl.h, hsl.s, hsl.l); // Full color
          }
        }
        if (rightMesh) {
          rightMesh.scale.z = greetingDepth;
          rightMesh.position.z = greetingDepth / 2; // One-Way Growth
          const baseColorR = rightMeshGroup.userData.baseColor;
          if (baseColorR) {
            const hsl = {};
            baseColorR.getHSL(hsl);
            rightMesh.material.color.setHSL(hsl.h, hsl.s, hsl.l); // Full color
          }
        }
        // Pan = 0 (Spine-Aligned)
        if (leftMeshGroup) leftMeshGroup.position.x = -columnWidth;
        if (rightMeshGroup) rightMeshGroup.position.x = 0;
        return; // Skip physics
      }

      // ========================================
      // ACTIVE MODE: BasilaQ-127 Physics
      // ========================================

      // Get dB levels for Left (0-127) and Right (128-255)
      const leftLevelDb = dbLevels[index] || 0;
      const rightLevelDb = dbLevels[index + numSemitones] || 0;

      // Get pan value (-1 to +1)
      let semitonePan = panAngles[index] || 0;

      // MAPPING: 0-127 dB -> 0-1 amplitude
      let ampL = leftLevelDb / 127.0;
      ampL = THREE.MathUtils.clamp(ampL, 0, 1);

      let ampR = rightLevelDb / 127.0;
      ampR = THREE.MathUtils.clamp(ampR, 0, 1);

      // NOISE GATE: If amplitude is below threshold, force Pan to 0 (spine)
      const maxAmp = Math.max(ampL, ampR);
      if (maxAmp < 0.01) {
        semitonePan = 0;
      }

      // PHYSICS: Spine-Aligned Rest Position
      const availableSpace = GRID_WIDTH - columnWidth;
      let rawShiftL = -columnWidth;
      let rawShiftR = 0;

      if (semitonePan < 0) {
        rawShiftL = -columnWidth + (semitonePan * availableSpace);
      }
      if (semitonePan > 0) {
        rawShiftR = semitonePan * availableSpace;
      }

      // GRID SNAP
      const snappedShiftL = Math.round(rawShiftL / CELL_SIZE) * CELL_SIZE;
      const snappedShiftR = Math.round(rawShiftR / CELL_SIZE) * CELL_SIZE;

      if (leftMeshGroup) leftMeshGroup.position.x = snappedShiftL;
      if (rightMeshGroup) rightMeshGroup.position.x = snappedShiftR;

      // Z-AXIS DEPTH: Map 0-127 to 1.5 (silence) to GRID_DEPTH (max)
      const minDepth = 1.5;
      const targetZL = minDepth + (ampL * (GRID_DEPTH - minDepth));
      const targetZR = minDepth + (ampR * (GRID_DEPTH - minDepth));

      if (leftMesh) {
        leftMesh.scale.z = targetZL;
        leftMesh.position.z = targetZL / 2; // ONE-WAY GROWTH
      }
      if (rightMesh) {
        rightMesh.scale.z = targetZR;
        rightMesh.position.z = targetZR / 2; // ONE-WAY GROWTH
      }

      // BRIGHTNESS: Silence = Dark (1/128), Loud = Bright (100%)
      if (leftMesh && leftMeshGroup.userData.baseColor) {
        const baseColorL = leftMeshGroup.userData.baseColor;
        const hsl = {};
        baseColorL.getHSL(hsl);
        const brightnessL = hsl.l * Math.max(1 / 128, ampL);
        leftMesh.material.color.setHSL(hsl.h, hsl.s, brightnessL);
      }

      if (rightMesh && rightMeshGroup.userData.baseColor) {
        const baseColorR = rightMeshGroup.userData.baseColor;
        const hsl = {};
        baseColorR.getHSL(hsl);
        const brightnessR = hsl.l * Math.max(1 / 128, ampR);
        rightMesh.material.color.setHSL(hsl.h, hsl.s, brightnessR);
      }
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
