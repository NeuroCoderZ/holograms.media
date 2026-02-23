import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';
import perfMonitor from '../utils/perfMonitor.js';
import { CochlearCylinder } from './CochlearCylinder.js';

const CELL_HEIGHT = 2.0;
const NUM_SEMITONES = 128;

// ─── SHADERS: BasilaQ-128 Linear Physics ─────────────────────────────────────
const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;
    void main() {
        // Высота точки над основанием (0.0 - 128.0)
        vWorldZHeight = (position.z + 0.5) * uColumnScaleZ;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uOpacity;
    uniform float uIsGreeting; 
    uniform float uBrightnessBoost; // 1.0 для поверхности, 1.3 для ребер
    varying float vWorldZHeight;

    void main() {
        // Линейное квантование слоев для Сканера
        float cellIndex = floor(vWorldZHeight);
        float brightness = clamp(cellIndex / 128.0, 0.0, 1.0);
        
        // Применяем буст яркости (например, для ребер)
        brightness = clamp(brightness * uBrightnessBoost, 0.0, 1.0);

        // В режиме приветствия яркость всегда максимальна
        if (uIsGreeting > 0.5) {
            brightness = 1.0;
        }

        vec3 color = uBaseColor * brightness;
        color += uSelection * 0.3;
        gl_FragColor = vec4(color, uOpacity);
    }
`;

export class HologramRenderer {
  constructor(scene, roomId, userId) {
    console.log('[HologramRenderer] v18.1.0: BasilaQ-128 Strict 8-bit LUT Active');
    this.scene = scene;
    this.eventBus = eventBus;
    this.netHoloGlyphClient = netHoloGlyphClient;
    this.latestCwtData = null;
    this.latestTimestamp = 0;
    this._lastWasmPerf = 0;
    this._panStates = new Float32Array(128).fill(0);
    this._lastRenderState = null;
    this.roomId = roomId;
    this.userId = userId;

    this.hologramPivot = new THREE.Group();
    this.mainSequencerGroup = new THREE.Group();
    this.hologramPivot.add(this.mainSequencerGroup);

    this.columns = [];
    this.leftSequencerGroup = null;
    this.rightSequencerGroup = null;

    this._createSequencerGrids();
    this._initializeColumns();

    this.isXRMode = false;
    this.scene.add(this.hologramPivot);

    this.eventBus.on('audioData', (data) => { this.latestCwtData = data; });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    this.selectionState = {
      left: { active: false, indices: [] },
      right: { active: false, indices: [] }
    };
    this._debugFrameCount = 0;
  }

  _createSequencerGrids() {
    const commonSpinePosition = new THREE.Vector3(0, -GRID_HEIGHT, 0);
    this.leftSequencerGroup = new THREE.Group();
    this.leftSequencerGroup.position.copy(commonSpinePosition);
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = new THREE.Group();
    this.rightSequencerGroup.position.copy(commonSpinePosition);
    this.mainSequencerGroup.add(this.rightSequencerGroup);
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
      const group = new THREE.Group();
      const width = config.width;
      const baseColor = new THREE.Color(config.color);
  
      const geometry = new THREE.BoxGeometry(width, CELL_HEIGHT, 1.0);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: baseColor },
          uSelection: { value: 0.0 },
          uOpacity: { value: 1.0 },
          uIsGreeting: { value: 1.0 },
          uBrightnessBoost: { value: 1.0 },
          uColumnScaleZ: { value: 0.1 }
        },
        vertexShader,
        fragmentShader,
        transparent: false
      });
  
      const mesh = new THREE.Mesh(geometry, material);
      // Сдвигаем меш на половину его ширины так, чтобы внутренний край был в X=0
      mesh.position.set(isLeft ? -width/2 : width/2, (index + 0.5) * CELL_HEIGHT, 0);
      mesh.scale.set(1, 1, 0.1);
  
      // HIGHLIGHT EDGES (Теперь через ShaderMaterial для послойного затемнения)
      const edgesGeom = new THREE.EdgesGeometry(geometry);
      const edgesMat = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: baseColor.clone().offsetHSL(0, 0, 0.2) },
          uSelection: { value: 0.0 },
          uOpacity: { value: 1.0 },
          uIsGreeting: { value: 1.0 },
          uBrightnessBoost: { value: 1.3 },
          uColumnScaleZ: { value: 0.1 }
        },
        vertexShader,
        fragmentShader,
        transparent: false
      });
      const edges = new THREE.LineSegments(edgesGeom, edgesMat);
      mesh.add(edges);
  
      group.add(mesh);
      // Группа стоит в 0, меш уже сдвинут. initialX = 0.
      group.userData = { initialX: 0, baseColor: baseColor };
      return group;
    }
  updateVisuals() {
    const isPaused = (state.audio && state.audio.isPaused);
    if (isPaused) return; 

    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
    const audioData = this.latestCwtData || (state.audio?.latestAudioData);
    
    const dbLevels = audioData?.levels || new Float32Array(256).fill(-128);
    const panAngles = audioData?.pans || new Float32Array(256).fill(0);

    this.columns.forEach((pair, i) => {
      const config = semitones[i];
      const leftMesh = pair.left.children[0];
      const rightMesh = pair.right.children[0];

            if (!isActive) {
              // --- GREETING MODE ---
              const gDepth = 0.1;
              [leftMesh, rightMesh].forEach(m => {
                m.scale.z = gDepth;
                m.position.z = gDepth / 2;
                m.material.uniforms.uIsGreeting.value = 1.0;
                m.material.uniforms.uBrightnessBoost.value = 1.0;
                m.material.uniforms.uColumnScaleZ.value = gDepth;
      
                // Синхронизация РЕБЕР
                const edges = m.children[0];
                if (edges && edges.material.uniforms) {
                  edges.material.uniforms.uIsGreeting.value = 1.0;
                  edges.material.uniforms.uBrightnessBoost.value = 1.3;
                  edges.material.uniforms.uColumnScaleZ.value = gDepth;
                }
              });
              pair.left.position.x = 0;
              pair.right.position.x = 0;
            } else {
              // --- ACTIVE MODE ---
              const dbL = dbLevels[i];
              const dbR = dbLevels[i + 128];
              const pan = panAngles[i];
      
              // Magnetic Pan
              this._panStates[i] += (pan - this._panStates[i]) * 0.5;
              const p = this._panStates[i];
              const offset = Math.round(p * (GRID_WIDTH - config.width));
      
              pair.left.position.x = pair.left.userData.initialX + (p < 0 ? offset : 0);
              pair.right.position.x = pair.right.userData.initialX + (p > 0 ? offset : 0);
      
              // Z-Scaling
              [ [leftMesh, dbL], [rightMesh, dbR] ].forEach(([m, db]) => {
                const h = Math.max(0.1, 128.0 + db);
                m.scale.z = h;
                m.position.z = h / 2;
      
                // Обновляем униформы меша
                m.material.uniforms.uIsGreeting.value = 0.0;
                m.material.uniforms.uBrightnessBoost.value = 1.0;
                m.material.uniforms.uColumnScaleZ.value = h;
      
                // Обновляем униформы РЕБЕР (они теперь тоже ShaderMaterial)
                const edges = m.children[0];
                if (edges && edges.material.uniforms) {
                  edges.material.uniforms.uIsGreeting.value = 0.0;
                  edges.material.uniforms.uBrightnessBoost.value = 1.3;
                  edges.material.uniforms.uColumnScaleZ.value = h;
                }
              });
            }    });

    this._debugFrameCount++;
  }

  getHologramPivot() { return this.hologramPivot; }
}
