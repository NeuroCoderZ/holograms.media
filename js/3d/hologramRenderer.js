import { state } from '../core/init.js';
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
    this.latestAudioData = null; // Legacy property
    this.latestCwtData = null; // High-precision spectral data (from mixer)
    this.latestSynthData = null; // Direct visual feedback from synth
    this.roomId = roomId;
    this.userId = userId;

    // hologramPivot is the main group that holds all hologram elements.
    // It allows for easy positioning, rotation, and scaling of the entire hologram.
    this.hologramPivot = new THREE.Group();
    this.hologramPivot.position.set(0, 0, 0); // Center the hologram at origin

    // LIGHTING: BasilaQ-127 Safety Lighting (Prevents Black Screen)
    // REDUCED AMBIENT to 0.1 to allow True Black for low volume columns.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.hologramPivot.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(0, 100, 200);
    dirLight.castShadow = true;
    this.hologramPivot.add(dirLight);

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

    // DEBUG: Frame counter for diagnostics
    this._debugFrameCount = 0;

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
    // (Log removed to reduce console spam)
    // Store the latest data (levels: Float32Array[256], pans: Float32Array[256])
    this.latestCwtData = data;
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

    // BasilaQ-127: Use StandardMaterial for Shading/Volume
    const material = new THREE.MeshStandardMaterial({
      color: baseColorObj,
      emissive: baseColorObj, // Safety: Glow based on color
      emissiveIntensity: 0.5, // Visible by default
      roughness: 0.3,
      metalness: 0.1,
      flatShading: true,
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
    const edgeColor = new THREE.Color(semitone.color).offsetHSL(0, 0, 0.2); // Brighter
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.8, // Increased contrast as requested
      linewidth: 1
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

    let audioData = this.latestCwtData;
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
    const noiseFloor = -110;

    // Helper: Honest Mapping Function
    const getNormAmp = (db) => {
      if (db <= noiseFloor) return 0;
      // Linear normalization between noiseFloor and adaptive ceiling
      let norm = (db - noiseFloor) / (safeCeiling - noiseFloor);
      return Math.max(0, Math.min(1.0, norm));
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

    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
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
          leftMesh.material.emissiveIntensity = 1.0;
          leftMesh.material.color.copy(columnPair.left.userData.baseColor);
        }
        if (rightMesh) {
          rightMesh.scale.z = gDepth;
          rightMesh.position.z = gDepth / 2;
          rightMesh.material.emissiveIntensity = 1.0;
          rightMesh.material.color.copy(columnPair.right.userData.baseColor);
        }
        columnPair.left.position.x = -semitoneConfig.width;
        columnPair.right.position.x = 0;
      } else {
        // ACTIVE MODE: Honest Physics v3 (High Sensitivity)
        const ampL = getNormAmp(dbLevels[index] || -128);
        const ampR = getNormAmp(dbLevels[index + numSemitones] || -128);
        
        // 1. Sanitize Pan Input [-1, 1]
        let pan = Math.max(-1, Math.min(1, panAngles[index] || 0));

        // Noise Gate for Pan stability
        if (Math.max(ampL, ampR) < 0.01) pan = 0;

        // 2. X Shift (Stereo Positioning) - Restrained to Grid Boundaries
        // Source of Truth: GRID_WIDTH = 128
        const availableSpace = GRID_WIDTH - semitoneConfig.width;
        
        // Left Grid: initialX is -width. Limit is [-128, 0]
        columnPair.left.position.x = columnPair.left.userData.initialX + (pan < 0 ? pan * availableSpace : 0);
        
        // Right Grid: initialX is 0. Limit is [0, 128]
        columnPair.right.position.x = columnPair.right.userData.initialX + (pan > 0 ? pan * availableSpace : 0);

        // 3. Z Scaling (Depth) and Physical Dimming
        const depthL = Math.pow(ampL, 1.1) * GRID_DEPTH;
        const depthR = Math.pow(ampR, 1.1) * GRID_DEPTH;

        if (leftMesh) {
          leftMesh.scale.z = Math.max(0.1, depthL);
          leftMesh.position.z = depthL / 2;

          // Z-Dimming: Intensity = current_depth / GRID_DEPTH
          // Discrete 128-step dimming link
          const intensityL = depthL / GRID_DEPTH;
          leftMesh.material.emissiveIntensity = intensityL;
          
          // Apply dimming to base color to achieve True Black
          const hsl = {};
          columnPair.left.userData.baseColor.getHSL(hsl);
          leftMesh.material.color.setHSL(hsl.h, hsl.s, hsl.l * intensityL);
        }

        if (rightMesh) {
          rightMesh.scale.z = Math.max(0.1, depthR);
          rightMesh.position.z = depthR / 2;

          const intensityR = depthR / GRID_DEPTH;
          rightMesh.material.emissiveIntensity = intensityR;
          
          const hsl = {};
          columnPair.right.userData.baseColor.getHSL(hsl);
          rightMesh.material.color.setHSL(hsl.h, hsl.s, hsl.l * intensityR);
        }
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
   */
  _logPhysicsDiagnostics(dbLevels, panAngles) {
    let blackCount = 0;
    let maxLevel = -Infinity;
    let minLevel = Infinity;
    let varianceSum = 0;
    let mean = 0;

    // Calculate Mean
    for (let i = 0; i < 256; i++) {
      mean += dbLevels[i];
      if (dbLevels[i] <= -100) blackCount++; // Assuming -100 is effective noise floor
      if (dbLevels[i] > maxLevel) maxLevel = dbLevels[i];
      if (dbLevels[i] < minLevel) minLevel = dbLevels[i];
    }
    mean /= 256;

    // Calculate Variance
    for (let i = 0; i < 256; i++) {
      varianceSum += Math.pow(dbLevels[i] - mean, 2);
    }
    const variance = varianceSum / 256;

    console.debug(`[Physics Verified] Frame ${this._debugFrameCount} | ` +
      `Black Cols: ${blackCount}/256 | ` +
      `Max dB: ${maxLevel.toFixed(1)} | ` +
      `Variance: ${variance.toFixed(2)} (High = Good Separation)`);
  }

  /**
   * Returns the main pivot group of the hologram, which can be added to the scene.
   * @returns {THREE.Group} The main hologram pivot group.
   */
  getHologramPivot() {
    return this.hologramPivot;
  }
}
