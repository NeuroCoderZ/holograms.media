/**
 * CochlearCylinder.js v6.0 "Universal Vertex Morpher"
 * ====================================================
 * 
 * 🍩 Ключевое изменение: Истинное цилиндрическое проецирование сеток.
 * Теперь деформируется сама геометрия (вершины сетки и колонок), оборачиваясь 
 * вокруг пользователя (X -> угол, Z -> глубина).
 * 
 * Прямоугольная структура (Y = высота) сохраняется 1 к 1. 
 * Пользователь помещается в центр. Колонки остаются перед ним на Z=0.
 * 
 * @author NeuroCoderZ + AI Assistant
 * @date 2026-02-24
 */

import * as THREE from 'three';

const EASE_DURATION = 1500;
const INNER_RADIUS = 120; // Радиус пустого цилиндра внутри (~2.4 метра диаметр)

/**
 * Плавная функция easing для анимации.
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CochlearCylinder {
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.columns = []; // Для обратной совместимости вызовов

        this.camera = null;
        this._initialCameraPosition = null;
        this._initialCameraFov = null;
        this._initialCameraZoom = null;

        this.isMorphing = false;
        this.isTorusMode = false;

        this.leftSequencerGroup = null;
        this.rightSequencerGroup = null;

        // Кэш вершин для морфинга
        this._vertexMorphData = null;
    }

    setColumns(columns, camera = null) {
        this.columns = columns;

        if (camera) {
            this.camera = camera;
            this._initialCameraPosition = camera.position.clone();
            if (camera.isPerspectiveCamera && camera.fov !== undefined) {
                this._initialCameraFov = camera.fov;
            } else if (camera.isOrthographicCamera && camera.zoom !== undefined) {
                this._initialCameraZoom = camera.zoom;
            }
        }
    }

    /**
     * Захватывает мирные координаты всех вершин в группах и вычисляет их целевые позиции
     * на цилиндрической поверхности. Вызывается один раз перед первым морфингом.
     */
    _prepareMorphData(group) {
        if (!group) return;

        // Обновляем мировую матрицу основного контейнера (hologramPivot)
        this.hologramPivot.updateMatrixWorld(true);
        const pivotInverse = this.hologramPivot.matrixWorld.clone().invert();

        group.traverse(child => {
            if ((child.isMesh || child.isLine || child.isLineSegments) && child.geometry) {
                const geom = child.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                // Создаем независимую геометрию, если она шарится (для безопасности)
                // Но так как у нас каждая колонка = новый BoxGeometry, мы можем просто модифицировать массивы на месте.

                const morphEntry = {
                    attr: posAttr,
                    flatArr: new Float32Array(posAttr.array),
                    torusArr: new Float32Array(posAttr.array.length) // Заполним ниже
                };

                child.updateMatrixWorld(true);
                const childWorldMatrix = child.matrixWorld;
                const childInverse = childWorldMatrix.clone().invert();
                const pivotWorldMatrix = this.hologramPivot.matrixWorld;

                const localV = new THREE.Vector3();
                const worldV = new THREE.Vector3();
                const pivotV = new THREE.Vector3();
                const cylPivotV = new THREE.Vector3();
                const cylWorldV = new THREE.Vector3();
                const cylLocalV = new THREE.Vector3();

                for (let i = 0; i < posAttr.count; i++) {
                    localV.fromBufferAttribute(posAttr, i);

                    // 1. Из локальной в мировую, потом из мировой в "систему координат голограммы"
                    worldV.copy(localV).applyMatrix4(childWorldMatrix);
                    pivotV.copy(worldV).applyMatrix4(pivotInverse);

                    // CYLINDRICAL MAPPING (в масштабе голограммы, независимом от зума сцены)
                    // В плоской раскладке: X идет от -128 до 128 (левая и правая сетка). Z от 0 до 128 (глубина).

                    // Сворачиваем X в угол (128 единиц = PI, то есть полкруга)
                    const theta = (pivotV.x / 128) * Math.PI;

                    // Z задает радиус. Z=0 будет на INNER_RADIUS, Z=128 будет на INNER_RADIUS+128
                    const r = INNER_RADIUS + Math.max(0, pivotV.z); // Math.max для безопасности

                    // Вычисляем новые координаты в "цилиндрическом мире голограммы"
                    // Центр цилиндра - (0, 0, 0). Фронтальная грань (theta=0) должна быть спереди по оси Z.
                    cylPivotV.x = r * Math.sin(theta);
                    cylPivotV.y = pivotV.y;  // Высота не меняется, сохраняем пропорции прямоугольного сечения!
                    cylPivotV.z = -r * Math.cos(theta); // Стык фиолетовой и красной будет прямо перед нами

                    // Возвращаем координаты обратно в локальную систему вершины:
                    // Цилиндр -> Мир -> Локальная для child
                    cylWorldV.copy(cylPivotV).applyMatrix4(pivotWorldMatrix);
                    cylLocalV.copy(cylWorldV).applyMatrix4(childInverse);

                    morphEntry.torusArr[i * 3] = cylLocalV.x;
                    morphEntry.torusArr[i * 3 + 1] = cylLocalV.y;
                    morphEntry.torusArr[i * 3 + 2] = cylLocalV.z;
                }

                this._vertexMorphData.push(morphEntry);
            }
        });
    }

    morphToTorus(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();
        if (!leftSequencerGroup || !rightSequencerGroup) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;
            this.leftSequencerGroup = leftSequencerGroup;
            this.rightSequencerGroup = rightSequencerGroup;

            // Инициализируем данные "Идеального Цилиндрического Морфинга" ровно один раз
            if (!this._vertexMorphData) {
                this._vertexMorphData = [];
                // Это запечет (X,Y,Z) вершин в их текущем, "плоском" состоянии
                this._prepareMorphData(this.leftSequencerGroup);
                this._prepareMorphData(this.rightSequencerGroup);
            }

            const startTime = performance.now();

            // Камера летит прямо в 0, 0, 0 (в центр черного цилиндра)
            const startCameraPos = this.camera ? this.camera.position.clone() : new THREE.Vector3(0, 0, 1000);
            const targetCameraPos = new THREE.Vector3(0, 0, 0);

            // Расчет FOV/Zoom в зависимости от соотношения сторон экрана (Portrait / Landscape)
            let targetFov = 95;  // Base FOV для Landscape
            let targetZoom = 1.0;

            const aspect = window.innerWidth / window.innerHeight;
            if (aspect < 1) {
                targetFov = 110;
                targetZoom = 0.5;
            } else {
                targetZoom = Math.max(0.7, 1.0 / aspect);
            }

            const startFov = this.camera?.fov || 45;
            const startZoom = this.camera?.zoom || 1;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                // ОДНОВРЕМЕННЫЙ МОРФИНГ ВСЕХ ВЕРШИН СЦЕНЫ (СЕТКИ + СТОЛБЦЫ)
                for (let data of this._vertexMorphData) {
                    const arr = data.attr.array;
                    const flatArr = data.flatArr;
                    const torusArr = data.torusArr;
                    for (let j = 0; j < arr.length; j++) {
                        arr[j] = flatArr[j] + (torusArr[j] - flatArr[j]) * eased;
                    }
                    data.attr.needsUpdate = true;
                }

                // Анимация камеры
                if (this.camera) {
                    this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);

                    // Всегда смотрим прямо на "переднюю часть" тора (-Z)
                    this.camera.lookAt(new THREE.Vector3(0, 0, -100));

                    if (this.camera.isPerspectiveCamera && this.camera.fov !== undefined) {
                        this.camera.fov = THREE.MathUtils.lerp(startFov, targetFov, eased);
                        this.camera.updateProjectionMatrix();
                    } else if (this.camera.isOrthographicCamera && this.camera.zoom !== undefined) {
                        this.camera.zoom = THREE.MathUtils.lerp(startZoom, targetZoom, eased);
                        this.camera.updateProjectionMatrix();
                    }
                }

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTorusMode = true;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder v6] 🍩 Cylinder mapping complete. User engulfed.');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    morphToFlat(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;
            const startTime = performance.now();

            const startCameraPos = this.camera ? this.camera.position.clone() : new THREE.Vector3(0, 0, 0);
            const targetCameraPos = this._initialCameraPosition
                ? this._initialCameraPosition.clone()
                : new THREE.Vector3(0, 0, 1000);

            const startFov = this.camera?.fov || 85;
            const targetFov = this._initialCameraFov || 45;
            const startZoom = this.camera?.zoom || 2;
            const targetZoom = this._initialCameraZoom || 1;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                // ОБРАТНЫЙ МОРФИНГ ВСЕХ ВЕРШИН (ВОЗВРАТ К ПЛОСКОЙ ФОРМЕ)
                for (let data of this._vertexMorphData) {
                    const arr = data.attr.array;
                    const flatArr = data.flatArr;
                    const torusArr = data.torusArr;
                    for (let j = 0; j < arr.length; j++) {
                        arr[j] = torusArr[j] + (flatArr[j] - torusArr[j]) * eased; // Reverse lerp
                    }
                    data.attr.needsUpdate = true;
                }

                // Восстанавливаем позицию камеры
                if (this.camera) {
                    this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);

                    // Maintain straight looking forward
                    // When fully back to flat, 1000 looking at 0,0,0 is (0,0,-1)
                    this.camera.lookAt(new THREE.Vector3(0, 0, -100));

                    if (this.camera.isPerspectiveCamera && this.camera.fov !== undefined) {
                        this.camera.fov = THREE.MathUtils.lerp(startFov, targetFov, eased);
                        this.camera.updateProjectionMatrix();
                    } else if (this.camera.isOrthographicCamera && this.camera.zoom !== undefined) {
                        this.camera.zoom = THREE.MathUtils.lerp(startZoom, targetZoom, eased);
                        this.camera.updateProjectionMatrix();
                    }
                }

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTorusMode = false;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder v6] Flat mode restored.');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }
}

export default CochlearCylinder;
