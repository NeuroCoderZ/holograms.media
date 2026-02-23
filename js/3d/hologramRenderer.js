import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
// import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js'; // This was commented out, keeping it so
import eventBus from '../core/eventBus.js'; // Added for WebAudioEngine integration
import netHoloGlyphClient from '../services/netHoloGlyphClient.js'; // New WebRTC client
import perfMonitor from '../utils/perfMonitor.js';
import { CochlearCylinder } from './CochlearCylinder.js';
import { spectralInpainter } from '../audio/SpectralInpainter.js'; // Palinodes

const CELL_HEIGHT = 2.0;       // Y dimension per row (Total visual height = 128 * 2 = 256)
const NUM_SEMITONES = 128;      // 128 frequency bands on Y axis

// ─── SHADERS: BasilaQ-128 Z-Physics ──────────────────────────────────────────
const vertexShader = /* glsl */`
    varying float vLocalZ;
    void main() {
        // Локальная Z координаты BoxGeometry всегда от -0.5 (база) до +0.5 (вершина)
        vLocalZ = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uOpacity;
    varying float vLocalZ;
    void main() {
        // Переводим локальный Z [-0.5, 0.5] в диапазон [0.0, 1.0]
        float linearFactor = clamp(vLocalZ + 0.5, 0.0, 1.0);

        // Глубокая кривая для тру-черного у основания
        float brightness = pow(linearFactor, 2.5);

        vec3 color = uBaseColor * brightness;
        color += uSelection * 0.3;

        gl_FragColor = vec4(color, uOpacity);
    }
`;


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
    console.log('[HologramRenderer] v18.0.2: Phase 18 Physics & Deployment Sync Active');
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
    this._lastRenderState = null;
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
    const centralWhiteSphere = this._createCentralMarkerSphere(2.4192, 0xffffff);
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


    // DEBUG: Frame counter for diagnostics
    this._debugFrameCount = 0;

    // HSL Temp objects for performance
    this._hslTemp = { h: 0, s: 0, l: 0 };

    // Rolling Peak Normalization State
    this._rollingMax = -100; // Start with low floor
    this._releaseRate = 0.01; // How fast the peak drops (smooth release)

    // Cochlear Cylinder (XR mode)
    this.cochlearCylinder = null;
    this.isXRMode = false;

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

  /**
   * Переключение XR-режима «Cochlear Cylinder 3.44».
   * Если WebXR-сессия активна — морфинг внутри сессии.
   * Если WebXR недоступен — fallback морфинг в обычном 3D.
   *
   * @returns {Promise}
   */
  async toggleXRMode() {
    if (this.isXRMode) {
      // Возврат к плоскому режиму
      console.log('[HologramRenderer] Exiting XR Cochlear Cylinder mode');

      // Reset Scale and Position for Flat Screen
      this.hologramPivot.scale.set(1, 1, 1);
      this.hologramPivot.position.set(0, 0, 0);

      if (this.cochlearCylinder) {
        await this.cochlearCylinder.morphToFlat(
          1500,
          this.leftSequencerGroup,
          this.rightSequencerGroup
        );
        this.cochlearCylinder.dispose();
        this.cochlearCylinder = null;
      }
      this.isXRMode = false;
    } else {
      // Вход в Cochlear Cylinder
      console.log('[HologramRenderer] Entering XR Cochlear Cylinder mode');

      // Scale down for AR (1 unit = 1 meter). 
      // Original: 128 units wide. Target: ~1.28 meters wide.
      this.hologramPivot.scale.set(0.01, 0.01, 0.01);
      // Position slightly forward and up relative to floor (local-floor origin)
      // Y=1.5m (eye levelish?), Z=-0.5m (forward)
      this.hologramPivot.position.set(0, 1.2, -0.5);

      this.cochlearCylinder = new CochlearCylinder(this.hologramPivot, semitones);
      await this.cochlearCylinder.morphToTorus(
        1500,
        this.leftSequencerGroup,
        this.rightSequencerGroup
      );
      this.isXRMode = true;
    }
    return this.isXRMode;
  }

  handleCwtResult(data) {
    // PALINODES: Spectral Inpainting
    // Process the data (or null/undefined) through repairs
    const processedData = spectralInpainter.process(data);

    if (!processedData) return; // Should return silence object even if repairing fails completely

    this.latestCwtData = processedData;
    this.latestPanData = processedData.angles || processedData.pans;
    this.latestConfidenceData = processedData.confidence;
    this.latestTimestamp = processedData.timestamp || performance.now();
    this._lastWasmPerf = processedData.perf || 0;

    this.latestAudioData = processedData; // Keep for compatibility
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

    // Dynamic Q-factor Dome for XR Mode
    if (this.isXRMode && this.cochlearCylinder && isPinching) {
      // Apply a +20dB boost dome at the cursor position
      this.cochlearCylinder.applyQFactorDome(centerIdx, 20.0);
    }

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
    // User requested central white sphere to be yellow and 100% transparent (invisible but distinct in code)
    const isTarget = (color === 0xffffff);
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({
        color: isTarget ? 0xffff00 : color,
        transparent: isTarget,
        opacity: isTarget ? 0.0 : 1.0,
        visible: !isTarget // If 100% transparent, we can just hide it, but keep it as requested
      })
    );
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
    const sphereRadius = 2.4192; // 80% of Blue sphere (3.024 * 0.8)

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
  _createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color, cellSizeY = cellSize) {
    const points = [];
    const divisionsX = Math.floor(Math.abs(gridWidth) / cellSize);
    const divisionsY = Math.round(gridHeight / cellSizeY);
    const divisionsZ = Math.floor(gridDepth / cellSize);
    const signX = Math.sign(gridWidth) || 1;

    // Lines along X-axis (varying Y, Z positions) — step Y by cellSizeY
    for (let i = 0; i <= divisionsY; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(0, i * cellSizeY, j * cellSize, gridWidth, i * cellSizeY, j * cellSize);
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
        points.push(x, j * cellSizeY, 0, x, j * cellSizeY, gridDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color,
      opacity: 0.0025,
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

    // Total visual height: 128 rows * CELL_HEIGHT (2.0) = 256 units
    const visualHeight = height * CELL_HEIGHT;

    // Жестко передаем CELL_HEIGHT (2.0) как шаг по оси Y, чтобы получилось ровно 128 делений
    const gridVis = this._createGridVisualization(
      isLeftGrid ? -width : width,
      visualHeight,
      depth,
      cellSize,
      color,
      CELL_HEIGHT
    );
    group.add(gridVis);

    const axis = this._createAxis(width, visualHeight, depth, sphereRadiusForAxis, isLeftGrid);
    group.add(axis);

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
    // Z = 0: Убираем бессмысленный сдвиг на -64. Теперь основание голограммы строго на Z=0.
    const commonSpinePosition = new THREE.Vector3(0, -GRID_HEIGHT, 0);

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
    blueSphere.position.set(0, -GRID_HEIGHT, 0); // Z = 0
    this.mainSequencerGroup.add(blueSphere);

    // White Sphere: At Origin, Smaller (Front, on top of Blue)
    const whiteGeometry = new THREE.SphereGeometry(2.4192, 32, 32);
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: true,
      transparent: false,
      opacity: 1.0
    });
    const whiteSphere = new THREE.Mesh(whiteGeometry, whiteMaterial);
    whiteSphere.renderOrder = 999; // Front, renders on top
    whiteSphere.position.set(0, -GRID_HEIGHT, 0); // Z = 0
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

    const geometry = new THREE.BoxGeometry(width, CELL_HEIGHT, CELL_SIZE, 1, 1, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: baseColorObj },
        uSelection: { value: 0.0 },
        uOpacity: { value: 0.85 },
        uColumnScaleZ: { value: 0.1 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const columnMesh = new THREE.Mesh(geometry, material);
    columnMesh.castShadow = true;
    columnMesh.receiveShadow = true;

    // Y position (pitch row): distributed with CELL_HEIGHT (2.0) spacing
    // Alignment: Column 0 starts at local Y=1 (between grid lines 0 and 2)
    const y = (semitoneIndex + 0.5) * CELL_HEIGHT;

    // Initial scale: Z will be modulated by audio
    columnMesh.scale.set(1, 1, 0.1);

    // Center mesh so base stays at world Z=0
    columnMesh.position.set(width / 2, y, 0);

    // HIGHLIGHT EDGES
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgeColor = new THREE.Color(semitone.color).offsetHSL(0, 0, 0.4);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.9,
      linewidth: 1,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0
    });
    const edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);

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

    // XR Cochlear Cylinder delegation
    if (this.isXRMode && this.cochlearCylinder) {
      const audioData = this.latestCwtData || (state.audio && state.audio.latestAudioData);
      if (audioData) {
        const dbLevels = audioData.levels || audioData.dbLevels;
        const panAngles = audioData.pans || audioData.panAngles;
        this.cochlearCylinder.updateVisuals(dbLevels, panAngles);
      }
      return; // Skip flat grid rendering
    }

    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
    let audioData = this.latestCwtData;

    // DEBUG: Log activity only when state changes, throttle to 3 seconds
    if (!this._lastRenderLog || Date.now() - this._lastRenderLog > 3000) {
      const stateKey = `${isActive}|${!!audioData}`;
      if (this._lastRenderState !== stateKey) {
        console.log(`[Renderer] State: isActive=${isActive}, hasData=${!!audioData}`);
        if (audioData && audioData.levels) {
          console.log(`[Renderer] level[0]=${audioData.levels[0].toFixed(2)} dB, max=${Math.max(...audioData.levels).toFixed(2)}`);
        }
        this._lastRenderState = stateKey;
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
          if (leftMesh.material.uniforms) {
            leftMesh.material.uniforms.uBaseColor.value.copy(columnPair.left.userData.baseColor);
          } else if (leftMesh.material.color) {
            leftMesh.material.color.copy(columnPair.left.userData.baseColor);
          }

          // Reset edge opacity in Greeting Mode
          const leftEdgesMesh = leftMesh.children[0];
          if (leftEdgesMesh && leftEdgesMesh.material) leftEdgesMesh.material.opacity = 0.8;
        }
        if (rightMesh) {
          rightMesh.scale.z = gDepth;
          rightMesh.position.z = gDepth / 2;
          if (rightMesh.material.uniforms) {
            rightMesh.material.uniforms.uBaseColor.value.copy(columnPair.right.userData.baseColor);
          } else if (rightMesh.material.color) {
            rightMesh.material.color.copy(columnPair.right.userData.baseColor);
          }

          // Reset edge opacity in Greeting Mode
          const rightEdgesMesh = rightMesh.children[0];
          if (rightEdgesMesh && rightEdgesMesh.material) rightEdgesMesh.material.opacity = 0.8;
        }
        columnPair.left.position.x = -semitoneConfig.width;
        columnPair.right.position.x = 0;
      } else {
        // ACTIVE MODE: Smart Physics (Phase 4)
        const dbL = dbLevels ? dbLevels[index] : -128;
        const dbR = dbLevels ? dbLevels[index + 128] : -128; // Standard stereo mapping (128 Offset)
        const conf = this.latestConfidenceData ? this.latestConfidenceData[index] : 1.0;

        const ampDataL = getNormAmp(dbL);
        const ampDataR = getNormAmp(dbR);

        const qAmpL = ampDataL.length;
        const qAmpR = ampDataR.length;

        // 1. MAGNETIC PAN
        const targetPan = Math.max(-1, Math.min(1, panAngles ? panAngles[index] : 0));
        const lerpFactor = 0.4 + (conf * 0.5);
        this._panStates[index] += (targetPan - this._panStates[index]) * lerpFactor;
        const pan = this._panStates[index];

        // 2. X Shift
        const availableSpace = GRID_WIDTH - semitoneConfig.width;
        const discreteOffset = Math.round(pan * availableSpace);

        columnPair.left.position.x = columnPair.left.userData.initialX + (pan < 0 ? discreteOffset : 0);
        columnPair.right.position.x = columnPair.right.userData.initialX + (pan > 0 ? discreteOffset : 0);

        // 3. Z Scaling & Shader Physics
        if (leftMesh) {
          const hL = Math.max(0.1, qAmpL);
          leftMesh.scale.z = hL;
          leftMesh.position.z = hL / 2;

          if (leftMesh.material.uniforms) {
            leftMesh.material.uniforms.uOpacity.value = 0.2 + (qAmpL / 128.0) * 0.75;
            leftMesh.material.uniforms.uColumnScaleZ.value = hL;
          }

          const isSelectedL = this.selectionState.left.active && this.selectionState.left.indices.includes(index);
          const leftEdgesMesh = leftMesh.children[0];

          if (isSelectedL) {
            const blink = (Math.sin(performance.now() * 0.01) + 1) * 0.5;
            if (leftMesh.material.uniforms) leftMesh.material.uniforms.uSelection.value = blink;
            if (leftEdgesMesh && leftEdgesMesh.material) {
              leftEdgesMesh.material.opacity = 0.8 + (0.2 * blink);
              if (leftEdgesMesh.material.uniforms && leftEdgesMesh.material.uniforms.uBaseColor) {
                leftEdgesMesh.material.uniforms.uBaseColor.value.setHSL(0, 0, 1.0);
              } else if (leftEdgesMesh.material.color) {
                leftEdgesMesh.material.color.setHSL(0, 0, 1.0);
              }
            }
          } else {
            if (leftMesh.material.uniforms) leftMesh.material.uniforms.uSelection.value = 0.0;
            if (leftEdgesMesh && leftEdgesMesh.material) {
              leftEdgesMesh.material.opacity = qAmpL > 0.1 ? 0.9 : 0.0;
              if (semitoneConfig) {
                const edgeBright = (hL + 1.0) / 128.0;
                const edgeC = new THREE.Color(semitoneConfig.color).multiplyScalar(edgeBright);
                if (leftEdgesMesh.material.uniforms && leftEdgesMesh.material.uniforms.uBaseColor) {
                  leftEdgesMesh.material.uniforms.uBaseColor.value.copy(edgeC);
                } else if (leftEdgesMesh.material.color) {
                  leftEdgesMesh.material.color.copy(edgeC);
                }
              }
            }
          }
        }

        if (rightMesh) {
          const hR = Math.max(0.1, qAmpR);
          rightMesh.scale.z = hR;
          rightMesh.position.z = hR / 2;

          if (rightMesh.material.uniforms) {
            rightMesh.material.uniforms.uOpacity.value = 0.2 + (qAmpR / 128.0) * 0.75;
            rightMesh.material.uniforms.uColumnScaleZ.value = hR;
          }

          const isSelectedR = this.selectionState.right.active && this.selectionState.right.indices.includes(index);
          const rightEdgesMesh = rightMesh.children[0];

          if (isSelectedR) {
            const blink = (Math.sin(performance.now() * 0.01) + 1) * 0.5;
            if (rightMesh.material.uniforms) rightMesh.material.uniforms.uSelection.value = blink;
            if (rightEdgesMesh && rightEdgesMesh.material) {
              rightEdgesMesh.material.opacity = 0.8 + (0.2 * blink);
              if (rightEdgesMesh.material.uniforms && rightEdgesMesh.material.uniforms.uBaseColor) {
                rightEdgesMesh.material.uniforms.uBaseColor.value.setHSL(0, 0, 1.0);
              } else if (rightEdgesMesh.material.color) {
                rightEdgesMesh.material.color.setHSL(0, 0, 1.0);
              }
            }
          } else {
            if (rightMesh.material.uniforms) rightMesh.material.uniforms.uSelection.value = 0.0;
            if (rightEdgesMesh && rightEdgesMesh.material) {
              rightEdgesMesh.material.opacity = qAmpR > 0.1 ? 0.9 : 0.0;
              if (semitoneConfig) {
                const edgeBright = (hR + 1.0) / 128.0;
                const edgeC = new THREE.Color(semitoneConfig.color).multiplyScalar(edgeBright);
                if (rightEdgesMesh.material.uniforms && rightEdgesMesh.material.uniforms.uBaseColor) {
                  rightEdgesMesh.material.uniforms.uBaseColor.value.copy(edgeC);
                } else if (rightEdgesMesh.material.color) {
                  rightEdgesMesh.material.color.copy(edgeC);
                }
              }
            }
          }
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
      `[BasilaQ-128 Physics] Frame ${this._debugFrameCount}\n` +
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
