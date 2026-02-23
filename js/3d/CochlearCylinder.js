/**
 * CochlearCylinder.js — v4.0 "Real Ring"
 * ========================================
 * Морфинг существующих колонок hologramRenderer из плоских сеток в кольцо.
 *
 * Физика кольца (BasilaQ-128 Toroidal):
 *   R_NEAR = 128 units (0 dB, внутренняя грань = вытянутая рука)
 *   R_FAR  = 384 units (−128 dB, внешняя грань = 3× R_NEAR)
 *   HEIGHT = 256 units (высота, ось Y, зелёная)
 *   Внутренний диаметр = 256 units ≈ 2 метра "личного пространства"
 *
 * Что НЕ делаем (пока): изгиб граней Box-геометрии. Колонки остаются BoxGeometry.
 * Что ДЕЛАЕМ: каждая пара (left, right) Group перемещается и поворачивается
 * к центру кольца, чтобы образовать визуальный тор.
 *
 * Используем parent.scale для перевода scene units → три реальных метра.
 * Детали в Semitones_Angles.md и hologramConfig.js.
 */

import * as THREE from 'three';

// ─── Константы кольца (в scene units, GRID_WIDTH = 128) ───────────────────────
const R_NEAR = 128;          // Радиус внутренней грани (= GRID_WIDTH = 1× "метр")
const R_FAR = 384;          // Радиус внешней грани   (= 3× GRID_WIDTH = 3 "метра")
const R_MID = (R_NEAR + R_FAR) / 2; // 256 — центр глубины по Z каждого столбца
const TWO_PI = Math.PI * 2;
const EASE_DURATION = 1500;  // мс — та же скорость, что и боковые панели

/**
 * Easing: cubic in-out
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * @class CochlearCylinder
 *
 * Получает columns (массив { left: THREE.Group, right: THREE.Group }) из HologramRenderer
 * и анимирует их в/из тороидального кольца.
 *
 * Кольцо строится по следующей логике:
 * - 128 семитонов → 128 угловых позиций по кругу (360° / 128 ≈ 2.8125° каждый)
 * - Семитон 0 (C0, самый низкочастотный) → ±0° = ровно ПЕРЕД пользователем
 * - Семитон 64 (E5, deg=90°) → ровно ЗА пользователем (180°)
 * - Left  группа (левое ухо) → отрицательные X в flat → LEFT дуга (0°→-180°)
 * - Right группа (правое ухо) → положительные X в flat → RIGHT дуга (0°→+180°)
 *
 * Когда pair.left и pair.right находятся у одного семитона, они накладываются
 * (one shared Z-position on the ring).
 */
export class CochlearCylinder {
    /**
     * @param {THREE.Group} hologramPivot — корневая группа голограммы
     */
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.columns = [];       // заполняется через setColumns()
        this.isMorphing = false;
        this.isTorusMode = false;

        // Сохранённые плоские позиции для обратного морфинга
        this._flatPositions = [];
        this._flatRotations = [];
        this._flatScales = [];

