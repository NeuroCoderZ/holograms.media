/**
 * hologramRenderer.js — HologramRenderer v20.2 (Optimized)
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
    console.log('[HologramRenderer] v20.2: Instanced — Optimized');
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestCwtData = null;
    this._panStates = new Float32Array(128).fill(0);
    this.roomId = roomId;
    this.userId = userId;

    this._dummy = new THREE.Object3D(); // PRO-FIX: Reusable object to avoid allocations

    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    this.baseColumnGeometry = new THREE.BoxGeometry(1, CELL_HEIGHT, 1);
    this.baseColumnGeometry.translate(0, 0, 0.5); 

    this._initInstancedMeshes();
    this._createSequencerGrids();

    this.mainSequencerGroup.scale.set(0.95, 0.95, 0.95);
    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { 
        if (data && data.levels) {
            this.latestCwtData = data; 
        }
    });

    // Сброс stale данных при Hard Reset WASM
    this.eventBus.on('audioReset', () => {
        this.latestCwtData = null;
        this._panStates.fill(0);
        console.log('[HologramRenderer] Audio reset: cleared stale CWT data');
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

    this.columnGeometryL = this.baseColumnGeometry.clone();
    this.columnGeometryR = this.baseColumnGeometry.clone();

    this.meshL = new THREE.InstancedMesh(this.columnGeometryL, this.instancedMaterial, count);
    this.meshR = new THREE.InstancedMesh(this.columnGeometryR, this.instancedMaterial.clone(), count);

    this.meshL.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.meshR.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Per-instance aColumnScaleZ attribute for shader brightness
    const scalesL = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(CELL_HEIGHT), 1);
    const scalesR = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(CELL_HEIGHT), 1);
    this.meshL.geometry.setAttribute('aColumnScaleZ', scalesL);
    this.meshR.geometry.setAttribute('aColumnScaleZ', scalesR);

    for (let i = 0; i < count; i++) {
      const color = new THREE.Color(semitones[i].color);
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
    const isActive = state.audio && (
        state.audio.isPlaying || 
        state.audio.activeSource === 'microphone' || 
        state.audio.activeSource === 'tria_voice'
    );
    const isPaused = state.audio?.isPaused;

    // Guard: если активно воспроизведение, но нет данных (WASM сбрасывается) — не рисуем stale
    if (isActive && !isPaused && !this.latestCwtData && !state.audio?.latestAudioData) return;

    const dummy = this._dummy;
    const audioData = this.latestCwtData || state.audio?.latestAudioData;
    const dbLevels = audioData?.levels || new Float32Array(256).fill(-128);
    const panAngles = audioData?.pans || new Float32Array(256).fill(0);

    // ✅ Вынести ЗА цикл — было внутри 128 итераций!
    const scalesL = this.meshL.geometry.getAttribute('aColumnScaleZ');
    const scalesR = this.meshR.geometry.getAttribute('aColumnScaleZ');

    for (let i = 0; i < semitones.length; i++) {
      const config = semitones[i];
      const width = config.width || 1; 
      const initialX_L = -width / 2;
      const initialX_R = width / 2;
      const initialY = (i + 0.5) * CELL_HEIGHT - GRID_HEIGHT;

      let dbL = (dbLevels[i] !== undefined) ? dbLevels[i] : -128;
      let dbR = (dbLevels[i + 128] !== undefined) ? dbLevels[i + 128] : -128;
      
      const hasSignal = dbL > -100 || dbR > -100;

      let pL = initialX_L;
      let pR = initialX_R;
      let hL = CELL_HEIGHT;
      let hR = CELL_HEIGHT;

      if (isActive && (!isPaused || hasSignal)) {
        // Физика BasilaQ-128: Шаг панорамы 1.41 градуса (180/128).
        // Убираем плавную интерполяцию (* 0.12), используем прямое дискретное значение.
        const targetPan = panAngles[i] || 0;
        this._panStates[i] = targetPan; // Мгновенное переключение позиции
        const p = this._panStates[i];

        const shadowDb = Math.abs(p) * (config.shadow_coef || 0) * 128.0;
        let effectiveDbL = dbL;
        let effectiveDbR = dbR;
        
        if (p < -0.01) effectiveDbR -= shadowDb;
        else if (p > 0.01) effectiveDbL -= shadowDb;

        const maxAvailableShift = (GRID_WIDTH - width) * 0.5;
        
        // ВАЖНО: Дискретное смещение (шаг в целую ячейку).
        // p находится в диапазоне [-1, 1]. Масштабируем до количества ячеек (64 влево, 64 вправо).
        const cellsToShift = Math.round(p * 64); 
        const discreteShift = (cellsToShift / 64) * maxAvailableShift;

        pL = initialX_L + Math.min(0, discreteShift) * 1.5;
        pR = initialX_R + Math.max(0, discreteShift) * 1.5;

        // Физика BasilaQ: 1дБ = 1 ячейка. Z-scale = 128 + dB. 
        hL = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, effectiveDbL)));
        hR = Math.max(0.1, 128.0 + Math.max(-128.0, Math.min(0.0, effectiveDbR)));
        
        scalesL.setX(i, hL);
        scalesR.setX(i, hR);
      } else {
        // В режиме паузы или отсутствия сигнала сбрасываем высоту, но сохраняем панораму
        const p = this._panStates[i];
        const maxAvailableShift = (GRID_WIDTH - width) * 0.5;
        const cellsToShift = Math.round(p * 64);
        const discreteShift = (cellsToShift / 64) * maxAvailableShift;

        pL = initialX_L + Math.min(0, discreteShift) * 1.5;
        pR = initialX_R + Math.max(0, discreteShift) * 1.5;
        
        hL = CELL_HEIGHT;
        hR = CELL_HEIGHT;
        scalesL.setX(i, hL);
        scalesR.setX(i, hR);
      }

      // Re-use _dummy to avoid allocations
      // Скейл по Y (НЕ по Z): ортографическая камера не показывает глубину.
      // Pivot BoxGeometry в центре Y, поэтому сдвигаем position.Y вверх на половину высоты,
      // чтобы колонка росла ВВЕРХ от базовой линии.
      const scaleY_L = hL / CELL_HEIGHT;
      dummy.position.set(pL, initialY + CELL_HEIGHT * scaleY_L * 0.5, 0);
      dummy.scale.set(width, scaleY_L, 1);
      dummy.updateMatrix();
      this.meshL.setMatrixAt(i, dummy.matrix);

      const scaleY_R = hR / CELL_HEIGHT;
      dummy.position.set(pR, initialY + CELL_HEIGHT * scaleY_R * 0.5, 0);
      dummy.scale.set(width, scaleY_R, 1);
      dummy.updateMatrix();
      this.meshR.setMatrixAt(i, dummy.matrix);
    }

    this.meshL.instanceMatrix.needsUpdate = true;
    this.meshR.instanceMatrix.needsUpdate = true;
    
    this.meshL.geometry.getAttribute('aColumnScaleZ').needsUpdate = true;
    this.meshR.geometry.getAttribute('aColumnScaleZ').needsUpdate = true;

    const greetingValue = (isActive) ? 0.0 : 1.0;
    this.meshL.material.uniforms.uIsGreeting.value = greetingValue;
    this.meshR.material.uniforms.uIsGreeting.value = greetingValue;
  }

  getHologramPivot() { return this.hologramPivot; }
}
