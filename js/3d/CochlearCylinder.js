/**
 * CochlearCylinder.js v8.0 "Inside-Out Correction"
 * ===============================================
 * 🍩 Исправлена инверсия радиуса: Z=0 теперь внешняя стенка, Z=128 внутренняя.
 * Добавлено пошаговое логирование траектории сфер.
 */

import * as THREE from 'three';

const EASE_DURATION = 1500;
const XR_RADIUS = 1000; // Расстояние от камеры (Z=1000) до фронта (Z=0)

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CochlearCylinder {
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.columns = [];
        this.camera = null;
        this.isMorphing = false;
        this.isTorusMode = false;

        this._vertexMorphData = null;
        this._objectMorphData = null; 
        
        this._debugLogs = { start: false, mid: false, end: false };
    }

    setColumns(columns, camera = null) {
        this.columns = columns;
        if (camera) this.camera = camera;
    }

    _prepareMorphData(group) {
        if (!group) return;
        this.hologramPivot.updateMatrixWorld(true);
        const pivotInverse = this.hologramPivot.matrixWorld.clone().invert();

        group.traverse(child => {
            // ЛОГИКА ДЛЯ СФЕР (Позиция)
            if (child.name === "StaticSphere") {
                if (!this._objectMorphData) this._objectMorphData = [];
                
                const localPos = child.position.clone();
                const worldPos = child.getWorldPosition(new THREE.Vector3());
                const pivotPos = worldPos.applyMatrix4(pivotInverse);

                const theta = (pivotPos.x / 128) * Math.PI;
                // ИСПРАВЛЕНИЕ: r должен уменьшаться при росте Z (отдаление от центра цилиндра)
                // Камера в 1000, Лицо в 0. Значит r = 1000 - pivotZ
                const r = XR_RADIUS - pivotPos.z;
                const camZ = 1000;

                const targetPivotPos = new THREE.Vector3(
                    r * Math.sin(theta),
                    pivotPos.y,
                    camZ - r * Math.cos(theta)
                );

                const parentInverse = child.parent.matrixWorld.clone().invert();
                const targetLocalPos = targetPivotPos.applyMatrix4(this.hologramPivot.matrixWorld).applyMatrix4(parentInverse);

                this._objectMorphData.push({ obj: child, start: localPos, end: targetLocalPos });
                return;
            }

            // ЛОГИКА ДЛЯ МЕШЕЙ/ЛИНИЙ (Геометрия)
            if ((child.isMesh || child.isLine || child.isLineSegments) && child.geometry) {
                const geom = child.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                const morphEntry = {
                    attr: posAttr,
                    flatArr: new Float32Array(posAttr.array),
                    torusArr: new Float32Array(posAttr.array.length)
                };

                const childWorldMatrix = child.matrixWorld;
                const childInverse = childWorldMatrix.clone().invert();
                const localV = new THREE.Vector3();
                const pivotV = new THREE.Vector3();
                const cylPivotV = new THREE.Vector3();
                const camZ = 1000;

                for (let i = 0; i < posAttr.count; i++) {
                    localV.fromBufferAttribute(posAttr, i);
                    pivotV.copy(localV).applyMatrix4(childWorldMatrix).applyMatrix4(pivotInverse);

                    const theta = (pivotV.x / 128) * Math.PI;
                    // ИСПРАВЛЕНИЕ: r = 1000 - Z
                    const r = XR_RADIUS - pivotV.z;

                    cylPivotV.x = r * Math.sin(theta);
                    cylPivotV.y = pivotV.y;
                    cylPivotV.z = camZ - r * Math.cos(theta);

                    const finalV = cylPivotV.applyMatrix4(this.hologramPivot.matrixWorld).applyMatrix4(childInverse);
                    morphEntry.torusArr[i * 3] = finalV.x;
                    morphEntry.torusArr[i * 3 + 1] = finalV.y;
                    morphEntry.torusArr[i * 3 + 2] = finalV.z;
                }
                this._vertexMorphData.push(morphEntry);
            }
        });
    }

    morphToTorus(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();
        this.isMorphing = true;
        this._debugLogs = { start: false, mid: false, end: false };

        if (!this._vertexMorphData) {
            this._vertexMorphData = [];
            this._objectMorphData = [];
            this._prepareMorphData(leftSequencerGroup);
            this._prepareMorphData(rightSequencerGroup);
        }

        const startTime = performance.now();
        const animate = () => {
            const t = Math.min((performance.now() - startTime) / duration, 1);
            const eased = easeInOutCubic(t);

            // 1. Вершины
            for (let data of this._vertexMorphData) {
                const arr = data.attr.array;
                for (let j = 0; j < arr.length; j++) {
                    arr[j] = data.flatArr[j] + (data.torusArr[j] - data.flatArr[j]) * eased;
                }
                data.attr.needsUpdate = true;
            }

            // 2. Объекты (Сферы)
            for (let data of this._objectMorphData) {
                data.obj.position.lerpVectors(data.start, data.end, eased);
            }

            // ЛОГИРОВАНИЕ ТРАЕКТОРИИ
            this._logProgress(t);

            if (t < 1) requestAnimationFrame(animate);
            else { this.isTorusMode = true; this.isMorphing = false; }
        };
        requestAnimationFrame(animate);
        return Promise.resolve();
    }

    morphToFlat(duration = EASE_DURATION) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();
        this.isMorphing = true;
        this._debugLogs = { start: false, mid: false, end: false };

        const startTime = performance.now();
        const animate = () => {
            const t = Math.min((performance.now() - startTime) / duration, 1);
            const eased = easeInOutCubic(t);

            for (let data of this._vertexMorphData) {
                const arr = data.attr.array;
                for (let j = 0; j < arr.length; j++) {
                    arr[j] = data.torusArr[j] + (data.flatArr[j] - data.torusArr[j]) * eased;
                }
                data.attr.needsUpdate = true;
            }

            for (let data of this._objectMorphData) {
                data.obj.position.lerpVectors(data.end, data.start, eased);
            }

            this._logProgress(t, true);

            if (t < 1) requestAnimationFrame(animate);
            else { this.isTorusMode = false; this.isMorphing = false; }
        };
        requestAnimationFrame(animate);
        return Promise.resolve();
    }

    _logProgress(t, reverse = false) {
        let stage = null;
        if (t === 0 && !this._debugLogs.start) stage = "START";
        if (t >= 0.5 && !this._debugLogs.mid) stage = "MID (50%)";
        if (t === 1 && !this._debugLogs.end) stage = "END (100%)";

        if (stage && this._objectMorphData) {
            const mode = reverse ? "Flat" : "XR";
            console.log(`[Trajectory ${mode}] Stage: ${stage}`);
            this._objectMorphData.forEach(data => {
                const wp = new THREE.Vector3();
                data.obj.getWorldPosition(wp);
                const color = data.obj.material.color.getHexString();
                console.log(` - Sphere ${color}: X=${wp.x.toFixed(1)}, Z=${wp.z.toFixed(1)}`);
            });
            if (stage === "START") this._debugLogs.start = true;
            if (stage === "MID (50%)") this._debugLogs.mid = true;
            if (stage === "END (100%)") this._debugLogs.end = true;
        }
    }
}

export class Dummy {} // placeholder for export default
export default CochlearCylinder;
