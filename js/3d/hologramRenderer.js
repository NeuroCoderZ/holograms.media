/**
 * hologramRenderer.js — HologramRenderer v20.2 (Fixed setInstanceColor)
 * ===================================================================
 * Оптимизация через InstancedMesh: 256 объектов -> 2 draw calls.
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
    console.log('[HologramRenderer] v20.2: Instanced — Fix setColorAt');
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestCwtData = null;
    this._panStates = new Float32Array(128).fill(0);
    this.roomId = roomId;
    this.userId = userId;

    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    this.columnGeometry = new THREE.BoxGeometry(1, CELL_HEIGHT, 1);
    this.columnGeometry.translate(0, 0, 0.5); 

    this._initInstancedMeshes();
    this._createSequencerGrids();

    this.mainSequencerGroup.scale.set(0.95, 0.95, 0.95);
    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { 
        if (data && data.levels) {
            this.latestCwtData = data; 
        }
    });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);
  }

  _initInstancedMeshes() {
    const count = semitones.length;
    
    this.instancedMaterial = new THREE.ShaderMaterial({
      defines: { USE_INSTANCING: "" },
      uniforms: makeColumnUniforms(new THREE.Color(0xffffff)),
      vertexShader,
      fragmentShader,
      transparent: false,
      depthWrite: true,
      depthTest: true
    });

    this.meshL = new THREE.InstancedMesh(this.columnGeometry, this.instancedMaterial, count);
    this.meshR = new THREE.InstancedMesh(this.columnGeometry, this.instancedMaterial.clone(), count);

    this.meshL.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.meshR.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Per-instance aColumnScaleZ attribute for shader brightness
    const scalesL = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(0.1), 1);
    const scalesR = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(0.1), 1);
    this.meshL.geometry.setAttribute('aColumnScaleZ', scalesL);
    this.meshR.geometry.setAttribute('aColumnScaleZ', scalesR);

    for (let i = 0; i < count; i++) {
      const color = new THREE.Color(semitones[i].color);
      // FIXED: Use setColorAt instead of setInstanceColor
      this.meshL.setColorAt(i, color);
      this.meshR.setColorAt(i, color);
    }
    this.meshL.instanceColor.needsUpdate = true;
    this.meshR.instanceColor.needsUpdate = true;

    this.mainSequencerGroup.add(this.meshL);
    this.mainSequencerGroup.add(this.meshR);
  }

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

    this.mainSequencerGroup.add(createCentralMarkerSphere(2.4192, 0xffffff));
  }

  updateVisuals() {
    const isActive = state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone');
    const isPaused = state.audio?.isPaused;

    const dummy = new THREE.Object3D();
    const audioData = this.latestCwtData || state.audio?.latestAudioData;
    const dbLevels = audioData?.levels || new Float32Array(256).fill(-128);
    const panAngles = audioData?.pans || new Float32Array(256).fill(0);

    for (let i = 0; i < semitones.length; i++) {
      const config = semitones[i];
      const width = config.width;
      const initialX_L = -width / 2;
      const initialX_R = width / 2;
      const initialY = (i + 0.5) * CELL_HEIGHT - GRID_HEIGHT;

      let currentHL = this.meshL.geometry.getAttribute('aColumnScaleZ').getX(i);
      let currentHR = this.meshR.geometry.getAttribute('aColumnScaleZ').getX(i);

      let pL = initialX_L;
      let pR = initialX_R;
      let hL = 0.1;
      let hR = 0.1;

      if (isActive && !isPaused) {
        let dbL = (dbLevels[i] !== undefined) ? dbLevels[i] : -128;
        let dbR = (dbLevels[i + 128] !== undefined) ? dbLevels[i + 128] : -128;

        const targetPan = panAngles[i] || 0;
        this._panStates[i] += (targetPan - this._panStates[i]) * 0.7;
        const p = this._panStates[i];

        const shadowDb = Math.abs(p) * config.shadow_coef * 128.0;
        if (p < -0.01) dbR -= shadowDb;
        else if (p > 0.01) dbL -= shadowDb;

        const maxAvailableShift = (GRID_WIDTH - width) * 0.5;
        pL = initialX_L - Math.round(Math.abs(Math.min(0, p)) * maxAvailableShift * 2);
        pR = initialX_R + Math.round(Math.abs(Math.max(0, p)) * maxAvailableShift * 2);

        hL = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, dbL)));
        hR = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, dbR)));
        
        // Update per-instance shader brightness attribute
        this.meshL.geometry.getAttribute('aColumnScaleZ').setX(i, hL);
        this.meshR.geometry.getAttribute('aColumnScaleZ').setX(i, hR);
      } else if (isPaused) {
        // [FIX] Freeze height and pan on pause
        pL = initialX_L - Math.round(Math.abs(Math.min(0, this._panStates[i])) * ((GRID_WIDTH - width) * 0.5) * 2);
        pR = initialX_R + Math.round(Math.abs(Math.max(0, this._panStates[i])) * ((GRID_WIDTH - width) * 0.5) * 2);
        hL = currentHL;
        hR = currentHR;
      }

      dummy.position.set(pL, initialY, 0);
      dummy.scale.set(width, 1, hL);
      dummy.updateMatrix();
      this.meshL.setMatrixAt(i, dummy.matrix);

      dummy.position.set(pR, initialY, 0);
      dummy.scale.set(width, 1, hR);
      dummy.updateMatrix();
      this.meshR.setMatrixAt(i, dummy.matrix);
    }

    this.meshL.instanceMatrix.needsUpdate = true;
    this.meshR.instanceMatrix.needsUpdate = true;
    
    this.meshL.geometry.getAttribute('aColumnScaleZ').needsUpdate = true;
    this.meshR.geometry.getAttribute('aColumnScaleZ').needsUpdate = true;

    // [FIX] Keep uIsGreeting = 0 during session even if paused
    const greetingValue = (isActive) ? 0.0 : 1.0;
    this.meshL.material.uniforms.uIsGreeting.value = greetingValue;
    this.meshR.material.uniforms.uIsGreeting.value = greetingValue;
  }

  getHologramPivot() { return this.hologramPivot; }
}
