/**
 * hologramRenderer.js — HologramRenderer v19.0 (Restored from March 17)
 * ======================================================================
 * Откат на индивидуальные Meshes + удаление обводки (ребер).
 */

import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';

import { vertexShader, fragmentShader, makeColumnUniforms } from './shaders/hologramShaders.js';
import { CELL_HEIGHT, createCentralMarkerSphere, createSphereForAxis, createGridVisualization, createAxis } from './hologramGridFactory.js';

export class HologramRenderer {

  constructor(scene, roomId, userId) {
    console.log('[HologramRenderer] v19.0: Restored — March 17 stable core (No Edges)');
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestCwtData = null;
    this._panStates = new Float32Array(128).fill(0);
    this.roomId = roomId;
    this.userId = userId;

    this._cochlearCylinder = null;
    this._isTorusMode = false;

    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    // 5% Margins: Scale down slightly to ensure air space without excess gap.
    this.mainSequencerGroup.scale.set(0.95, 0.95, 0.95);

    this.scene.add(this.hologramPivot);
  }

    this.eventBus.on('audioData', (data) => { this.latestCwtData = data; });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);
  }

  _createSequencerGrids() {
    // origin = -128. Grid height 256. Proportions 2:1.
    const origin = new THREE.Vector3(0, -GRID_HEIGHT, 0);

    this.leftSequencerGroup = new THREE.Group();
    this.leftSequencerGroup.position.copy(origin);
    // Green Axis (Y) should cover the same height as the grid visualization (256)
    this.leftSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, true));
    this.leftSequencerGroup.add(createGridVisualization(-GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0xBF00FF));
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = new THREE.Group();
    this.rightSequencerGroup.position.copy(origin);
    this.rightSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, false));
    this.rightSequencerGroup.add(createGridVisualization(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0xFF0000));
    this.mainSequencerGroup.add(this.rightSequencerGroup);

    const blue = createSphereForAxis(3.024, 0x0000ff);
    const white = createSphereForAxis(2.4192, 0xffffff);
    blue.position.set(0, -GRID_HEIGHT, 0);
    white.position.set(0, -GRID_HEIGHT, 0);
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

    const geometry = new THREE.BoxGeometry(width, CELL_HEIGHT, 1.0, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms: makeColumnUniforms(baseColor),
      vertexShader, fragmentShader, transparent: false, depthWrite: true, depthTest: true
    }));
    mesh.name = "AudioColumnMesh";
    mesh.position.set(0, 0, 0.5); // Align front-center
    mesh.scale.set(1, 1, 0.1);

    group.add(mesh);
    const initialX = isLeft ? -width / 2 : width / 2;
    group.position.set(initialX, (index + 0.5) * CELL_HEIGHT, 0);
    group.userData = { initialX, baseColor };
    return group;
  }

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
  }

  _applyGreetingMode(leftMesh, rightMesh, pair) {
    const gDepth = 0.1;
    [leftMesh, rightMesh].forEach(m => {
      m.scale.z = gDepth;
      m.position.z = gDepth / 2;
      m.material.uniforms.uIsGreeting.value = 1.0;
      m.material.uniforms.uColumnScaleZ.value = gDepth;
    });
    pair.left.position.x = pair.left.userData.initialX;
    pair.right.position.x = pair.right.userData.initialX;
  }

  _applyActiveMode(pair, i, config, dbLevels, panAngles, leftMesh, rightMesh) {
    let dbL = dbLevels[i];
    let dbR = dbLevels[i + 128];

    const targetPan = panAngles[i];
    this._panStates[i] += (targetPan - this._panStates[i]) * 0.7;
    const p = this._panStates[i];

    const shadowDb = Math.abs(p) * config.shadow_coef * 128.0;
    if (p < -0.01) dbR -= shadowDb;
    else if (p > 0.01) dbL -= shadowDb;

    const w = config.width || 1;
    const maxAvailableShift = (GRID_WIDTH - w) * 0.5;
    pair.left.position.x = pair.left.userData.initialX - Math.round(Math.abs(Math.min(0, p)) * maxAvailableShift * 2);
    pair.right.position.x = pair.right.userData.initialX + Math.round(Math.abs(Math.max(0, p)) * maxAvailableShift * 2);

    [[leftMesh, dbL], [rightMesh, dbR]].forEach(([m, db]) => {
      const h = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, db)));
      m.scale.z = h;
      m.position.z = h / 2;
      if (m.material.uniforms) {
        m.material.uniforms.uIsGreeting.value = 0.0;
        m.material.uniforms.uColumnScaleZ.value = h;
      }
    });
  }

  getHologramPivot() { return this.hologramPivot; }

  async toggleXRMode() {
    // Legacy support or new implementation
    return false;
  }
}
