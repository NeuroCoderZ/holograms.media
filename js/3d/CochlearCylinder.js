/**
 * CochlearCylinder.js — Cochlear Cylinder 3.44
 * =============================================
 * Тороидальная визуализация голограммы для Android XR.
 * 
 * Физические константы:
 *   - R_NEAR = 1.0 м (0 dB, внутренняя грань)
 *   - R_FAR  = 3.4 м (-128 dB, внешняя грань, True Black)
 *   - HEIGHT = 3.4 м (вертикальная протяжённость)
 *   - 3.44 = 1/100 скорости звука (344 м/с)
 *
 * Геометрия:
 *   128 прямоугольных параллелепипедов (semitones) распределены по 360°.
 *   Ближняя (R_NEAR) и дальняя (R_FAR) Z-грани деформируются
 *   в дуги для идеальной стыковки в кольцо.
 *   Боковые грани остаются плоскими.
 *
 * Режимы:
 *   - WebXR-native: активируется внутри XR-сессии
 *   - Fallback:     тороидальный морфинг в обычном браузерном 3D
 */

import * as THREE from 'three';
import { CELL_SIZE, GRID_DEPTH, GRID_HEIGHT, GRID_WIDTH, semitones } from '../config/hologramConfig.js';

// ====================== CONSTANTS ======================
const R_NEAR = 1.0;              // 0 dB — внутренний радиус (м)
const R_FAR = 3.4;              // -128 dB — внешний радиус (м)
const CYLINDER_H = 3.4;             // Высота кольца (м)
const NUM_SEMITONES = 128;
const TWO_PI = Math.PI * 2;
const ARC_SEGMENTS = 4;             // Кол-во сегментов дуги на Z-грань

// Perceptual mapping constants (aligned with hologramRenderer.js)
const NOISE_FLOOR_DB = -70.0;
const CEILING_DB = 0.0;
const PERCEPTUAL_GAMMA = 2.5;
const BRIGHTNESS_GAMMA = 3.0;

/**
 * Создаёт деформированный параллелепипед с дугообразными Z-гранями.
 *
 * Исходная BoxGeometry (width × height × depth) модифицируется:
 *   - Ближняя грань (z < 0) изогнута по дуге R_NEAR
 *   - Дальняя грань  (z > 0) изогнута по дуге R_FAR
 *   - Боковые грани остаются плоскими
 *
 * @param {number} arcAngle  — угол дуги столбца (radiants)
 * @param {number} centerAngle — центральный угол столбца (radiants)
 * @param {number} height   — высота столбца (Y-axis)
 * @param {number} widthU   — ширина в Unit-пространстве (для scale)
 * @returns {THREE.BufferGeometry}
 */
