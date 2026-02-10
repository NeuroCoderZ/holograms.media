import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
// import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js'; // This was commented out, keeping it so
import eventBus from '../core/eventBus.js'; // Added for WebAudioEngine integration
import netHoloGlyphClient from '../services/netHoloGlyphClient.js'; // New WebRTC client
import perfMonitor from '../utils/perfMonitor.js';

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
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestAudioData = null;
    this.latestCwtData = null;
    this.latestPanData = null;
    this.latestConfidenceData = null;
    this.latestSynthData = null;
    this.latestTimestamp = 0;
    this._lastWasmPerf = 0;
    this._panStates = new Float32Array(128).fill(0);
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

    // Group for remote "Ghost Hands"
    this.remoteHandsGroup = new THREE.Group();
    this.hologramPivot.add(this.remoteHandsGroup);
    this.remoteHands = new Map(); // Map to store meshes per user

    // PHYSICS: Rolling Max (Autogain) State
    this.peakHistory = [];
    this.maxHistorySize = 180; // ~3 seconds
    this.currentRollingMax = -60; // Baseline floor

    // Group for local hands visualization
    this.localHandsGroup = new THREE.Group();
    this.hologramPivot.add(this.localHandsGroup);
    this.localHands = { left: null, right: null };

    this.selectionState = {
      left: { active: false, indices: [] },
      right: { active: false, indices: [] }
    };

    // Group for local hands visualization
    this.localHandsGroup = new THREE.Group();
    this.hologramPivot.add(this.localHandsGroup);
    this.localHands = { left: null, right: null };

    this.selectionState = {
      left: { active: false, indices: [] },
      right: { active: false, indices: [] }
    };

    // DEBUG: Frame counter for diagnostics
    this._debugFrameCount = 0;

    // HSL Temp objects for performance
    this._hslTemp = { h: 0, s: 0, l: 0 };

    // Rolling Peak Normalization State
    this._rollingMax = -100; // Start with low floor
    this._releaseRate = 0.01; // How fast the peak drops (smooth release)

    // Add the main hologram pivot to the Three.js scene.
    this.scene.add(this.hologramPivot);

    // Subscribe to Audio Data results from the eventBus (standardized event)
    this.eventBus.on('audioData', this.handleCwtResult.bind(this));

    // Subscribe to Gesture Synth Data for visual feedback (closing the loop)
    this.eventBus.on('gestureSynthData', this.handleGestureSynthData.bind(this));

    // Connect to the NetHoloGlyph service
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    // Subscribe to incoming quanta from other peers
    this.netHoloGlyphClient.onQuantumReceived(this.handleRemoteQuantum.bind(this));

    // Subscribe to local hand updates for 3D cursors
    this.eventBus.on('handsUpdate', this.handleLocalHandsUpdate.bind(this));
    this.eventBus.on('handsLost', this.handleLocalHandsLost.bind(this));



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
    if (!data) return;
    this.latestCwtData = data;
    this.latestPanData = data.angles || data.pans;
    this.latestConfidenceData = data.confidence;
    this.latestTimestamp = data.timestamp || performance.now();
    this._lastWasmPerf = data.perf || 0;

    this.latestAudioData = data; // Keep for compatibility
  }

  /**
   * Handles incoming gesture synth data for visual feedback.
   * This closes the loop: Gesture → Sound → Visual
   * @param {object} data - { levels: Float32Array(256), pans: Float32Array(256), isGestureSynth: true }
   */
  handleGestureSynthData(data) {
    if (data.isGestureSynth) {
      this.latestSynthData = data;
    }
  }

  /**
   * Handles incoming holographic quanta from other peers.
   * @param {object} quantumData - The received holographic quantum.
   */
  handleRemoteQuantum(quantumData) {
    if (quantumData.type === 'gesture_frame') {
      this._updateGhostHands(quantumData.hands, quantumData.userId || 'remote');
    }
  }

  /**
   * Handles local hand tracking results from MediaPipe.
   */
  handleLocalHandsUpdate(data) {
    const { landmarks, handedness } = data;
    if (!landmarks || landmarks.length === 0) {
      this.handleLocalHandsLost();
      return;
    }

    // Hide both first
    if (this.localHands.left) this.localHands.left.visible = false;
    if (this.localHands.right) this.localHands.right.visible = false;

    for (let i = 0; i < landmarks.length; i++) {
      const handLandmarks = landmarks[i];
      const sideInfo = handedness[i];
      const side = sideInfo.label.toLowerCase(); // 'left' or 'right'

      if (!this.localHands[side]) {
        this.localHands[side] = this._createCursorMesh(side === 'left' ? 0x00ffff : 0xff00ff);
        this.localHandsGroup.add(this.localHands[side]);
      }

      const cursor = this.localHands[side];
      cursor.visible = true;
      this._updateCursorPosition(cursor, handLandmarks, side);
    }
  }

  handleLocalHandsLost() {
    if (this.localHands.left) this.localHands.left.visible = false;
    if (this.localHands.right) this.localHands.right.visible = false;
    this.selectionState.left.active = false;
    this.selectionState.right.active = false;
  }

  _checkIsHandOpen(landmarks) {
    if (!landmarks) return false;
    const tips = [8, 12, 16, 20];
    const bases = [5, 9, 13, 17];
    let openFingers = 0;
    for (let i = 0; i < 4; i++) {
      // MP Y=0 is TOP. Tip Y < Base Y means finger is extended UP.
      if (landmarks[tips[i]].y < landmarks[bases[i]].y) openFingers++;
    }
    return openFingers >= 3;
  }

  _createCursorMesh(color) {
    const geometry = new THREE.SphereGeometry(CELL_SIZE * 0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(CELL_SIZE * 0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: color })
    );
    mesh.add(core);

    return mesh;
  }

  _updateCursorPosition(cursor, landmarks, side) {
    if (!landmarks || !landmarks[8] || !landmarks[4]) return;
    const p8 = landmarks[8]; // Index tip
    const p4 = landmarks[4]; // Thumb tip

    // Map X (0..1) -> (-GRID_WIDTH..GRID_WIDTH)
    const x = (p8.x - 0.5) * (GRID_WIDTH * 2);
    // Map Y (0..1) -> (GRID_HEIGHT..-GRID_HEIGHT)
    const y = (0.5 - p8.y) * (GRID_HEIGHT * 2);
    // Z from MP is relative
    const z = -p8.z * GRID_DEPTH;

    cursor.position.set(x, y, z);

    // Calculate Pinch for selection
    const dist = Math.sqrt(
      Math.pow(p8.x - p4.x, 2) +
      Math.pow(p8.y - p4.y, 2) +
      Math.pow(p8.z - p4.z, 2)
    );
    const isPinching = dist < 0.05;
    const isHandOpen = this._checkIsHandOpen(landmarks);

    // Update selection state
    const select = this.selectionState[side];

    // Map Y position to Frequency Index (approximate)
    // GRID_HEIGHT -> 0, -GRID_HEIGHT -> 127 ? No.
    // Logic: Y maps to Frequency.
    // In _positionGhostHand: (handData.frequency / 127) * GRID_HEIGHT - (GRID_HEIGHT / 2)
    // Inverse: freq = ((y + GH/2) / GH) * 127
    const normalizedY = (y + (GRID_HEIGHT)) / (GRID_HEIGHT * 2); // 0..1 from bottom to top
    const centerIdx = Math.floor(Math.max(0, Math.min(1, normalizedY)) * 127);

    if (isPinching) {
      select.active = true;
      const range = 0; // Single semitone precision for Pinch
      select.indices = [];
      for (let i = centerIdx - range; i <= centerIdx + range; i++) {
        if (i >= 0 && i < 128) select.indices.push(i);
      }
    } else if (isHandOpen) {
      select.active = true;
      select.indices = Array.from({ length: 128 }, (_, i) => i); // All columns
    } else {
      select.active = false;
      select.indices = [];
    }

    // Visual Feedback on Cursor
    const core = cursor.children[0];
    if (select.active) {
      core.scale.set(1.5, 1.5, 1.5);
      core.material.opacity = isPinching ? 1.0 : 0.7; // Brighter on Pinch
    } else {
      core.scale.set(1, 1, 1);
      core.material.opacity = 0.5;
    }
  }

  /**
   * Handles local hand tracking results from MediaPipe.
   */
  handleLocalHandsUpdate(data) {
    const { landmarks, handedness } = data;
    if (!landmarks || landmarks.length === 0) {
      this.handleLocalHandsLost();
      return;
    }

    // Hide both first
    if (this.localHands.left) this.localHands.left.visible = false;
    if (this.localHands.right) this.localHands.right.visible = false;

    for (let i = 0; i < landmarks.length; i++) {
      const handLandmarks = landmarks[i];
      const sideInfo = handedness[i];
      const side = sideInfo.label.toLowerCase(); // 'left' or 'right'

      if (!this.localHands[side]) {
        this.localHands[side] = this._createCursorMesh(0x00FF00); // Green for both
        this.localHandsGroup.add(this.localHands[side]);
      }

      const cursor = this.localHands[side];
      cursor.visible = true;
      this._updateCursorPosition(cursor, handLandmarks, side);
    }
  }

  handleLocalHandsLost() {
    if (this.localHands.left) this.localHands.left.visible = false;
    if (this.localHands.right) this.localHands.right.visible = false;
  }

  _createCursorMesh(color) {
    const geometry = new THREE.SphereGeometry(CELL_SIZE * 0.8, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(CELL_SIZE * 0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: color })
    );
    mesh.add(core);

    return mesh;
  }

  _updateCursorPosition(cursor, landmarks, side) {
    if (!landmarks || !landmarks[8] || !landmarks[4]) return;
    const p8 = landmarks[8]; // Index tip
    const p4 = landmarks[4]; // Thumb tip

    // Map X (0..1) -> (-GRID_WIDTH..GRID_WIDTH)
    const x = (p8.x - 0.5) * (GRID_WIDTH * 2);
    // Map Y (0..1) -> (GRID_HEIGHT..-GRID_HEIGHT)
    const y = (0.5 - p8.y) * (GRID_HEIGHT * 2);
    // Z from MP is relative, let's just use a fixed offset or scale p8.z
    const z = -p8.z * GRID_DEPTH;

    cursor.position.set(x, y, z);

    // Calculate Pinch for future visual feedback
    const dist = Math.sqrt(
      Math.pow(p8.x - p4.x, 2) +
      Math.pow(p8.y - p4.y, 2) +
      Math.pow(p8.z - p4.z, 2)
    );
    const isPinching = dist < 0.05;

    // Pulse core if pinching
    const core = cursor.children[0];
    if (isPinching) {
      core.scale.set(1.5, 1.5, 1.5);
    } else {
      core.scale.set(1, 1, 1);
    }
  }

  /**
   * Visualizes remote gestures as "Ghost Hands" (Spectral Brushes).
   */
  _updateGhostHands(hands, remoteUserId) {
    if (!hands) return;

    let userHands = this.remoteHands.get(remoteUserId);
    if (!userHands) {
      userHands = {
        left: this._createGhostHandMesh(0x00ffff), // Cyan for left
        right: this._createGhostHandMesh(0xff00ff) // Magenta for right
      };
      this.remoteHandsGroup.add(userHands.left);
      this.remoteHandsGroup.add(userHands.right);
      this.remoteHands.set(remoteUserId, userHands);
    }

    this._positionGhostHand(userHands.left, hands.left);
    this._positionGhostHand(userHands.right, hands.right);
  }

  _createGhostHandMesh(color) {
    const geometry = new THREE.SphereGeometry(CELL_SIZE * 0.8, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;

    // Add a glowing core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(CELL_SIZE * 0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 })
    );
    mesh.add(core);

    return mesh;
  }

  _positionGhostHand(mesh, handData) {
    if (!handData || !handData.active) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;

    // Map frequency (0-127) to Y
    const yPos = (handData.frequency / 127) * GRID_HEIGHT - (GRID_HEIGHT / 2);

    // Map pan (-1 to 1) to X
    const xPos = handData.pan * (GRID_WIDTH / 2);

    // Map gain/depth (0 to 1) to Z
    const zPos = (handData.gain - 0.5) * GRID_DEPTH;

    mesh.position.set(xPos, yPos, zPos);

    // Scale based on bandwidth
    const s = 0.5 + (handData.bandwidth / 10);
    mesh.scale.set(s, s, s);
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
    // WebGPURenderer compatibility: Use standard Line/LineBasicMaterial
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: linewidth, // Note: often ignored in WebGL/WebGPU, typically fails back to 1
      depthTest: depthTest,
      transparent: !depthTest
    });

    const line = new THREE.Line(geometry, material);
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
      opacity: 0.0025, // 99.75% transparent as requested
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

    // Z-DIMMING PHYSICS: Use Vertex Colors for a spatial gradient
    // This creates a natural "depth fade" where the base is darker.
    const colors = [];
    const tempColor = new THREE.Color(1, 1, 1);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const z = posAttribute.getZ(i);
      // z is in range [-0.5, 0.5] for a unit cube centered at origin
      const factor = (z + 0.5); // 0.0 at back, 1.0 at front
      tempColor.setRGB(factor, factor, factor);
      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      color: baseColorObj,
      emissive: baseColorObj,
      emissiveIntensity: 0.0,
      roughness: 0.3,
      metalness: 0.1,
      flatShading: true,
      vertexColors: true, // Enable the vertex gradient
      transparent: false,
      opacity: 1.0
    });

    const columnMesh = new THREE.Mesh(geometry, material);
    columnMesh.castShadow = true;
    columnMesh.receiveShadow = true;

    // Apply strict geometric rules: Scale Y = 2.0
    // Initial Z Scale = 0.1 for minimal bulkiness by default
    columnMesh.scale.set(1, 2.0, 0.1);

    // Set mesh center relative to the group origin (spine)
    // FIX: Center Y at (index * CELL_SIZE) + (CELL_SIZE / 2)
    // CELL_SIZE is 2. So index=0 -> 1. Box height 2 centered at 1 spans 0 to 2.
    // This perfectly aligns with grid lines at 0, 2, 4...
    columnMesh.position.set(width / 2, (semitoneIndex * 2) + 1, 0);

    // HIGHLIGHT EDGES Logic:
    // Add a wireframe helper that scales with the mesh to highlight the "changing edges".
    // Using LineSegments with EdgesGeometry avoids diagonal wireframes.
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    // Determine edge color: Slightly brighter version of base or white? 
    // User wants "contrast grid lines". Let's use a dynamic color matching the column but brighter.
    // Or just white/grey overlay.
    // Let's use a blended color to keep it aesthetic but visible.
    const edgeColor = new THREE.Color(semitone.color).offsetHSL(0, 0, 0.4); // Much Brighter for contrast
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.9, // Increased opacity
      linewidth: 1,
      depthTest: true,
      // Fix Z-fighting: Draw lines "on top" of the mesh faces
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0
    });
    const edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    // EdgesMesh needs to be added to columnMesh to inherit scale/position
    columnMesh.add(edgesMesh);

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

    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
    let audioData = this.latestCwtData;

    // DEBUG: Log activity every 3 seconds
    if (!this._lastRenderLog || Date.now() - this._lastRenderLog > 3000) {
      console.log(`[Renderer] isActive=${isActive}, hasData=${!!audioData}`);
      if (audioData && audioData.levels) {
        console.log(`[Renderer] level[0]=${audioData.levels[0].toFixed(2)} dB, max=${Math.max(...audioData.levels).toFixed(2)}`);
      }
      this._lastRenderLog = Date.now();
    }
    const synthData = this.latestSynthData;

    // BLENDING LOGIC: Merge CWT and Synth data
    if (synthData && state.audio?.isGestureSynthMode) {
      if (!audioData) {
        audioData = synthData;
      } else {
        const mergedLevels = new Float32Array(256);
        const mergedPans = new Float32Array(256);

        for (let i = 0; i < 256; i++) {
          mergedLevels[i] = Math.max(audioData.levels[i] || -128, synthData.levels[i] || -128);
          if (synthData.levels[i] > -80) {
            mergedPans[i] = synthData.pans[i];
          } else {
            mergedPans[i] = audioData.pans[i] || 0;
          }
        }
        audioData = { levels: mergedLevels, pans: mergedPans };
      }
    } else if (!audioData && state.audio?.latestAudioData) {
      audioData = state.audio.latestAudioData;
    }

    if (!audioData) {
      audioData = {
        levels: new Float32Array(256).fill(-128),
        pans: new Float32Array(256).fill(0)
      };
    }

    const dbLevels = audioData.levels || audioData.dbLevels;
    const panAngles = audioData.pans || audioData.panAngles;

    if (!dbLevels || !panAngles) return;

    // 1. UPDATE ROLLING MAX (Autogain)
    let frameMax = -128;
    for (let i = 0; i < 256; i++) {
      if (dbLevels[i] > frameMax) frameMax = dbLevels[i];
    }

    // Filter out spikes, keep meaningful peaks
    if (frameMax > -110) {
      this.peakHistory.push(frameMax);
      if (this.peakHistory.length > this.maxHistorySize) this.peakHistory.shift();

      // Calculate Rolling Max (Target Ceiling)
      const windowMax = Math.max(...this.peakHistory);
      // Adaptive smoothing to prevent jumping
      this.currentRollingMax = (this.currentRollingMax * 0.9) + (windowMax * 0.1);
    }

    // Safety Floor for Rolling Max to prevent division error and keep visibility
    const safeCeiling = Math.max(this.currentRollingMax, -80);

    // --- PHASE 16.0: CLAUDE'S RECOMMENDATIONS ---
    // SOLUTION #2: Perceptual Mapping with Hard Cut
    // SOLUTION #3: Gamma Correction for True Black

    // Adaptive Noise Floor: -70 dB for files (already mastered)
    // For microphone we would use -90 dB, but source detection TBD
    const NOISE_FLOOR_DB = -70.0;
    const CEILING_DB = 0.0;
    const HEADROOM_SCALE = 1.0; // Phase 17.0: Use full 128-unit range as requested
    const PERCEPTUAL_GAMMA = 2.5; // Stevens' Power Law approximation
    const BRIGHTNESS_GAMMA = 3.0; // Extra darkening for true black

    const getNormAmp = (db) => {
      // HARD CUT: Everything below noise floor = absolute silence
      if (db < NOISE_FLOOR_DB) {
        return { length: 0.1, brightness: 0.0 }; // Minimum spine, black
      }

      // Perceptual mapping: noise_floor -> 0, ceiling -> 1
      const range = CEILING_DB - NOISE_FLOOR_DB; // e.g., 70 dB
      const linearNorm = (db - NOISE_FLOOR_DB) / range; // [0, 1]

      // Apply perceptual curve (Stevens' Law)
      const perceptualNorm = Math.pow(linearNorm, PERCEPTUAL_GAMMA);

      // Map to physical height (0..128), then apply headroom (now 1.0)
      const physicalHeight = perceptualNorm * 128.0 * HEADROOM_SCALE;

      // Brightness: Even more aggressive gamma for true black at low levels
      const brightness = Math.pow(perceptualNorm, BRIGHTNESS_GAMMA);

      return {
        length: physicalHeight,
        brightness: brightness
      };
    };

    // 2. BROADCAST DATA
    this.netHoloGlyphClient.sendQuantum({
      type: "quantum_update",
      userId: this.userId,
      timestamp: Date.now(),
      quantum: {
        dbLevels: Array.from(dbLevels),
        panAngles: Array.from(panAngles)
      }
    });

    const numSemitones = 128;

    // 3. APPLY TO COLUMNS
    this.columns.forEach((columnPair, index) => {
      const semitoneConfig = semitones[index];
      if (!semitoneConfig) return;

      const leftMesh = columnPair.left?.children[0];
      const rightMesh = columnPair.right?.children[0];

      if (!isActive) {
        // GREETING MODE: Thin Spine, Fixed Glow
        const gDepth = 0.1;
        if (leftMesh) {
          leftMesh.scale.z = gDepth;
          leftMesh.position.z = gDepth / 2;
          leftMesh.material.emissiveIntensity = 0.5;
          leftMesh.material.color.copy(columnPair.left.userData.baseColor);

          // Reset edge opacity in Greeting Mode
          const leftEdgesMesh = leftMesh.children[0];
          if (leftEdgesMesh && leftEdgesMesh.material) leftEdgesMesh.material.opacity = 0.8;
        }
        if (rightMesh) {
          rightMesh.scale.z = gDepth;
          rightMesh.position.z = gDepth / 2;
          rightMesh.material.emissiveIntensity = 0.5;
          rightMesh.material.color.copy(columnPair.right.userData.baseColor);

          // Reset edge opacity in Greeting Mode
          const rightEdgesMesh = rightMesh.children[0];
          if (rightEdgesMesh && rightEdgesMesh.material) rightEdgesMesh.material.opacity = 0.8;
        }
        columnPair.left.position.x = -semitoneConfig.width;
        columnPair.right.position.x = 0;
      } else {
        // ACTIVE MODE: Smart Physics (Phase 4)
        const dbL = dbLevels ? dbLevels[index] : -128;
        const dbR = dbLevels ? dbLevels[index + numSemitones] : -128;
        const conf = this.latestConfidenceData ? this.latestConfidenceData[index] : 1.0;

        const ampDataL = getNormAmp(dbL);
        const ampDataR = getNormAmp(dbR);

        const qAmpL = ampDataL.length;
        const qBrightL = ampDataL.brightness;

        const qAmpR = ampDataR.length;
        const qBrightR = ampDataR.brightness;

        // 1. MAGNETIC PAN: Adaptive smoothing based on confidence
        const targetPan = Math.max(-1, Math.min(1, panAngles ? panAngles[index] : 0));
        const lerpFactor = 0.4 + (conf * 0.5); // High confidence = faster tracking
        this._panStates[index] += (targetPan - this._panStates[index]) * lerpFactor;

        const pan = this._panStates[index];

        // 2. X Shift (Discrete Freedom)
        const availableSpace = GRID_WIDTH - semitoneConfig.width;
        const discreteOffset = Math.round(pan * availableSpace);

        columnPair.left.position.x = columnPair.left.userData.initialX + (pan < 0 ? discreteOffset : 0);
        columnPair.right.position.x = columnPair.right.userData.initialX + (pan > 0 ? discreteOffset : 0);

        // 3. Z Scaling and Phase 13.0 Z-Dimming (Physical)
        // qAmpL is already 0..128 units. qBrightL is 0..1.

        if (leftMesh) {
          // Height: Direct mapping from dB units
          const hL = Math.max(0.01, qAmpL);
          leftMesh.scale.z = hL;
          leftMesh.position.z = hL / 2;

          // Emissive: Gamma-corrected brightness for true black
          // Confidence modulates between 50% and 100% intensity
          const perceivedBrightL = qBrightL; // Already gamma-corrected in getNormAmp
          let finalIntensityL = perceivedBrightL * (0.5 + conf * 0.5);

          // Selection Highlight: Blinking Edges
          const isSelectedL = this.selectionState.left.active && this.selectionState.left.indices.includes(index);
          const leftEdgesMesh = leftMesh.children[0];

          if (isSelectedL) {
            // Blink effect: sin wave based on time
            const blink = (Math.sin(performance.now() * 0.01) + 1) * 0.5; // 0..1
            finalIntensityL += 0.3 * blink; // Pulse glow
            if (leftEdgesMesh && leftEdgesMesh.material) {
              leftEdgesMesh.material.opacity = 0.8 + (0.2 * blink);
              leftEdgesMesh.material.color.setHSL(0, 0, 1.0); // White edges on selection
            }
            if (leftEdgesMesh && leftEdgesMesh.material) {
              // Edges should be visible if there is any non-zero intensity
              leftEdgesMesh.material.opacity = qBrightL > 0.001 ? 0.9 : 0.0;

              if (semitoneConfig) {
                const color = new THREE.Color(semitoneConfig.color);
                color.getHSL(this._hslTemp);

                // Surface lightness (calculation matches below)
                const surfaceL = this._hslTemp.l * (finalIntensityL + 0.2);
                // Edge lightness: strictly 30% brighter
                const edgeL = Math.min(1.0, surfaceL * 1.3);

                leftEdgesMesh.material.color.setHSL(
                  this._hslTemp.h,
                  this._hslTemp.s,
                  edgeL
                );
              }
            }
          }

          leftMesh.material.emissiveIntensity = finalIntensityL;

          columnPair.left.userData.baseColor.getHSL(this._hslTemp);
          leftMesh.material.color.setHSL(
            this._hslTemp.h,
            this._hslTemp.s,
            this._hslTemp.l * (finalIntensityL + 0.2)
          );
        }

        if (rightMesh) {
          const hR = Math.max(0.01, qAmpR);
          rightMesh.scale.z = hR;
          rightMesh.position.z = hR / 2;

          const perceivedBrightR = qBrightR;
          let finalIntensityR = perceivedBrightR * (0.5 + conf * 0.5);

          // Selection Highlight
          const isSelectedR = this.selectionState.right.active && this.selectionState.right.indices.includes(index);
          const rightEdgesMesh = rightMesh.children[0];

          if (isSelectedR) {
            const blink = (Math.sin(performance.now() * 0.01) + 1) * 0.5;
            finalIntensityR += 0.3 * blink;
            if (rightEdgesMesh && rightEdgesMesh.material) {
              rightEdgesMesh.material.opacity = 0.8 + (0.2 * blink);
              rightEdgesMesh.material.color.setHSL(0, 0, 1.0);
            }
            if (rightEdgesMesh && rightEdgesMesh.material) {
              // Edges should be visible if there is any non-zero intensity
              rightEdgesMesh.material.opacity = qBrightR > 0.001 ? 0.9 : 0.0;

              if (semitoneConfig) {
                const color = new THREE.Color(semitoneConfig.color);
                color.getHSL(this._hslTemp);

                // Surface lightness (calculation matches below)
                const surfaceL = this._hslTemp.l * (finalIntensityR + 0.2);
                // Edge lightness: strictly 30% brighter
                const edgeL = Math.min(1.0, surfaceL * 1.3);

                rightEdgesMesh.material.color.setHSL(
                  this._hslTemp.h,
                  this._hslTemp.s,
                  edgeL
                );
              }
            }
          }

          rightMesh.material.emissiveIntensity = finalIntensityR;

          columnPair.right.userData.baseColor.getHSL(this._hslTemp);
          rightMesh.material.color.setHSL(
            this._hslTemp.h,
            this._hslTemp.s * (0.5 + perceivedBrightR * 0.5), // Saturation fades
            this._hslTemp.l * perceivedBrightR // Lightness dims
          );


        }
        // 4. Update Performance Monitor (Phase 4)
        perfMonitor.update(this._lastWasmPerf, performance.now() - (this.latestTimestamp || 0));
      }
    });

    // 4. DIAGNOSTICS (Phase 2 Verification)
    // Runs every ~1 second (assuming 60fps) to verify Z-Depth and True Black physics
    this._debugFrameCount++;
    if (this._debugFrameCount % 60 === 0) {
      this._logPhysicsDiagnostics(dbLevels, panAngles);
    }
  }

  /**
   * DEBUG: Logs physics statistics to verify spectral resolution and quantization.
   * Phase 16.0: Extended diagnostics with histogram per Claude's recommendations.
   */
  _logPhysicsDiagnostics(dbLevels, panAngles) {
    let maxLevel = -Infinity;
    let minLevel = Infinity;
    let activeColumns = 0;
    const histogram = {
      silent: 0,      // < -100 dB (should be majority for quiet tracks)
      noise: 0,       // -100 to -70 dB (noise floor)
      quiet: 0,       // -70 to -40 dB (quiet notes, gated in visual)
      medium: 0,      // -40 to -20 dB (medium notes)
      loud: 0         // > -20 dB (forte)
    };

    for (let i = 0; i < 256; i++) {
      const db = dbLevels[i];

      if (db < -100) histogram.silent++;
      else if (db < -70) histogram.noise++;
      else if (db < -40) histogram.quiet++;
      else if (db < -20) histogram.medium++;
      else histogram.loud++;

      if (db > -70) activeColumns++;
      if (db > maxLevel) maxLevel = db;
      if (db < minLevel) minLevel = db;
    }

    const mean = dbLevels.reduce((a, b) => a + b, 0) / 256;
    const variance = dbLevels.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 256;

    console.debug(
      `[BasilaQ-127 Physics] Frame ${this._debugFrameCount}\n` +
      `  Range: ${minLevel.toFixed(1)} to ${maxLevel.toFixed(1)} dB\n` +
      `  Mean: ${mean.toFixed(1)} dB | Variance: ${variance.toFixed(1)}\n` +
      `  Active Columns (>-70dB): ${activeColumns}/256\n` +
      `  Histogram: Silent=${histogram.silent}, Noise=${histogram.noise}, ` +
      `Quiet=${histogram.quiet}, Medium=${histogram.medium}, Loud=${histogram.loud}`
    );

    // ✅ EXPECTED for quiet piano:
    // Silent: 200-230 (80-90%)
    // Noise: 10-30
    // Quiet: 5-15 (only active notes, but gated visually)
    // Medium: 5-10
    // Loud: 0-5
    // Active: 20-50
  }

  /**
   * Returns the main pivot group of the hologram, which can be added to the scene.
   * @returns {THREE.Group} The main hologram pivot group.
   */
  getHologramPivot() {
    return this.hologramPivot;
  }
}
// Trigger deploy at Sat, Feb  7, 2026 10:47:47 AM
