import { state } from '../core/init.js';
import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';
import perfMonitor from '../utils/perfMonitor.js';

const CELL_HEIGHT = 2.0;

// ─── SHADERS: BasilaQ-128 Linear Physics ─────────────────────────────────────
const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;
    void main() {
        vWorldZHeight = (position.z + 0.5) * uColumnScaleZ;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uOpacity;
    uniform float uIsGreeting; 
    uniform float uBrightnessBoost; 
    varying float vWorldZHeight;

    void main() {
        float cellIndex = floor(vWorldZHeight);
        float brightness = clamp(cellIndex / 128.0, 0.0, 1.0);
        brightness = clamp(brightness * uBrightnessBoost, 0.0, 1.0);

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
    console.log('[HologramRenderer] v18.2.0: Binaural Physics & Structural Restoration Active');
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

    this.columns = [];
    this._createSequencerGrids();
    this._initializeColumns();

    this.scene.add(this.hologramPivot);
    this.eventBus.on('audioData', (data) => { this.latestCwtData = data; });
    this.netHoloGlyphClient.connect(this.roomId, this.userId);

    this.selectionState = { left: { active: false, indices: [] }, right: { active: false, indices: [] } };
    this._debugFrameCount = 0;
  }

  _createSequencerGrids() {
    const commonSpinePosition = new THREE.Vector3(0, -GRID_HEIGHT, 0);
    
    this.leftSequencerGroup = new THREE.Group();
    this.leftSequencerGroup.position.copy(commonSpinePosition);
    this.leftSequencerGroup.add(this._createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, 1.0, true));
    
    const leftGridVis = this._createGridVisualization(-GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0x800080);
    this.leftSequencerGroup.add(leftGridVis);
    
    this.mainSequencerGroup.add(this.leftSequencerGroup);

    this.rightSequencerGroup = new THREE.Group();
    this.rightSequencerGroup.position.copy(commonSpinePosition);
    this.rightSequencerGroup.add(this._createAxis(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, 1.0, false));
    
    const rightGridVis = this._createGridVisualization(GRID_WIDTH, GRID_HEIGHT * 2, GRID_DEPTH, CELL_SIZE, 0xFF0000);
    this.rightSequencerGroup.add(rightGridVis);
    
    this.mainSequencerGroup.add(this.rightSequencerGroup);

    // RESTORE SPHERES
    const blueSphere = this._createSphereForAxis(3.024, 0x0000ff);
    blueSphere.position.set(0, -GRID_HEIGHT, 0);
    blueSphere.renderOrder = 0;
    this.mainSequencerGroup.add(blueSphere);

    const whiteSphere = this._createSphereForAxis(2.4192, 0xffffff);
    whiteSphere.position.set(0, -GRID_HEIGHT, 0);
    whiteSphere.renderOrder = 999;
    this.mainSequencerGroup.add(whiteSphere);

    this.hologramPivot.add(this._createCentralMarkerSphere(2.4192, 0xffffff));
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
      vertexShader, fragmentShader, transparent: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(isLeft ? -width/2 : width/2, (index + 0.5) * CELL_HEIGHT, 0);
    mesh.scale.set(1, 1, 0.1);
    
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
      vertexShader, fragmentShader, transparent: false
    });
    mesh.add(new THREE.LineSegments(edgesGeom, edgesMat));

    group.add(mesh);
    group.userData = { initialX: 0, baseColor: baseColor };
    return group;
  }

  updateVisuals() {
    if (state.audio?.isPaused) return; // Замораживаем кадр

    const isActive = (state.audio && (state.audio.isPlaying || state.audio.activeSource === 'microphone'));
    const audioData = this.latestCwtData || state.audio?.latestAudioData;
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
          m.material.uniforms.uColumnScaleZ.value = gDepth;
          // Reset edge uniforms for greeting
          const edges = m.children[0];
          if (edges && edges.material.uniforms) {
              edges.material.uniforms.uIsGreeting.value = 1.0;
              edges.material.uniforms.uColumnScaleZ.value = gDepth;
          }
        });
        pair.left.position.x = 0;  // СТРОГО 0
        pair.right.position.x = 0; // СТРОГО 0
      } else {
        // --- ACTIVE MODE: Psychoacoustic & Cognitive Masking ---
        let dbL = dbLevels[i];
        let dbR = dbLevels[i + 128];
        
        // 1. ИНВЕРСИЯ: Знак минус решает проблему "Side Left звучит справа". 
        // Теперь: targetPan < 0 это Лево (-X), targetPan > 0 это Право (+X).
        const targetPan = -panAngles[i]; 
        
        // Магнитная панорама (минимальное сглаживание для точности Сканера)
        this._panStates[i] += (targetPan - this._panStates[i]) * 0.7;
        const p = this._panStates[i];

        // 2. КОГНИТИВНАЯ МАСКИРОВКА (Психоакустика)
        // Мозг отсекает тихие дублирующие сигналы для фокусировки на источнике.
        // Используем полный динамический диапазон (128 дБ) умноженный на коэффициент дифракции из файла конфигурации.
        const maxCognitiveShadowDb = 128.0; 
        const shadowDb = Math.abs(p) * config.shadow_coef * maxCognitiveShadowDb;

        // Взаимное подавление внимания мозга (Пиг-Понг)
        if (p < -0.01) {
            // Внимание смещено влево. Мозг глушит восприятие в правом ухе.
            dbR -= shadowDb;
        } else if (p > 0.01) {
            // Внимание смещено вправо. Мозг глушит восприятие в левом ухе.
            dbL -= shadowDb;
        }

        // 3. ЭФФЕКТ ПАКМАНА (Коррекция под ширину столбца + 90 градусов)
        // Гарантируем, что столбец никогда не выйдет за пределы своей сетки.
        const w = config.width || 1;
        const maxAvailableShift = (GRID_WIDTH - w) * 0.5; // Сдвиг до середины доступного пространства
        const offset = Math.round(Math.abs(p) * maxAvailableShift);

        pair.left.position.x = pair.left.userData.initialX - (p < 0 ? offset : 0);
        pair.right.position.x = pair.right.userData.initialX + (p > 0 ? offset : 0);

        // 4. СТРОГОЕ КВАНТОВАНИЕ BASILAQ-128 (1 unit = 1 dB)
        [ [leftMesh, dbL], [rightMesh, dbR] ].forEach(([m, db]) => {
          // Ограничиваем дБ от -128 до 0
          const safeDb = Math.max(-128.0, Math.min(0.0, db));
          const h = Math.max(0.1, 128.0 + safeDb);
          
          m.scale.z = h;
          m.position.z = h / 2;
          
          if (m.material.uniforms) {
              m.material.uniforms.uIsGreeting.value = 0.0;
              m.material.uniforms.uColumnScaleZ.value = h;
              m.material.uniforms.uBrightnessBoost.value = 1.0;
          }
          
          // Ребра на 30% ярче
          const edges = m.children[0];
          if (edges && edges.material.uniforms) {
              edges.material.uniforms.uIsGreeting.value = 0.0;
              edges.material.uniforms.uColumnScaleZ.value = h;
              edges.material.uniforms.uBrightnessBoost.value = 1.3;
          }
        });
      }
    });
    this._debugFrameCount++;
  }

  _createCentralMarkerSphere(radius, color) {
    const isTarget = (color === 0xffffff);
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), 
      new THREE.MeshBasicMaterial({ color: isTarget ? 0xffff00 : color, transparent: isTarget, opacity: isTarget ? 0.0 : 1.0, visible: !isTarget }));
  }

  _createSphereForAxis(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: false, opacity: 1.0 }));
  }

  _createLine2ForAxis(points, color, linewidth, depthTest = true) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color, linewidth, depthTest, transparent: !depthTest });
    return new THREE.Line(geometry, material);
  }

  _createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color) {
    const points = [];
    const divisionsX = Math.floor(Math.abs(gridWidth) / cellSize);
    const divisionsY = Math.round(gridHeight / CELL_HEIGHT);
    const divisionsZ = Math.floor(gridDepth / cellSize);
    const signX = Math.sign(gridWidth) || 1;

    for (let i = 0; i <= divisionsY; i++) {
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(0, i * CELL_HEIGHT, j * cellSize, gridWidth, i * CELL_HEIGHT, j * cellSize);
      }
    }
    for (let i = 0; i <= divisionsX; i++) {
      const x = i * cellSize * signX;
      for (let j = 0; j <= divisionsZ; j++) {
        points.push(x, 0, j * cellSize, x, gridHeight, j * cellSize);
      }
    }
    for (let i = 0; i <= divisionsX; i++) {
      const x = i * cellSize * signX;
      for (let j = 0; j <= divisionsY; j++) {
        points.push(x, j * CELL_HEIGHT, 0, x, j * CELL_HEIGHT, gridDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color: color,
      opacity: 0.005, // 3x прозрачнее
      transparent: true,
      depthWrite: false, 
      depthTest: false
    });
    material.needsUpdate = true;
    return new THREE.LineSegments(geometry, material);
  }

  _createAxis(xLength, yLength, zLength, sphereRadiusInput, isLeftGrid) {
    const axisGroup = new THREE.Group();
    const sphereRadius = 2.4192; 
    const origin = [0, 0, 0];
    const xEnd = isLeftGrid ? [-xLength, 0, 0] : [xLength, 0, 0];
    const colorX = isLeftGrid ? 0x800080 : 0xFF0000;

    axisGroup.add(this._createLine2ForAxis([...origin, ...xEnd], colorX, 1.5, true));
    axisGroup.add(this._createSphereForAxis(sphereRadius, colorX).translateX(isLeftGrid ? -xLength : xLength));

    const spineLine = this._createLine2ForAxis([...origin, 0, yLength, 0], 0x00FF00, 1.5, true);
    spineLine.renderOrder = 999; spineLine.material.depthTest = false; 
    axisGroup.add(spineLine);
    axisGroup.add(this._createSphereForAxis(sphereRadius, 0x00FF00).translateY(yLength));

    axisGroup.add(this._createLine2ForAxis([...origin, 0, 0, zLength], 0xFFFFFF, 1.5, true));
    axisGroup.add(this._createSphereForAxis(sphereRadius, 0xFFFFFF).translateZ(zLength));

    axisGroup.position.z = 0.5;
    return axisGroup;
  }

  getHologramPivot() { return this.hologramPivot; }
}