function createCurvedBoxGeometry(arcAngle, centerAngle, height, widthU) {
    // Базовая геометрия с делениями по Z для кривизны
    const geo = new THREE.BoxGeometry(
        widthU,           // X — ширина столбца
        height,           // Y — высота (частотная ось)
        R_FAR - R_NEAR,   // Z — глубина (dB → радиус)
        1,                // widthSegments
        1,                // heightSegments
        ARC_SEGMENTS      // depthSegments — для плавной дуги
    );

    const pos = geo.attributes.position;
    const halfDepth = (R_FAR - R_NEAR) / 2;

    // Деформация: каждая вершина двигается на свою дугу
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Нормализованный z: 0 (ближняя грань) → 1 (дальняя грань)
        const t = (z + halfDepth) / (R_FAR - R_NEAR);
        const radius = R_NEAR + t * (R_FAR - R_NEAR);

        // Нормализованный x: -0.5 → +0.5 → угол вдоль дуги
        const normalizedX = x / widthU;  // -0.5 .. +0.5
        const theta = centerAngle + normalizedX * arcAngle;

        // Конвертируем (theta, radius) в декартовы координаты
        const newX = radius * Math.sin(theta);
        const newZ = radius * Math.cos(theta);

        pos.setXYZ(i, newX, y, newZ);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

/**
 * @class CochlearCylinder
 *
 * Управляет тороидальной визуализацией 128 семитонов.
 * Каждый столбец — деформированный параллелепипед с дугообразными Z-гранями.
 */
export class CochlearCylinder {
    /**
     * @param {THREE.Group} parentGroup — группа, к которой добавляется цилиндр
     * @param {Array} semitonesConfig — массив конфигураций семитонов
     */
    constructor(parentGroup, semitonesConfig) {
        this.parentGroup = parentGroup;
        this.semitonesConfig = semitonesConfig || semitones;
        this.torusGroup = new THREE.Group();
        this.torusGroup.visible = false;
        this.parentGroup.add(this.torusGroup);

        /** @type {Array<{mesh: THREE.Mesh, edges: THREE.LineSegments, semitone: Object}>} */
        this.columns = [];

        /** Morphing state: 0 = flat, 1 = torus */
        this.morphProgress = 0;
        this.isMorphing = false;
        this.isTorusMode = false;

        // Pre-build torus columns
        this._buildTorusColumns();
    }

    /**
     * Строит 128 деформированных параллелепипедов по кольцу.
     */
    _buildTorusColumns() {
        const totalWidth = this.semitonesConfig.reduce((s, st) => s + st.width, 0);

        // Рассчитываем угол для каждого столбца пропорционально его ширине
        let currentAngle = 0;

        for (let i = 0; i < NUM_SEMITONES; i++) {
            const st = this.semitonesConfig[i];
            const widthRatio = st.width / totalWidth;
            const arcAngle = widthRatio * TWO_PI;
            const centerAngle = currentAngle + arcAngle / 2;

            // Высота столбца в тороидальном пространстве
            const columnHeight = CYLINDER_H / NUM_SEMITONES;
            const yPos = (i / NUM_SEMITONES - 0.5) * CYLINDER_H + columnHeight / 2;

            // Создаём деформированную геометрию
            const geo = createCurvedBoxGeometry(arcAngle, centerAngle, columnHeight, st.width);

            // SPATIAL BRIGHTNESS PHYSICS:
            // Using MeshBasicMaterial for pure vertex color control
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                vertexColors: true,
                transparent: false,
                opacity: 1.0
            });

            // Add color attribute to geometry for per-frame updates
            const vCount = geo.attributes.position.count;
            geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(vCount * 3), 3));

            const mesh = new THREE.Mesh(geo, material);
            mesh.position.y = yPos;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Рёбра (contrast edges)
            const edgesGeo = new THREE.EdgesGeometry(geo);
            const edgeColor = new THREE.Color(st.color).offsetHSL(0, 0, 0.4);
            const edgesMat = new THREE.LineBasicMaterial({
                color: edgeColor,
                transparent: true,
                opacity: 0.9,
                linewidth: 1,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -2.0,
                polygonOffsetUnits: -2.0
            });
            const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
            mesh.add(edgesMesh);

            this.torusGroup.add(mesh);

            this.columns.push({
                mesh: mesh,
                edges: edgesMesh,
                semitone: st,
                baseColor: color.clone(),
                arcAngle: arcAngle,
                centerAngle: centerAngle
            });

            currentAngle += arcAngle;
        }
    }

    /**
     * Анимация морфинга: Flat → Torus.
     * Два grid'а разлетаются и смыкаются за спиной пользователя (360°).
     *
     * @param {number} duration — длительность анимации (мс)
     * @param {THREE.Group} leftGrid  — левый sequencer grid (для скрытия)
     * @param {THREE.Group} rightGrid — правый sequencer grid (для скрытия)
     * @returns {Promise} — резолвится по завершении анимации
     */
    morphToTorus(duration = 1500, leftGrid = null, rightGrid = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();

        return new Promise((resolve) => {
            this.isMorphing = true;
            this.torusGroup.visible = true;
            this.morphProgress = 0;

            const startTime = performance.now();

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                // Ease-in-out cubic
                const eased = t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;

                this.morphProgress = eased;

                // Scale torus group opacity/visibility
                this.torusGroup.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.opacity = eased;
                    }
                });

                // Fade out flat grids
                if (leftGrid) leftGrid.traverse((child) => {
                    if (child.isMesh && child.material) child.material.opacity = 1 - eased;
                });
                if (rightGrid) rightGrid.traverse((child) => {
                    if (child.isMesh && child.material) child.material.opacity = 1 - eased;
                });

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Морфинг завершён
                    if (leftGrid) leftGrid.visible = false;
                    if (rightGrid) rightGrid.visible = false;
                    this.isTorusMode = true;
                    this.isMorphing = false;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Обратный морфинг: Torus → Flat.
     *
     * @param {number} duration — длительность анимации (мс)
     * @param {THREE.Group} leftGrid
     * @param {THREE.Group} rightGrid
     * @returns {Promise}
     */
    morphToFlat(duration = 1500, leftGrid = null, rightGrid = null) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();

        return new Promise((resolve) => {
            this.isMorphing = true;

            if (leftGrid) leftGrid.visible = true;
            if (rightGrid) rightGrid.visible = true;

            const startTime = performance.now();

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;

                this.morphProgress = 1 - eased;

                // Fade in flat grids
                if (leftGrid) leftGrid.traverse((child) => {
                    if (child.isMesh && child.material) child.material.opacity = eased;
                });
                if (rightGrid) rightGrid.traverse((child) => {
                    if (child.isMesh && child.material) child.material.opacity = eased;
                });

                // Fade out torus
                this.torusGroup.traverse((child) => {
                    if (child.isMesh && child.material) child.material.opacity = 1 - eased;
                });

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.torusGroup.visible = false;
                    this.isTorusMode = false;
                    this.isMorphing = false;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Обновление визуализации в тороидальном режиме.
     * Логика аналогична hologramRenderer.updateVisuals(), но в кольцевой геометрии.
     *
     * Физика:
     *   - dB → радиальная глубина (scale Z деформированного столбца)
     *   - 0 dB → R_NEAR (яркий цвет)
     *   - -128 dB → R_FAR (True Black)
     *   - Brightness = Stevens' Power Law gamma correction
     *
     * @param {Float32Array} dbLevels — 256 значений dB (-128..0)
     * @param {Float32Array} panAngles — 256 значений pan (-1..+1)
     */
    updateVisuals(dbLevels, panAngles) {
        if (!this.isTorusMode || this.isMorphing) return;
        if (!dbLevels || !panAngles) return;

        const hslTemp = { h: 0, s: 0, l: 0 };

        for (let i = 0; i < NUM_SEMITONES; i++) {
            const col = this.columns[i];
            if (!col) continue;

            const dbL = dbLevels[i] !== undefined ? dbLevels[i] : -128;
            const dbR = dbLevels[i + NUM_SEMITONES] !== undefined ? dbLevels[i + NUM_SEMITONES] : -128;

            // Среднее dB для тороидального столбца (L+R сливаются в кольце)
            const dbAvg = Math.max(dbL, dbR);

            // Perceptual mapping (aligned with hologramRenderer.js)
            let length = 0.01;
            let brightness = 0.0;

            if (dbAvg >= NOISE_FLOOR_DB) {
                const range = CEILING_DB - NOISE_FLOOR_DB;
                const linearNorm = (dbAvg - NOISE_FLOOR_DB) / range;
                const perceptualNorm = Math.pow(linearNorm, PERCEPTUAL_GAMMA);
                length = perceptualNorm * (R_FAR - R_NEAR);
                brightness = Math.pow(perceptualNorm, BRIGHTNESS_GAMMA);
            }

            // R_FAR is the "base" wall (outside), R_NEAR is the "tip" direction (inside)
            // But since columns grow from R_FAR towards R_NEAR...
            // wait, scaleZ=1 means it reaches R_NEAR.
            // Vertices at R_FAR are at t=1 in createCurvedBoxGeometry.
            // Vertices at R_NEAR are at t=0.
            // So Distance_from_base = (1 - t) * L_cells.

            const vCols = col.mesh.geometry.attributes.color.array;
            const vPos = col.mesh.geometry.attributes.position.array;
            const baseC = col.baseColor;

            // Re-calculate hL (length in cells, max 128)
            const hL = scaleZ * 128.0;

            const halfD = (R_FAR - R_NEAR) / 2;
            const span = (R_FAR - R_NEAR);

            for (let j = 0; j < vPos.length / 3; j++) {
                // We need the original local Z before deformation to find 't'
                // In createCurvedBoxGeometry, radius = R_NEAR + t * span
                // Actually, BoxGeometry vertices are still in local space before scaling?
                // No, we already deformed the geometry. 
                // We can't easily find 't' from newX, newZ without Math.atan2/sqrt.
                // BUT, the 'pos' attribute WE deformed can store the 't' in a custom attribute!
                // To keep it simple for now, I'll just use world sqrt if necessary, 
                // or better: I'll add 'ca' (cell_alpha) attribute during build.
            }
            // Optimization: I see CochlearCylinder is complex. I'll just use a simpler 
            // version for now: since it's a ring, let's assume zLocal comes from radius.
            const meshPos = col.mesh.position;
            for (let j = 0; j < vPos.length / 3; j++) {
                const vx = vPos[j * 3];
                const vz = vPos[j * 3 + 2];
                const r = Math.sqrt(vx * vx + vz * vz);
                // r is in [R_NEAR, R_FAR]
                // distance from outer wall (R_FAR) = R_FAR - r
                // normalized distance = (R_FAR - r) / (R_FAR - R_NEAR)
                const distNorm = Math.max(0, (R_FAR - r) / span);
                const bright = (distNorm * hL + 1) / 128.0;

                vCols[j * 3] = baseC.r * bright;
                vCols[j * 3 + 1] = baseC.g * bright;
                vCols[j * 3 + 2] = baseC.b * bright;
            }
            col.mesh.geometry.attributes.color.needsUpdate = true;

            // Edge visibility
            if (col.edges && col.edges.material) {
                col.edges.material.opacity = brightness > 0.001 ? 0.9 : 0.0;
                col.edges.material.color.copy(col.baseColor).offsetHSL(0, 0, 0.2);
            }
        }
    }

    /**
     * Q-factor Dome: Pinch → один семитон, drag → октавный купол.
     * Гауссово затухание на ±6 семитонов (Q=1).
     *
     * @param {number} centerIndex — индекс основного семитона (0-127)
     * @param {number} deltaDb — изменение dB
     */
    applyQFactorDome(centerIndex, deltaDb) {
        const Q_RANGE = 6; // ±6 семитонов = 1 октава
        const sigma = Q_RANGE / 2;

        for (let i = Math.max(0, centerIndex - Q_RANGE); i <= Math.min(127, centerIndex + Q_RANGE); i++) {
            const dist = Math.abs(i - centerIndex);
            const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
            const col = this.columns[i];
            if (col && col.mesh) {
                // Применяем взвешенное dB-изменение
                const currentScale = col.mesh.scale.z;
                const dbEffect = deltaDb * weight;
                const normalizedEffect = dbEffect / 128; // Нормализация
                col.mesh.scale.z = Math.max(0.01, currentScale + normalizedEffect);
            }
        }
    }

    /**
     * Очистка ресурсов.
     */
    dispose() {
        this.columns.forEach(col => {
            if (col.mesh) {
                col.mesh.geometry.dispose();
                col.mesh.material.dispose();
            }
            if (col.edges) {
                col.edges.geometry.dispose();
                col.edges.material.dispose();
            }
        });
        this.columns = [];
        if (this.torusGroup.parent) {
            this.torusGroup.parent.remove(this.torusGroup);
        }
    }
}

/**
 * Cochlear Cylinder 3.44 - High-fidelity toroidal audio visualization.
 * Maps frequency (Z-depth) and pan (rotation) to a curved cylindrical geometry.
 */
export default CochlearCylinder;
