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
const XR_RADIUS = 1000; // Радиус 1 метр (расстояние от камеры до голограммы)

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
     * на цилиндрической поверхности вокруг КАМЕРЫ.
     */
    _prepareMorphData(group) {
        if (!group) return;

        this.hologramPivot.updateMatrixWorld(true);
        const pivotInverse = this.hologramPivot.matrixWorld.clone().invert();

        group.traverse(child => {
            if (child.name === "StaticSphere" || child.name === "StaticAxis") {
                return;
            }

            if ((child.isMesh || child.isLine || child.isLineSegments) && child.geometry) {
                const geom = child.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                const morphEntry = {
                    attr: posAttr,
                    flatArr: new Float32Array(posAttr.array),
                    torusArr: new Float32Array(posAttr.array.length)
                };

                child.updateMatrixWorld(true);
                const childWorldMatrix = child.matrixWorld;
                const childInverse = childWorldMatrix.clone().invert();
                
                const localV = new THREE.Vector3();
                const pivotV = new THREE.Vector3();
                const cylPivotV = new THREE.Vector3();
                const cylWorldV = new THREE.Vector3();
                const cylLocalV = new THREE.Vector3();

                // Точка изгиба (центр цилиндра) — это позиция камеры
                // Условно считаем камеру в (0, 0, 1000) в пространстве pivot
                const camZ = 1000;

                for (let i = 0; i < posAttr.count; i++) {
                    localV.fromBufferAttribute(posAttr, i);
                    
                    // Переходим в пространство pivot (где позвоночник в 0,0,0)
                    pivotV.copy(localV).applyMatrix4(childWorldMatrix).applyMatrix4(pivotInverse);

                    // Угол theta: 128 единиц ширины = PI/2 (90 градусов). 256 единиц = PI (180 градусов).
                    // Чтобы сомкнулось за спиной, 128 должно быть PI.
                    const theta = (pivotV.x / 128) * Math.PI;

                    // Радиус — это Z-расстояние ОТ КАМЕРЫ. 
                    // Лицо голограммы (Z=0) находится на расстоянии XR_RADIUS от камеры.
                    // Слои глубины (Z > 0) уходят ДАЛЬШЕ от камеры.
                    const r = XR_RADIUS + pivotV.z;

                    // Вычисляем позицию относительно КАМЕРЫ (camZ)
                    // В плоском виде лицо в Z=0, камера в Z=1000. 
                    // В цилиндре: камера в центре (0,0,0), лицо на r=1000.
                    cylPivotV.x = r * Math.sin(theta);
                    cylPivotV.y = pivotV.y;
                    // Проецируем Z так, чтобы при theta=0 (центр) цилиндр касался Z=0
                    // т.е. положение = camZ - r * cos(theta)
                    cylPivotV.z = camZ - r * Math.cos(theta);

                    // Обратно в локальные координаты
                    cylWorldV.copy(cylPivotV).applyMatrix4(this.hologramPivot.matrixWorld);
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
                    if (this.camera.isPerspectiveCamera) {
                        this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);
                        // Всегда смотрим прямо на "переднюю часть" тора (-Z)
                        this.camera.lookAt(new THREE.Vector3(0, 0, -100));

                        if (this.camera.fov !== undefined) {
                            this.camera.fov = THREE.MathUtils.lerp(startFov, targetFov, eased);
                            this.camera.updateProjectionMatrix();
                        }
                    } else if (this.camera.isOrthographicCamera) {
                        // По строгому требованию пользователя: в Orthographic режиме
                        // камера остается неподвижной снаружи, зум не меняется,
                        // чтобы оси Y и Z сохраняли свои пиксельные длины 1:1, а геометрия не обрезалась.
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
                    if (this.camera.isPerspectiveCamera) {
                        this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);
                        // Maintain straight looking forward
                        // When fully back to flat, 1000 looking at 0,0,0 is (0,0,-1)
                        this.camera.lookAt(new THREE.Vector3(0, 0, -100));

                        if (this.camera.fov !== undefined) {
                            this.camera.fov = THREE.MathUtils.lerp(startFov, targetFov, eased);
                            this.camera.updateProjectionMatrix();
                        }
                    } else if (this.camera.isOrthographicCamera) {
                        // По строгому требованию пользователя: в Orthographic режиме
                        // камера остается неподвижной снаружи, зум не меняется.
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
