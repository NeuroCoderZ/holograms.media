/**
 * CochlearCylinder.js — v4.1 "Real Ring Fixed Space"
 * ====================================================
 * Морфинг существующих колонок hologramRenderer из плоских сеток в кольцо.
 * 
 * Включает исправления:
 * - Вычисление локальных координат с учетом offsetY = -GRID_HEIGHT
 * - Разворот левой и правой полусфер (разные X-координаты для каналов)
 * - Эффектное "распахивание" красной и фиолетовой осей (left/right SequencerGroups)
 */

import * as THREE from 'three';
import { GRID_HEIGHT } from '../config/hologramConfig.js';

const EASE_DURATION = 1500;

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CochlearCylinder {
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.columns = [];
        this.isMorphing = false;
        this.isTorusMode = false;

        this._flatPositions = [];
        this._flatRotations = [];
        this._torusPositions = [];
        this._torusRotations = [];
    }

    setColumns(columns) {
        this.columns = columns;
        this._snapshotFlat();
        this._computeTorusTargets();
    }

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

    _computeTorusTargets() {
        this._torusPositions = [];
        this._torusRotations = [];

        const n = this.columns.length;
        const radius = 128; // Радиус 1м, диаметр 2м (256 units)
        const offsetY = -GRID_HEIGHT; // Коррекция конфликта координат по Y (-128)

        for (let i = 0; i < n; i++) {
            // Исправляем прыжок: добавляем offsetY, так как теперь объекты в mainSequencerGroup
            const flatYL = this._flatPositions[i].left.y + offsetY;
            const flatYR = this._flatPositions[i].right.y + offsetY;

            // Веерное раскрытие: Басы (i=0) спереди (-Z), Верха (i=127) замыкаются сзади (+Z)
            const angle = (i / (n - 1)) * Math.PI;

            // Левая часть уходит в -X (фиолетовая)
            const leftX = -radius * Math.sin(angle);
            const leftZ = -radius * Math.cos(angle);
            const rotYLeft = Math.atan2(-leftX, -leftZ); // Поворачиваем "лицом" в центр

            // Правая часть уходит в +X (красная)
            const rightX = radius * Math.sin(angle);
            const rightZ = -radius * Math.cos(angle);
            const rotYRight = Math.atan2(-rightX, -rightZ);

            this._torusPositions.push({
                left: new THREE.Vector3(leftX, flatYL, leftZ),
                right: new THREE.Vector3(rightX, flatYR, rightZ),
            });
            this._torusRotations.push({
                left: rotYLeft,
                right: rotYRight,
            });
        }
    }

    morphToTorus(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();
        if (!this.columns.length) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;
            this.leftSequencerGroup = leftSequencerGroup;
            this.rightSequencerGroup = rightSequencerGroup;

            this._reparentColumnsToMain(leftSequencerGroup, rightSequencerGroup);

            const startTime = performance.now();
            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(), right: pair.right.position.clone()
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y, right: pair.right.rotation.y
            }));

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];
                    pair.left.position.lerpVectors(startPositions[i].left, this._torusPositions[i].left, eased);
                    pair.right.position.lerpVectors(startPositions[i].right, this._torusPositions[i].right, eased);
                    pair.left.rotation.y = THREE.MathUtils.lerp(startRotatY[i].left, this._torusRotations[i].left, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(startRotatY[i].right, this._torusRotations[i].right, eased);
                }

                // Разворачиваем оси (фиолетовую и красную) в противоположные стороны
                if (leftSequencerGroup) leftSequencerGroup.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 1.5, eased);
                if (rightSequencerGroup) rightSequencerGroup.rotation.y = THREE.MathUtils.lerp(0, Math.PI / 1.5, eased);

                // Плавно скрываем сетки (opacity сеток 0.002, так что оставляем минимальную видимость или просто фейдим в ноль)
                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, 1 - (eased * 0.8));
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, 1 - (eased * 0.8));

                if (t < 1) requestAnimationFrame(animate);
                else {
                    this.isTorusMode = true;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder] Ring formed. User is inside the hologram.');
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
            const offsetY = -GRID_HEIGHT;

            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(), right: pair.right.position.clone()
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y, right: pair.right.rotation.y
            }));

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];

                    // Безопасно возвращаем координаты с учетом смещения
                    const targetLeft = this._flatPositions[i].left.clone();
                    targetLeft.y += offsetY;
                    const targetRight = this._flatPositions[i].right.clone();
                    targetRight.y += offsetY;

                    pair.left.position.lerpVectors(startPositions[i].left, targetLeft, eased);
                    pair.right.position.lerpVectors(startPositions[i].right, targetRight, eased);
                    pair.left.rotation.y = THREE.MathUtils.lerp(startRotatY[i].left, 0, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(startRotatY[i].right, 0, eased);
                }

                // Сводим оси обратно в плоскость экрана
                if (leftSequencerGroup) leftSequencerGroup.rotation.y = THREE.MathUtils.lerp(-Math.PI / 1.5, 0, eased);
                if (rightSequencerGroup) rightSequencerGroup.rotation.y = THREE.MathUtils.lerp(Math.PI / 1.5, 0, eased);

                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, 0.2 + (eased * 0.8));
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, 0.2 + (eased * 0.8));

                if (t < 1) requestAnimationFrame(animate);
                else {
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

    _reparentColumnsToMain(leftSG, rightSG) {
        const mainSG = leftSG.parent;
        if (!mainSG) return;

        this.columns.forEach(pair => {
            if (pair.left.parent !== mainSG) {
                const worldPos = new THREE.Vector3();
                pair.left.getWorldPosition(worldPos);
                mainSG.worldToLocal(worldPos);
                leftSG.remove(pair.left);
                pair.left.position.copy(worldPos);
                pair.left.rotation.y = 0;
                mainSG.add(pair.left);
            }
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

    _fadeGroupLines(group, opacity) {
        group.traverse(child => {
            if (child.isLineSegments && child.material) {
                // Базовая прозрачность сетки задана в фабрике: 0.002.
                // opacity = (0..1)
                child.material.opacity = opacity * 0.002;
                child.material.transparent = true;
            }
        });
    }
}

export default CochlearCylinder;
