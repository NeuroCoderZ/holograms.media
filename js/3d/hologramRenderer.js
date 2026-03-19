/**
 * hologramRenderer.js — HologramRenderer v19.0 (Refactored)
 * ===========================================================
 * Ответственность: управление 3D-сценой голограммы и аудио-визуализацией.
 *
 * Импортирует:
 *   - hologramShaders.js    → GLSL вершинный/фрагментный шейдеры
 *   - hologramGridFactory.js → фабрики геометрий (Grid, Axis, Sphere…)
 *   - CochlearCylinder.js   → тороидальный XR-режим (lazy import)
 */

import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';
import perfMonitor from '../utils/perfMonitor.js';

import { vertexShader, fragmentShader, makeColumnUniforms, makeEdgeUniforms } from './shaders/hologramShaders.js';
import { CELL_HEIGHT, createCentralMarkerSphere, createSphereForAxis, createGridVisualization, createAxis } from './hologramGridFactory.js';

// ─────────────────────────────────────────────────────────────────────────────
export class HologramRenderer {

  constructor(scene, roomId, userId) {
    console.log('[HologramRenderer] v19.0: Refactored — Binaural Physics Active');
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestCwtData = null;
    this._panStates = new Float32Array(128).fill(0);
    this.roomId = roomId;
    this.userId = userId;

    // Instanced Data Buffers (256 instances: 0-127 Left, 128-255 Right)
    this._instanceMatrices = new Float32Array(256 * 16);
    this._instanceScales = new Float32Array(256);
    this._instanceColors = new Float32Array(256 * 3);

    // XR state
    this._cochlearCylinder = null;
    this._isTorusMode = false;
    this._deviceOrientationBound = false;
    this._deviceOrientationHandler = null;
    this._alphaOffset = null;

    // Scene tree
    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    this._createSequencerGrids();
    this._initializeInstancedMeshes();

    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { this.latestCwtData = data; });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    this.selectionState = { left: { active: false, indices: [] }, right: { active: false, indices: [] } };
    this._debugFrameCount = 0;
  }

  // ─── Scene Construction ──────────────────────────────────────────────────

  _createSequencerGrids() {
    const origin = new THREE.Vector3(0, -GRID_HEIGHT, 0);

    this.leftSequencerGroup = new THREE.Group();
    this.leftSequencerGroup.position.copy(origin);
    this.leftSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, true));
    this.leftSequencerGroup.add(createGridVisualization(-GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0xBF00FF));
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = new THREE.Group();
    this.rightSequencerGroup.position.copy(origin);
    this.rightSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, false));
    this.rightSequencerGroup.add(createGridVisualization(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0xFF0000));
    this.mainSequencerGroup.add(this.rightSequencerGroup);

    // Позиционные маркеры
    const blue = createSphereForAxis(3.024, 0x0000ff);
    const white = createSphereForAxis(2.4192, 0xffffff);
    blue.position.set(0, -GRID_HEIGHT, 0);
    white.position.set(0, -GRID_HEIGHT, 0);
    this.mainSequencerGroup.add(blue);
    this.mainSequencerGroup.add(white);

    this.hologramPivot.add(createCentralMarkerSphere(2.4192, 0xffffff));
  }

  _initializeInstancedMeshes() {
    const boxGeo = new THREE.BoxGeometry(1, CELL_HEIGHT, 1);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);

    const createIM = (isEdges = false) => {
        const material = new THREE.ShaderMaterial({
            uniforms: isEdges ? makeEdgeUniforms(new THREE.Color(1,1,1)) : makeColumnUniforms(new THREE.Color(1,1,1)),
            vertexShader, fragmentShader, transparent: false, depthWrite: true, depthTest: true
        });
        const im = isEdges ? new THREE.InstancedMesh(edgeGeo, material, 256) : new THREE.InstancedMesh(boxGeo, material, 256);
        
        // Add instance attributes for scale and color
        const scales = new THREE.InstancedBufferAttribute(new Float32Array(256), 1);
        const colors = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
        im.geometry.setAttribute('aColumnScaleZ', scales);
        im.geometry.setAttribute('aInstanceColor', colors);
        
        // Initial setup
        const dummy = new THREE.Object3D();
        for (let i = 0; i < 256; i++) {
            const isLeft = i < 128;
            const configIndex = i % 128;
            const config = semitones[configIndex];
            const w = config.width;
            const x = isLeft ? -w/2 : w/2;
            
            dummy.position.set(x, (configIndex + 0.5) * CELL_HEIGHT, 0);
            dummy.scale.set(w, 1, 1);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            
            const c = new THREE.Color(config.color);
            colors.setXYZ(i, c.r, c.g, c.b);
            scales.setX(i, 0.1);
        }
        return im;
    };

    this.columnsIM = createIM();
    this.columnsIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Added this line
    // Removed this.edgesIM = createIM(true);

    // Compatibility: pointers for CochlearCylinder
    this.leftIM = this.columnsIM;
    this.rightIM = this.columnsIM;
    this.leftEdgesIM = this.columnsIM; // Pointing to columnsIM as edgesIM is removed
    this.rightEdgesIM = this.columnsIM; // Pointing to columnsIM as edgesIM is removed

    this.mainSequencerGroup.add(this.columnsIM);
    // Removed this.mainSequencerGroup.add(this.edgesIM);
    
    // For legacy reasons (if any logic depends on this.columns, though none should now)
  }

  // ─── Audio Visualisation ────────────────────────────────────────────────

  updateVisuals() {
    if (state.audio?.isPaused) return;

    const isActive = state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone');
    const audioData = this.latestCwtData || state.audio?.latestAudioData;
    const dbLevels = audioData?.levels || new Float32Array(256).fill(-128);
    const panAngles = audioData?.pans || new Float32Array(256).fill(0);

    const dummy = new THREE.Object3D();
    const cScales = this.columnsIM.geometry.getAttribute('aColumnScaleZ');
    // Removed const eScales = this.edgesIM.geometry.getAttribute('aColumnScaleZ');

    for (let i = 0; i < 128; i++) {
        const config = semitones[i];
        if (isActive) {
            this._applyActiveModeInstanced(i, config, dbLevels, panAngles, dummy, cScales);
        } else {
            this._applyGreetingModeInstanced(i, dummy, cScales);
        }
    }

    this.columnsIM.instanceMatrix.needsUpdate = true;
    // Removed this.edgesIM.instanceMatrix.needsUpdate = true;
    cScales.needsUpdate = true;
    // Removed eScales.needsUpdate = true;

    this._debugFrameCount++;
  }

  _applyGreetingModeInstanced(i, dummy, cScales) {
    const gDepth = 0.1;
    const config = semitones[i];
    const w = config.width;
    const rightIndex = i + 128;
    
    // Left (0-127)
    dummy.position.set(-w/2, (i + 0.5) * CELL_HEIGHT, gDepth/2);
    dummy.scale.set(w, 1, 1);
    dummy.updateMatrix();
    this.columnsIM.setMatrixAt(i, dummy.matrix);
    cScales.setX(i, gDepth);
    
    // Right (128-255)
    dummy.position.set(w/2, (i + 0.5) * CELL_HEIGHT, gDepth/2);
    dummy.updateMatrix();
    this.columnsIM.setMatrixAt(rightIndex, dummy.matrix);
    cScales.setX(rightIndex, gDepth);

    this.columnsIM.material.uniforms.uIsGreeting.value = 1.0;
  }

  _applyActiveModeInstanced(i, config, dbLevels, panAngles, dummy, cScales) {
    let dbL = dbLevels[i];
    let dbR = dbLevels[i + 128];
    const rightIndex = i + 128;

    if (!Number.isFinite(dbL)) dbL = -128.0;
    if (!Number.isFinite(dbR)) dbR = -128.0;

    const targetPan = panAngles[i];
    this._panStates[i] += (targetPan - this._panStates[i]) * 0.7;
    const p = this._panStates[i];

    const shadowDb = Math.abs(p) * config.shadow_coef * 128.0;
    if (p < -0.01) dbR -= shadowDb;
    else if (p > 0.01) dbL -= shadowDb;

    const w = config.width || 1;
    const hL = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, dbL)));
    const hR = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, dbR)));

    const maxAvailableShift = (GRID_WIDTH - w) * 0.5;
    const xL = -w/2 - Math.round(Math.abs(Math.min(0, p)) * maxAvailableShift * 2);
    const xR = w/2 + Math.round(Math.abs(Math.max(0, p)) * maxAvailableShift * 2);

    dummy.scale.set(w, 1, hL);
    
    // Left
    dummy.position.set(xL, (i + 0.5) * CELL_HEIGHT, hL / 2);
    dummy.updateMatrix();
    this.columnsIM.setMatrixAt(i, dummy.matrix);
    cScales.setX(i, hL);

    // Right
    dummy.scale.set(w, 1, hR);
    dummy.position.set(xR, (i + 0.5) * CELL_HEIGHT, hR / 2);
    dummy.updateMatrix();
    this.columnsIM.setMatrixAt(rightIndex, dummy.matrix);
    cScales.setX(rightIndex, hR);

    this.columnsIM.material.uniforms.uIsGreeting.value = 0.0;
  }

  // ─── Accessors ───────────────────────────────────────────────────────────

  getHologramPivot() { return this.hologramPivot; }

  // ─── XR / Cochlear Cylinder ──────────────────────────────────────────────

  /**
   * Flat Grids ↔ Ring (Cochlear Cylinder).
   * @returns {Promise<boolean>} true = ring mode active
   */
  async toggleXRMode() {
    if (!this._cochlearCylinder) {
      const { CochlearCylinder } = await import('./CochlearCylinder.js');
      this._cochlearCylinder = new CochlearCylinder(this.hologramPivot);
      this._cochlearCylinder.setInstancedMeshes({
          left: this.leftIM,
          right: this.rightIM,
          leftEdges: this.leftEdgesIM,
          rightEdges: this.rightEdgesIM
      });
    }

    const mainArea = document.querySelector('.main-area');
    const gridContainer = document.querySelector('#grid-container');
    const camera = state.camera;

    if (!this._isTorusMode) {
      if (mainArea) mainArea.classList.add('xr-mode');
      if (gridContainer) gridContainer.classList.add('xr-mode');

      this.hologramPivot.position.y = 0;

      if (camera) {
        camera.far = 5000;
        camera.updateProjectionMatrix();
      }

      await this._cochlearCylinder.morphToTorus(1500);

      const updateIP = (val) => {
          [this.leftIM, this.rightIM, this.leftEdgesIM, this.rightEdgesIM].forEach(im => {
              if (im.material.uniforms.uInversePerspective) im.material.uniforms.uInversePerspective.value = val;
          });
      };
      updateIP(1.0);

      this._isTorusMode = true;
      this._startDeviceOrientation();
      return true;
    } else {
      await this._cochlearCylinder.morphToFlat(1500);

      const updateIP = (val) => {
          [this.leftIM, this.rightIM, this.leftEdgesIM, this.rightEdgesIM].forEach(im => {
              if (im.material.uniforms.uInversePerspective) im.material.uniforms.uInversePerspective.value = val;
          });
      };
      updateIP(0.0);

      this._isTorusMode = false;
      this._stopDeviceOrientation();

      if (mainArea) mainArea.classList.remove('xr-mode');
      if (gridContainer) gridContainer.classList.remove('xr-mode');

      this.hologramPivot.position.y = 0;

      if (camera) {
        camera.far = 2000;
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
      }

      this.hologramPivot.scale.set(1, 1, 1);
      this.hologramPivot.rotation.set(0, 0, 0);

      return false;
    }
  }

  _setupWASDControls() {
    // Moved to sceneSetup.js and rendering.js
  }

  _teardownXRControls() {
    // Больше не удаляем слушатели, так как они универсальные
    // Но останавливаем анимацию если нужно (хотя она теперь вечная)
  }

  /** Подписываемся на DeviceOrientation (alpha = yaw = "обход вокруг кольца"). */
  _startDeviceOrientation() {
    if (!window.DeviceOrientationEvent || this._deviceOrientationBound) return;
    this._alphaOffset = null;
    this._deviceOrientationHandler = (e) => {
      if (!this._isTorusMode || !this.hologramPivot) return;
      const alpha = e.alpha;
      if (alpha == null) return;
      if (this._alphaOffset === null) {
        this._alphaOffset = alpha;
        console.log('[HologramRenderer] Ring calibrated. Front ≡', alpha.toFixed(1), '°');
      }
      let delta = alpha - this._alphaOffset;
      if (delta < 0) delta += 360;
      this.hologramPivot.rotation.y = -(delta / 360) * Math.PI * 2;
    };
    window.addEventListener('deviceorientation', this._deviceOrientationHandler, { passive: true });
    this._deviceOrientationBound = true;
    console.log('[HologramRenderer] DeviceOrientation → ring walk ON');
  }

  /** Отписываемся и сбрасываем вращение. */
  _stopDeviceOrientation() {
    if (!this._deviceOrientationBound) return;
    window.removeEventListener('deviceorientation', this._deviceOrientationHandler);
    this._deviceOrientationBound = false;
    this._alphaOffset = null;
    this.hologramPivot.rotation.y = 0;
    console.log('[HologramRenderer] DeviceOrientation → ring walk OFF');
  }

  /**
   * Визуализация сканирования Bluetooth Mesh.
   * Радиус Тора расширяется пропорционально "обнаруженным" устройствам.
   */
  async triggerBluetoothScan() {
    if (!this._isTorusMode || !this._cochlearCylinder) {
      console.warn('[Bluetooth Mesh] Scan visual only works in Torus/XR mode.');
      return;
    }

    console.log('[Bluetooth Mesh] Initiating visual scan sequence...');

    const originalRadius = 1500;
    const scanRadius = 1850;

    if (window.TWEEN) {
      new TWEEN.Tween({ r: originalRadius })
        .to({ r: scanRadius }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          if (this._cochlearCylinder) {
            this._cochlearCylinder.radius = obj.r;
            this._cochlearCylinder.updatePositions();
          }
        })
        .repeat(1)
        .yoyo(true)
        .start();
    }
  }
}
