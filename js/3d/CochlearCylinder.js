/**
 * CochlearCylinder.js v11.0 "Clean Room Wrap"
 * ===========================================
 * 🍩 Цилиндрический морфинг вокруг пользователя (Z=1000).
 * Дальняя стенка (Z=0) -> R=1000.
 * Ближняя стенка (Z=128) -> R=872.
 */

import * as THREE from 'three';

const EASE_DURATION = 1500;
const XR_RADIUS = 1000;

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
        this._lastLoggedT = -1;
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
            if (child.name === "StaticSphere") {
                if (!this._objectMorphData) this._objectMorphData = [];
                
                const localPos = child.position.clone();
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                const pivotPos = worldPos.applyMatrix4(pivotInverse);

                // Математика цилиндра
                const theta = (pivotPos.x / 128) * Math.PI;
                const r = XR_RADIUS - pivotPos.z; 
                const camZ = 1000;

                const targetPivotPos = new THREE.Vector3(
                    r * Math.sin(theta),
                    pivotPos.y,
                    camZ - r * Math.cos(theta)
                );

                const parentWorldInverse = child.parent.matrixWorld.clone().invert();
                const targetWorldPos = targetPivotPos.applyMatrix4(this.hologramPivot.matrixWorld);
                const targetLocalPos = targetWorldPos.applyMatrix4(parentWorldInverse);

                this._objectMorphData.push({ 
                    obj: child, 
                    start: localPos, 
                    end: targetLocalPos,
                    pivotStart: pivotPos.clone(),
                    pivotEnd: targetPivotPos.clone(),
                    name: child.name,
                    color: child.material.color.getHexString()
                });
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
        this._lastLoggedT = -1;

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

            for (let data of this._vertexMorphData) {
                const arr = data.attr.array;
                for (let j = 0; j < arr.length; j++) {
                    arr[j] = data.flatArr[j] + (data.torusArr[j] - data.flatArr[j]) * eased;
                }
                data.attr.needsUpdate = true;
            }

            for (let data of this._objectMorphData) {
                data.obj.position.lerpVectors(data.start, data.end, eased);
            }

            this._logTrajectory(t);

            if (t < 1) requestAnimationFrame(animate);
            else { this.isTorusMode = true; this.isMorphing = false; }
        };
        requestAnimationFrame(animate);
        return Promise.resolve();
    }

    morphToFlat(duration = EASE_DURATION) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();
        this.isMorphing = true;
        this._lastLoggedT = -1;

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

            if (t < 1) requestAnimationFrame(animate);
            else { this.isTorusMode = false; this.isMorphing = false; }
        };
        requestAnimationFrame(animate);
        return Promise.resolve();
    }

    _logTrajectory(t) {
        const roundedT = Math.floor(t * 10) / 10;
        if (roundedT > this._lastLoggedT || t === 1) {
            console.log(`[Trajectory] Progress: ${(t * 100).toFixed(0)}%`);
            this._objectMorphData.forEach(data => {
                const currentPivotPos = new THREE.Vector3().lerpVectors(data.pivotStart, data.pivotEnd, t);
                const thetaDeg = (data.pivotEnd.x / 128.0) * 180.0 * t;
                const color = data.obj.material.color.getHexString();
                console.log(` - Sphere ${color}: X=${currentPivotPos.x.toFixed(1)}, Z=${currentPivotPos.z.toFixed(1)}, Ang=${thetaDeg.toFixed(1)}°`);
            });
            this._lastLoggedT = roundedT;
        }
    }
}

export default CochlearCylinder;
