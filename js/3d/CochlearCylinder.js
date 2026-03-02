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
            // Обработка сфер на осях и статических сфер
            if (child.name === "StaticSphere" || child.name === "XAxisSphere" || child.name === "ZAxisSphere" || child.name === "YAxisSphere") {
                if (!this._objectMorphData) this._objectMorphData = [];

                const localPos = child.position.clone();
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                const pivotPos = worldPos.applyMatrix4(pivotInverse);

                // Математика цилиндра (Тор с прямоугольным срезом)
                // X (панорама) -> Theta (угол)
                // Z (глубина) -> R (радиус)

                // ВАЖНО: В 2D Z=0 - это задняя стенка (внешний радиус).
                // Мы хотим, чтобы при Z=0 радиус был XR_RADIUS (1000).
                // При росте столбца (Z увеличивается) он должен идти К ЦЕНТРУ.
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

                // Определяем целевой цвет (для сфер на концах осей X)
                let targetColor = null;
                if (child.name === "XAxisSphere") {
                    targetColor = new THREE.Color(0xFF00FF); // Magenta Junction
                }

                this._objectMorphData.push({
                    obj: child,
                    start: localPos,
                    end: targetLocalPos,
                    startColor: child.material.color.clone(),
                    endColor: targetColor,
                    name: child.name
                });
                return;
            }

            if ((child.isMesh || child.isLine || child.isLineSegments) && child.geometry) {
                const geom = child.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                const morphEntry = {
                    obj: child,
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

                    // Та же логика для вершин:
                    // x -> угол, z -> радиус (инвертированный рост)
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

                // Адаптация ширины столбцов в XR режиме (уширение на внешнем радиусе)
                // Если это активный столбец, мы можем захотеть растянуть его чуть-чуть
                // Но пока оставим геометрию как есть, она сегментирована
            }

            for (let data of this._objectMorphData) {
                data.obj.position.lerpVectors(data.start, data.end, eased);
                if (data.endColor) {
                    data.obj.material.color.lerpColors(data.startColor, data.endColor, eased);
                }
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
                if (data.endColor) {
                    data.obj.material.color.lerpColors(data.endColor, data.startColor, eased);
                }
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
            if (this._objectMorphData) {
                this._objectMorphData.forEach(data => {
                    if (!data.start || !data.end) return; // Safety check
                    const currentPos = new THREE.Vector3().lerpVectors(data.start, data.end, t);
                    const color = data.obj.material.color.getHexString();
                    console.log(` - Sphere ${color}: X=${currentPos.x.toFixed(1)}, Z=${currentPos.z.toFixed(1)}`);
                });
            }
            this._lastLoggedT = roundedT;
        }
    }
}

export default CochlearCylinder;