        // Позиции кольца
        this._torusPositions = [];
        this._torusRotations = [];
    }

    /**
     * Передаём колонки из hologramRenderer.
     * @param {Array<{left: THREE.Group, right: THREE.Group}>} columns
     */
    setColumns(columns) {
        this.columns = columns;
        this._snapshotFlat();
        this._computeTorusTargets();
    }

    /**
     * Запоминаем текущие (flat) позиции/вращения каждого Group.
     * Вызывается один раз при первом morphToTorus.
     */
    _snapshotFlat() {
        this._flatPositions = [];
        this._flatRotations = [];

        this.columns.forEach(pair => {
            this._flatPositions.push({
                left: pair.left.position.clone(),
                right: pair.right.position.clone(),
            });
            this._flatRotations.push({
                left: pair.left.rotation.clone(),
                right: pair.right.rotation.clone(),
            });
        });
    }

    /**
     * Вычисляем целевые позиции и вращения для каждого столбца на кольце.
     *
     * Схема размещения:
     *   Угол θ_i = (i / 128) × 360° — равномерно по 360°.
     *   Семитон i=0 → θ=0 (прямо перед пользователем).
     *   Семитон i=64 → θ=180° (прямо за пользователем).
     *
     *   World position столбца:
     *     x = R_MID × sin(θ)
     *     z = R_MID × cos(θ)    ← z=R_MID при θ=0 (перед пользователем)
     *     y = сохраняем текущий flat Y (позиция по высоте)
     *
     *   Rotation Y: столбец должен смотреть ВНУТРЬ кольца:
     *     rotationY = θ + Math.PI   (= повёрнут фронтальной гранью к центру)
     *
     * ВАЖНО: flat positions в координатах leftSequencerGroup / rightSequencerGroup,
     * но они добавлены в разные Groups. Нужно работать в world space.
     * Поскольку мы не меняем parent, работаем в локальных координатах mainSequencerGroup
     * (который является дочерним hologramPivot). 
     * Для упрощения — переносим все колонки в mainSequencerGroup при морфинге.
     */
    _computeTorusTargets() {
        this._torusPositions = [];
        this._torusRotations = [];

        const n = this.columns.length; // 128

        for (let i = 0; i < n; i++) {
            const pair = this.columns[i];

            // Угол: i=0 прямо перед (θ=0), i=64 прямо за (θ=π)
            const theta = (i / n) * TWO_PI;

            // Позиция центра столбца на кольце (local coords от mainSequencerGroup)
            // Но наши Groups живут внутри leftSequencerGroup/rightSequencerGroup,
            // которые смещены на (0, -GRID_HEIGHT, 0) = (0, -128, 0).
            // Мы работаем с position ВНУТРИ своих parent-групп,
            // поэтому для ring нам нужно добавить колонки в mainSequencerGroup.
            const ringX = R_MID * Math.sin(theta);
            const ringZ = R_MID * Math.cos(theta);  // положительный Z = перед пользователем

            // Y сохраняем из flat (высота по частоте), берём текущий Y из flat
            const flatYL = this._flatPositions[i].left.y;
            const flatYR = this._flatPositions[i].right.y;

            // Поворот: фронтальная грань смотрит внутрь → rotY = theta + π
            const rotY = theta + Math.PI;

            this._torusPositions.push({
                left: new THREE.Vector3(ringX, flatYL, ringZ),
                right: new THREE.Vector3(ringX, flatYR, ringZ),
            });
            this._torusRotations.push({
                left: rotY,
                right: rotY,
            });
        }
    }

    /**
     * Анимация: Flat → Torus.
     * Перемещает все группы из своих sequencer groups в mainSequencerGroup
     * (для единого пространства) и анимирует к позициям Ring.
     *
     * @param {number} duration — мс
     * @param {THREE.Group} leftSequencerGroup  — левая сетка (скрывается gradual)
     * @param {THREE.Group} rightSequencerGroup — правая сетка
     * @returns {Promise<void>}
     */
    morphToTorus(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();
        if (!this.columns.length) {
            console.warn('[CochlearCylinder] setColumns() not called yet.');
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.isMorphing = true;
            this.leftSequencerGroup = leftSequencerGroup;
            this.rightSequencerGroup = rightSequencerGroup;

            // Шаг 1: переносим все pair.left / pair.right в mainSequencerGroup
            // чтобы они жили в общем пространстве для ring-позиционирования
            if (leftSequencerGroup && rightSequencerGroup) {
                this._reparentColumnsToMain(leftSequencerGroup, rightSequencerGroup);
            }

            const startTime = performance.now();

            // Запоминаем start positions (уже в mainSequencerGroup пространстве)
            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(),
                right: pair.right.position.clone(),
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y,
                right: pair.right.rotation.y,
            }));

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];
                    const sp = startPositions[i];
                    const tp = this._torusPositions[i];
                    const sr = startRotatY[i];
                    const tr = this._torusRotations[i];

                    // Interpolate position
                    pair.left.position.lerpVectors(sp.left, tp.left, eased);
                    pair.right.position.lerpVectors(sp.right, tp.right, eased);

                    // Interpolate rotation Y
                    pair.left.rotation.y = THREE.MathUtils.lerp(sr.left, tr.left, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(sr.right, tr.right, eased);
                }

                // Скрываем сетки постепенно (только LineSegments сетки, не колонки)
                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, 1 - eased);
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, 1 - eased);

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTorusMode = true;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder] Ring formed. User is inside the hologram.');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Обратный морфинг: Torus → Flat.
     * @param {number} duration
     * @param {THREE.Group} leftSequencerGroup
     * @param {THREE.Group} rightSequencerGroup
     * @returns {Promise<void>}
     */
    morphToFlat(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;

            const startTime = performance.now();

            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(),
                right: pair.right.position.clone(),
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y,
                right: pair.right.rotation.y,
            }));

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];
                    const sp = startPositions[i];
                    const fp = this._flatPositions[i];
                    const sr = startRotatY[i];

                    pair.left.position.lerpVectors(sp.left, fp.left, eased);
                    pair.right.position.lerpVectors(sp.right, fp.right, eased);
                    pair.left.rotation.y = THREE.MathUtils.lerp(sr.left, 0, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(sr.right, 0, eased);
                }

                // Восстанавливаем видимость сеток
                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, eased);
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, eased);

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Возвращаем колонки в свои родные sequencer groups
                    if (leftSequencerGroup && rightSequencerGroup) {
                        this._reparentColumnsBack(leftSequencerGroup, rightSequencerGroup);
                    }
                    this.isTorusMode = false;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder] Flat mode restored.');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Переносит все pair.left / pair.right в mainSequencerGroup (общее пространство),
     * сохраняя world position.
     */
    _reparentColumnsToMain(leftSG, rightSG) {
        // mainSequencerGroup = parent leftSG / rightSG
        const mainSG = leftSG.parent;
        if (!mainSG) return;

        this.columns.forEach(pair => {
            // LEFT
            if (pair.left.parent !== mainSG) {
                const worldPos = new THREE.Vector3();
                pair.left.getWorldPosition(worldPos);
                mainSG.worldToLocal(worldPos);
                leftSG.remove(pair.left);
                pair.left.position.copy(worldPos);
                pair.left.rotation.y = 0;
                mainSG.add(pair.left);
            }
            // RIGHT
            if (pair.right.parent !== mainSG) {
                const worldPos = new THREE.Vector3();
                pair.right.getWorldPosition(worldPos);
                mainSG.worldToLocal(worldPos);
                rightSG.remove(pair.right);
                pair.right.position.copy(worldPos);
                pair.right.rotation.y = 0;
                mainSG.add(pair.right);
            }
        });
    }

    /**
     * Возвращает колонки обратно в leftSG / rightSG после morph back.
     */
    _reparentColumnsBack(leftSG, rightSG) {
        const mainSG = leftSG.parent;
        if (!mainSG) return;

        this.columns.forEach((pair, i) => {
            const fp = this._flatPositions[i];

            if (pair.left.parent === mainSG) {
                mainSG.remove(pair.left);
                pair.left.position.copy(fp.left);
                pair.left.rotation.y = 0;
                leftSG.add(pair.left);
            }
            if (pair.right.parent === mainSG) {
                mainSG.remove(pair.right);
                pair.right.position.copy(fp.right);
                pair.right.rotation.y = 0;
                rightSG.add(pair.right);
            }
        });
    }

    /**
     * Плавно меняем opacity у LineSegments (сетки) внутри группы.
     * Box-меши колонок не трогаем.
     * @param {THREE.Group} group
     * @param {number} opacity — 0..1
     */
    _fadeGroupLines(group, opacity) {
        group.traverse(child => {
            if (child.isLineSegments && child.material) {
                child.material.opacity = opacity * 0.0017; // базовая opacity сеток
                child.material.transparent = true;
            }
        });
    }
}

export default CochlearCylinder;
