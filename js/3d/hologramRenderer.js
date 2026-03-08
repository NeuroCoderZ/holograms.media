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

    this.columns = [];
    this._createSequencerGrids();
    this._initializeColumns();

    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { this.latestCwtData = data; });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    this.selectionState = { left: { active: false, indices: [] }, right: { active: false, indices: [] } };
    this._debugFrameCount = 0;

    // Инициализируем WASD контроллеры сразу, чтобы они работали везде
    // this._setupWASDControls(); Оставлено sceneSetup.js
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

    // Позиционные маркеры (сферы на начале координат)
    const blue = createSphereForAxis(3.024, 0x0000ff);
    const white = createSphereForAxis(2.4192, 0xffffff);
    blue.position.set(0, -GRID_HEIGHT, 0);
    white.position.set(0, -GRID_HEIGHT, 0);
    white.renderOrder = 999;
    this.mainSequencerGroup.add(blue);
    this.mainSequencerGroup.add(white);

    this.hologramPivot.add(createCentralMarkerSphere(2.4192, 0xffffff));
  }

  _initializeColumns() {
    for (let i = 0; i < semitones.length; i++) {
      const colL = this._createColumn(i, true);
      const colR = this._createColumn(i, false);
      this.columns.push({ left: colL, right: colR });
      this.leftSequencerGroup.add(colL);
      this.rightSequencerGroup.add(colR);
    }
  }

  _createColumn(index, isLeft) {
    const config = semitones[index];
    const width = config.width;
    const baseColor = new THREE.Color(config.color);
    const group = new THREE.Group();
    group.name = "AudioColumnGroup";

    // Убрали сегментацию по ширине, так как столбцы больше не изгибаются по вершинам
    const geometry = new THREE.BoxGeometry(width, CELL_HEIGHT, 1.0, 1, 1, 1);

    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms: makeColumnUniforms(baseColor),
      vertexShader, fragmentShader, transparent: false, depthWrite: true, depthTest: true
    }));
    mesh.name = "AudioColumnMesh";
    mesh.position.set(0, 0, 0);
    mesh.scale.set(1, 1, 0.1);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.ShaderMaterial({
        uniforms: makeEdgeUniforms(baseColor.clone().offsetHSL(0, 0, 0.2)),
        vertexShader, fragmentShader, transparent: false, depthWrite: true, depthTest: true
      })
    );
    edges.name = "AudioColumnEdges";
    mesh.add(edges);

    group.add(mesh);
    const initialX = isLeft ? -width / 2 : width / 2;
    group.position.set(initialX, (index + 0.5) * CELL_HEIGHT, 0);
    group.userData = { initialX, baseColor };
    return group;
  }

  // ─── Audio Visualisation ────────────────────────────────────────────────

  updateVisuals() {
    if (state.audio?.isPaused) return;

    const isActive = state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone');
    const audioData = this.latestCwtData || state.audio?.latestAudioData;
    const dbLevels = audioData?.levels || new Float32Array(256).fill(-128);
    const panAngles = audioData?.pans || new Float32Array(256).fill(0);

    this.columns.forEach((pair, i) => {
      const config = semitones[i];
      const leftMesh = pair.left.children[0];
      const rightMesh = pair.right.children[0];

      if (!isActive) {
        this._applyGreetingMode(leftMesh, rightMesh, pair);
      } else {
        this._applyActiveMode(pair, i, config, dbLevels, panAngles, leftMesh, rightMesh);
      }
    });

    this._debugFrameCount++;
  }

  /** Анимация приветствия: плоские столбцы по центру. */
  _applyGreetingMode(leftMesh, rightMesh, pair) {
    const gDepth = 0.1;
    [leftMesh, rightMesh].forEach(m => {
      m.scale.z = gDepth;
      m.position.z = gDepth / 2;
      m.material.uniforms.uIsGreeting.value = 1.0;
      m.material.uniforms.uColumnScaleZ.value = gDepth;
      const edges = m.children[0];
      if (edges?.material?.uniforms) {
        edges.material.uniforms.uIsGreeting.value = 1.0;
        edges.material.uniforms.uColumnScaleZ.value = gDepth;
      }
    });
    pair.left.position.x = pair.left.userData.initialX;
    pair.right.position.x = pair.right.userData.initialX;
  }

  /** Психоакустическая биауральная физика (BasilaQ-128). */
  _applyActiveMode(pair, i, config, dbLevels, panAngles, leftMesh, rightMesh) {
    let dbL = dbLevels[i];
    let dbR = dbLevels[i + 128];

    // 1. Пан-стейт (магнитная инерция)
    const targetPan = panAngles[i];
    this._panStates[i] += (targetPan - this._panStates[i]) * 0.7;
    const p = this._panStates[i];

    // 2. Слуховая маскировка (ILD: inter-aural level difference)
    const shadowDb = Math.abs(p) * config.shadow_coef * 128.0;
    if (p < -0.01) dbR -= shadowDb;
    else if (p > 0.01) dbL -= shadowDb;

    // 3. Симметричный паканг (оба уха к центру своей сетки)
    // Отключаем плоское X-панорамирование, если мы в режиме кольца (чтобы не искажало круг)
    const isTorus = this._cochlearCylinder && (this._cochlearCylinder.isTorusMode || this._cochlearCylinder.isMorphing);

    if (!isTorus) {
      const w = config.width || 1;
      const maxAvailableShift = (GRID_WIDTH - w) * 0.5;
      pair.left.position.x = pair.left.userData.initialX - Math.round(Math.abs(Math.min(0, p)) * maxAvailableShift * 2);
      pair.right.position.x = pair.right.userData.initialX + Math.round(Math.abs(Math.max(0, p)) * maxAvailableShift * 2);
    } else {
      // В режиме XR столбцы должны быть строго привязаны к номинальным ячейкам сеток
      pair.left.position.x = pair.left.userData.initialX;
      pair.right.position.x = pair.right.userData.initialX;
    }

    // 4. BasilaQ-128: 1 dB = 1 ячейка (Z-scale = 128 + dB)
    [[leftMesh, dbL], [rightMesh, dbR]].forEach(([m, db]) => {
      const h = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, db)));
      m.scale.z = h;
      m.position.z = h / 2;
      if (m.material.uniforms) {
        m.material.uniforms.uIsGreeting.value = 0.0;
        m.material.uniforms.uColumnScaleZ.value = h;
        m.material.uniforms.uBrightnessBoost.value = 1.0;
      }
      const edges = m.children[0];
      if (edges?.material?.uniforms) {
        edges.material.uniforms.uIsGreeting.value = 0.0;
        edges.material.uniforms.uColumnScaleZ.value = h;
        edges.material.uniforms.uBrightnessBoost.value = 1.3;
      }
    });
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
      this._cochlearCylinder.setColumns(this.columns, state.camera);
    }

    const mainArea = document.querySelector('.main-area');
    const gridContainer = document.querySelector('#grid-container');
    const controls = state.controls;
    const camera = state.camera;

    if (!this._isTorusMode) {
      if (mainArea) mainArea.classList.add('xr-mode');
      if (gridContainer) gridContainer.classList.add('xr-mode');

      // Жесткая фиксация высоты
      this.hologramPivot.position.y = 0;

      if (camera) {
        camera.far = 5000;
        camera.updateProjectionMatrix();
      }

      // Camera settings are now handled by sceneSetup.js setXRMode

      await this._cochlearCylinder.morphToTorus(1500, this.leftSequencerGroup, this.rightSequencerGroup);

      this.columns.forEach(pair => {
        [pair.left.children[0], pair.right.children[0]].forEach(mesh => {
          if (mesh.material.uniforms.uInversePerspective) mesh.material.uniforms.uInversePerspective.value = 1.0;
          const edges = mesh.children[0];
          if (edges && edges.material.uniforms.uInversePerspective) edges.material.uniforms.uInversePerspective.value = 1.0;
        });
      });

      this._isTorusMode = true;
      this._startDeviceOrientation();
      return true;
    } else {
      await this._cochlearCylinder.morphToFlat(1500, this.leftSequencerGroup, this.rightSequencerGroup);

      this.columns.forEach(pair => {
        [pair.left.children[0], pair.right.children[0]].forEach(mesh => {
          if (mesh.material.uniforms.uInversePerspective) mesh.material.uniforms.uInversePerspective.value = 0.0;
          const edges = mesh.children[0];
          if (edges && edges.material.uniforms.uInversePerspective) edges.material.uniforms.uInversePerspective.value = 0.0;
        });
      });

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

      // Camera restore settings are handled by sceneSetup.js setXRMode

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
}
