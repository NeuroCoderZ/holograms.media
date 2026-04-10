/**
 * hologramRenderer.js — HologramRenderer v20.2 (Optimized)
 * ===================================================================
 * Оптимизация через InstancedMesh: 256 объектов -> 2 draw calls.
 */

import { state, TORUS_PARAMS } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';

import { vertexShader, fragmentShader, makeColumnUniforms } from './shaders/hologramShaders.js';
import { CELL_HEIGHT, createCentralMarkerSphere, createSphereForAxis, createGridVisualization, createAxis } from './hologramGridFactory.js';

// TORUS_PARAMS: H_Y=3.44м, D_Z=1.72м, R_in=1.0м, GRID=128x128x256
// Физические размеры: TORUS_PARAMS.H_Y=3.44м (Y), TORUS_PARAMS.D_Z=1.72м (Z)
// Сетка отображается во фронтальной проекции, в XR масштаб 1:1

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
    this._lastUpdate = 0;
    this._minUpdateInterval = 1000 / 60; // Throttle: max 60fps update (как в феврале 9d105c6)
    this._initTime = Date.now(); // For WASM init grace period
    this._lastAudioActive = false; // Track when audio becomes active

    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    this.baseColumnGeometry = new THREE.BoxGeometry(1, CELL_HEIGHT, 1);
    this.baseColumnGeometry.translate(0, 0, 0.5); 

    this._initInstancedMeshes();
    this._createSequencerGrids();

    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { 
        const now = Date.now();
        const shouldLog = !window._audioDataHandlerLog || (now - (window._lastAudioDataLog || 0) > 3000);
        
        if (shouldLog) {
            console.log('[HologramRenderer] ⚡ audioData handler:', {
                hasData: !!data,
                hasLevels: !!(data?.levels),
                hasPans: !!(data?.pans),
                levelsLen: data?.levels?.length,
                pansLen: data?.pans?.length,
                levelsSample: data?.levels ? Array.from(data.levels.slice(0, 3)) : 'N/A',
                pansSample: data?.pans ? Array.from(data.pans.slice(0, 3)) : 'N/A'
            });
            if (!window._audioDataHandlerLog) window._audioDataHandlerLog = true;
            window._lastAudioDataLog = now;
        }
        
        if (data && data.levels) {
            this.latestCwtData = data;
            // DIAGNOSTIC: Log received data
            if (!window._audioDataReceivedLog) {
                console.log('[HologramRenderer] 📥 Received audioData:', {
                    levelsSample: data.levels.slice(0, 5),
                    pansSample: data.pans.slice(0, 5),
                    maxLevel: Math.max(...data.levels),
                    minLevel: Math.min(...data.levels),
                    stateAudioLatest: !!state.audio?.latestAudioData
                });
                window._audioDataReceivedLog = true;
            }
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

    // Back-to-front отрисовка: левая сетка (дальше) рисуется первой, правая (ближе) — второй
    // Фиксированный renderOrder: НЕ используем sortObjects — он сортирует по distance to camera
    this.meshL.renderOrder = 0;
    this.meshR.renderOrder = 1;

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
    // Сетки Z = 128 (соответствует длине белой оси Z и max высоте столбца)
    const GRID_DEPTH_Z = 128;

    this.leftSequencerGroup = new THREE.Group();
    this.leftSequencerGroup.position.copy(origin);
    this.leftSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH_Z, true));
    this.leftSequencerGroup.add(createGridVisualization(-GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH_Z, CELL_SIZE, 0xBF00FF));
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = new THREE.Group();
    this.rightSequencerGroup.position.copy(origin);
    this.rightSequencerGroup.add(createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH_Z, false));
    this.rightSequencerGroup.add(createGridVisualization(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH_Z, CELL_SIZE, 0xFF0000));
    this.mainSequencerGroup.add(this.rightSequencerGroup);

    // Синяя точка на ПЕРЕСЕЧЕНИИ осей — в каждой сетке (0,0,0 локальные)
    this.leftSequencerGroup.add(createCentralMarkerSphere(0.5, 0x0000FF));
    this.rightSequencerGroup.add(createCentralMarkerSphere(0.5, 0x0000FF));
  }

  updateVisuals() {
    // Throttle: не чаще 60fps (как в феврале 9d105c6)
    const now = performance.now();
    if (now - this._lastUpdate < this._minUpdateInterval) return;
    this._lastUpdate = now;

    const isActive = state.audio && (
        state.audio.isPlaying || 
        state.audio.isPaused ||
        state.audio.activeSource === 'microphone' || 
        state.audio.activeSource === 'tria_voice'
    );
    const isPaused = state.audio?.isPaused;

    // ─── Freeze Frame при паузе ───────────────────────────────
    // При переходе в паузу — сохраняем последний кадр.
    // При выходе из паузы — НЕ очищаем мгновенно, а ждём первый live кадр.
    if (isPaused && !this._frozenFrame) {
      const audioData = this.latestCwtData || state.audio?.latestAudioData;
      if (audioData?.levels) {
        this._frozenFrame = {
          dbLevels: new Float32Array(audioData.levels),
          pans: new Float32Array(audioData.pans || new Float32Array(256).fill(0)),
        };
      }
    }

    // Определяем источник данных: frozen frame или live
    // ВАЖНО: если только что сняли с паузы и live данных ещё нет — используем frozen frame
    const hasLiveData = this.latestCwtData || state.audio?.latestAudioData;
    const audioData = this._frozenFrame || this.latestCwtData || state.audio?.latestAudioData;

    // Если не в паузе И есть live данные — очищаем frozen frame
    if (!isPaused && this._frozenFrame && hasLiveData) {
      this._frozenFrame = null;
    }

    // Guard: если вообще нет данных — рисуем DEMO столбцы (базовые)
    // Также рисуем демо если WASM в fallback mode (все 0 dB SPL = тишина) в течение grace period
    const isAllSilence = audioData && audioData.levels &&
        audioData.levels.every(v => v <= 1);  // dB SPL: 0-1 = тишина

    // Grace period: либо при загрузке страницы, либо при активации аудио
    const audioJustActivated = isActive && !this._lastAudioActive;
    if (isActive) this._lastAudioActive = true;
    const graceTime = audioJustActivated ? Date.now() : this._initTime;
    const wasmInitGrace = isAllSilence && (Date.now() - graceTime < 5000);

    // ═══ ДЕМО-РЕЖИМ: нет аудио ИЛИ тишина в grace period ═══
    if (!audioData || wasmInitGrace) {
        if (!window._demoColumnsLogged) {
            console.log('[HologramRenderer] 🎨 No audio data — drawing DEMO columns (hL=1, full color)');
            window._demoColumnsLogged = true;
        }

        const scalesL = this.meshL.geometry.getAttribute('aColumnScaleZ');
        const scalesR = this.meshR.geometry.getAttribute('aColumnScaleZ');

        // Демо: 1 ячейка глубины, полный цвет, прижаты к дальней стенке (position.z=0 уже)
        for (let i = 0; i < semitones.length; i++) {
            scalesL.setX(i, 1);
            scalesR.setX(i, 1);
        }

        scalesL.needsUpdate = true;
        scalesR.needsUpdate = true;

        // Greeting mode = полный цвет без затемнения
        this.meshL.material.uniforms.uIsGreeting.value = 1.0;
        this.meshR.material.uniforms.uIsGreeting.value = 1.0;
        return;
    }

    const dummy = this._dummy;
    // FIX: Handle both 'levels' (live) and 'dbLevels' (frozen) field names
    const rawLevels = audioData.dbLevels || audioData.levels;
    const dbLevels = rawLevels || new Float32Array(256).fill(-128);
    const panAngles = audioData.pans || new Float32Array(256).fill(0);

    // Если в паузе и есть frozen frame — используем его полностью
    const useFrozen = isPaused && this._frozenFrame;

    // ✅ Вынести ЗА цикл — было внутри 128 итераций!
    const scalesL = this.meshL.geometry.getAttribute('aColumnScaleZ');
    const scalesR = this.meshR.geometry.getAttribute('aColumnScaleZ');

    for (let i = 0; i < semitones.length; i++) {
      const config = semitones[i];
      const width = config.width || 1; 
      const initialX_L = -width / 2;
      const initialX_R = width / 2;
      const initialY = (i + 0.5) * CELL_HEIGHT - GRID_HEIGHT;

      let dbL = (dbLevels[i] !== undefined) ? dbLevels[i] : 0;     // dB SPL: 0..128
      let dbR = (dbLevels[i + 128] !== undefined) ? dbLevels[i + 128] : 0;

      const hasSignal = dbL > 0 || dbR > 0;

      let pL = initialX_L;
      let pR = initialX_R;
      let hL = CELL_HEIGHT;
      let hR = CELL_HEIGHT;

      if (useFrozen) {
        // Заморозка: используем сохранённые значения
        const p = panAngles[i] || 0;
        const shadowDb = Math.abs(p) * (config.shadow_coef || 0) * 128.0;
        let effectiveDbL = dbL;
        let effectiveDbR = dbR;

        if (p < -0.01) effectiveDbR -= shadowDb;
        else if (p > 0.01) effectiveDbL -= shadowDb;

        // ═══ ДИСКРЕТНОЕ смещение по X (ровно в целых ячейках) ═══
        const maxShiftCells = Math.floor((GRID_WIDTH - width) / 2); // целые ячейки
        const panCellsFromCenter = Math.round(p * 64); // -64..+64
        const clampedShift = Math.max(-maxShiftCells, Math.min(maxShiftCells, panCellsFromCenter));
        const discreteShift = clampedShift; // уже в целых ячейках (CELL_SIZE = 1.0)

        pL = initialX_L + Math.min(0, discreteShift);
        pR = initialX_R + Math.max(0, discreteShift);

        // dB SPL: 0 = тишина (1 ячейка), 128 = максимум (128 ячеек)
        hL = Math.max(1, Math.min(128, Math.round(effectiveDbL)));
        hR = Math.max(1, Math.min(128, Math.round(effectiveDbR)));

        scalesL.setX(i, hL);
        scalesR.setX(i, hR);
      } else if (isActive && (!isPaused || hasSignal)) {
        // Pan: WASM выдаёт ячейки 0..128. Конвертируем в [-1, 1].
        const panCells = panAngles[i] || 64; // 64 = центр
        const p = (panCells - 64) / 64.0;    // [-1, 1]
        this._panStates[i] = p;

        const shadowDb = Math.abs(p) * (config.shadow_coef || 0) * 128.0;
        let effectiveDbL = dbL;
        let effectiveDbR = dbR;

        if (p < -0.01) effectiveDbR -= shadowDb;
        else if (p > 0.01) effectiveDbL -= shadowDb;

        // ═══ ДИСКРЕТНОЕ смещение по X (ровно в целых ячейках) ═══
        const maxShiftCells = Math.floor((GRID_WIDTH - width) / 2); // целые ячейки
        const panCellsFromCenter = Math.round(p * 64); // -64..+64
        const clampedShift = Math.max(-maxShiftCells, Math.min(maxShiftCells, panCellsFromCenter));
        const discreteShift = clampedShift; // уже в целых ячейках (CELL_SIZE = 1.0)

        pL = initialX_L + Math.min(0, discreteShift);
        pR = initialX_R + Math.max(0, discreteShift);

        // dB SPL: 0 = тишина, 128 = максимум. Clamp [1, 128].
        hL = Math.max(1, Math.min(128, Math.round(effectiveDbL)));
        hR = Math.max(1, Math.min(128, Math.round(effectiveDbR)));

        scalesL.setX(i, hL);
        scalesR.setX(i, hR);
      } else {
        // В режиме паузы без frozen frame или отсутствия сигнала — демо-режим
        const p = this._panStates[i];
        // ═══ ДИСКРЕТНОЕ смещение по X (ровно в целых ячейках) ═══
        const maxShiftCells = Math.floor((GRID_WIDTH - width) / 2); // целые ячейки
        const panCellsFromCenter = Math.round(p * 64); // -64..+64
        const clampedShift = Math.max(-maxShiftCells, Math.min(maxShiftCells, panCellsFromCenter));
        const discreteShift = clampedShift; // уже в целых ячейках (CELL_SIZE = 1.0)

        pL = initialX_L + Math.min(0, discreteShift);
        pR = initialX_R + Math.max(0, discreteShift);

        // Демо: 1 ячейка глубины, прижаты к дальней стенке
        hL = 1;
        hR = 1;
        scalesL.setX(i, hL);
        scalesR.setX(i, hR);
      }

      // Re-use _dummy to avoid allocations
      // Z-scale: рост вглубь (вдоль белой оси Z).
      // BoxGeometry(1, CELL_HEIGHT, 1).translate(0, 0, 0.5) — центр геометрии в z=0.5.
      // При scale.z=hL столбец занимает z=0..hL, якорь в z=0.
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

    const greetingValue = !isActive ? 1.0 : 0.0;
    this.meshL.material.uniforms.uIsGreeting.value = greetingValue;
    this.meshR.material.uniforms.uIsGreeting.value = greetingValue;
  }

  getHologramPivot() { return this.hologramPivot; }
}
