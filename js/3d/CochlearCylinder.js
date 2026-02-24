/**
 * CochlearCylinder.js v5.0 "User Inside Ring"
 * ====================================================
 * 
 * 🍩 Ключевое изменение: Камера помещается В ЦЕНТР кольца при морфинге.
 * На плоском экране видна только ЧАСТЬ голограммы - она "уходит" за края экрана.
 * 
 * Изменения от v4.1:
 * - Добавлен параметр camera в setColumns()
 * - morphToTorus() теперь перемещает камеру в центр кольца
 * - morphToFlat() возвращает камеру в исходную позицию
 * - Добавлена поддержка FOV для иммерсивного эффекта
 * 
 * @author NeuroCoderZ + AI Assistant
 * @date 2026-02-24
 */

import * as THREE from 'three';
import { GRID_HEIGHT } from '../config/hologramConfig.js';

const EASE_DURATION = 1500;
const RING_RADIUS = 128; // Радиус кольца (256 units diameter)

/**
 * Плавная функция easing для анимации.
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CochlearCylinder {
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.columns = [];

        // Ссылка на камеру
        this.camera = null;
        this._initialCameraPosition = null;
        this._initialCameraFov = null;
        this._initialCameraZoom = null;

        this.isMorphing = false;
        this.isTorusMode = false;

        this._flatPositions = [];
        this._flatRotations = [];
        this._torusPositions = [];
        this._torusRotations = [];

        // Группы для анимации
        this.leftSequencerGroup = null;
        this.rightSequencerGroup = null;
    }

    /**
     * Устанавливает столбцы и камеру для морфинга.
     * 
     * @param {Array} columns - Массив пар столбцов {left, right}
     * @param {THREE.Camera} camera - Камера для помещения внутрь кольца (опционально)
     */
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

        this._snapshotFlat();
        this._computeTorusTargets();
    }

    /**
     * Сохраняет начальные позиции столбцов в плоском режиме.
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
     * Вычисляет целевые позиции столбцов для прямоугольной (цилиндрической) "коробочки".
     * Срез имеет высоту (Y) и глубину (Z) исходной сетки, обёрнутые вокруг пользователя.
     */
    _computeTorusTargets() {
        this._torusPositions = [];
        this._torusRotations = [];

        const n = this.columns.length;
        const radius = RING_RADIUS;

        // Прямоугольный срез: нам нужно сохранить оригинальные координаты Y и Z относительно сетки,
        // но завернуть ось X в окружность вокруг пользователя.
        // Y - высота столбца остается своей.
        // Z - оригинальное положение в глубину.

        const offsetY = -GRID_HEIGHT;

        for (let i = 0; i < n; i++) {
            // Оригинальные локальные координаты столбца на сетке
            const flatPosL = this._flatPositions[i].left.clone();
            const flatPosR = this._flatPositions[i].right.clone();

            const yL = flatPosL.y + offsetY;
            const yR = flatPosR.y + offsetY;

            // Z на оргиниальной плоской сетке определяет, как далеко столбец по оси глубины прямоугольника
            // В плоской конфигурации сетки XXZ: X-частота, Y-высота, Z-время. 
            // Мы "скручиваем" ось Z (время/глубину) или ось X (частоту) вокруг цилиндра.
            // В нашей архитектуре столбцы стоят с i=0 до 127. Это ось частот (изначально ось Z в сетке, так как колонки идут вдаль).
            // То есть индекс `i` линейно мапится на длину окружности (частоты обволакивают пользователя).

            const angle = (i / (n - 1)) * Math.PI;

            // Левая сторона: полуокружность слева
            // Дистанция от центра (пользователя) - это фиксированный радиус `radius`. 
            // Но мы прибавляем/сохраняем оригинальные пропорции прямоугольного среза:
            // Чтобы профиль был прямоугольным, мы просто располагаем их на цилиндре радиусом `radius`,
            // высотой `Y` и глубиной сечения (например, оригинальная позиция X).

            // В этой версии мы физически оставляем Y как есть, а радиус делаем постоянным для всех частот, 
            // создавая идеальный цилиндр (трубу), у которого срез - это прямоугольная стенка (сохраняющая пропорции сеток Y/Z).

            const leftX = -radius * Math.sin(angle);
            const leftZ = -radius * Math.cos(angle);
            const rotYLeft = Math.atan2(-leftX, -leftZ);

            const rightX = radius * Math.sin(angle);
            const rightZ = -radius * Math.cos(angle);
            const rotYRight = Math.atan2(-rightX, -rightZ);

            this._torusPositions.push({
                left: new THREE.Vector3(leftX, yL, leftZ),
                right: new THREE.Vector3(rightX, yR, rightZ),
            });
            this._torusRotations.push({
                left: rotYLeft,
                right: rotYRight,
            });
        }
    }

    /**
     * 🍩 Морфинг плоской голограммы в кольцо с помещением камеры ВНУТРЬ.
     * 
     * @param {number} duration - Длительность анимации в мс
     * @param {THREE.Group} leftSequencerGroup - Группа левой сетки
     * @param {THREE.Group} rightSequencerGroup - Группа правой сетки
     * @returns {Promise}
     */
    morphToTorus(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || this.isTorusMode) return Promise.resolve();
        if (!this.columns.length) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;
            this.leftSequencerGroup = leftSequencerGroup;
            this.rightSequencerGroup = rightSequencerGroup;

            // Перепривязываем столбцы к mainSequencerGroup
            this._reparentColumnsToMain(leftSequencerGroup, rightSequencerGroup);

            const startTime = performance.now();

            // Начальные позиции столбцов
            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(),
                right: pair.right.position.clone()
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y,
                right: pair.right.rotation.y
            }));

            // Начальные параметры камеры
            const startCameraPos = this.camera ? this.camera.position.clone() : new THREE.Vector3(0, 0, 1000);
            const targetCameraPos = new THREE.Vector3(0, 0, 0); // 🎯 Центр кольца!

            // Расчет FOV/Zoom в зависимости от соотношения сторон экрана (Portrait / Landscape)
            let targetFov = 95;  // Base FOV для Landscape
            let targetZoom = 1.0;

            const aspect = window.innerWidth / window.innerHeight;
            if (aspect < 1) {
                // Мобильный / Портретный режим: 
                // Экран узкий, поэтому вертикальный угол обзора (FOV) нужно сильно расширить,
                // чтобы горизонтально голограмма помещалась в кадр "как надо" (эффект присутствия).
                // Для Orthographic зум нужно уменьшать (чтобы отдалить и показать больше широт).
                targetFov = 110;
                targetZoom = 0.5;
            } else {
                targetZoom = Math.max(0.7, 1.0 / aspect); // Адаптация для широких экранов
            }

            // Если мы в XR (2 камеры/экрана), FOV будет контролироваться WebXR

            // Для FOV (если PerspectiveCamera) или Zoom (если Orthographic)
            const startFov = this.camera?.fov || 45;
            const startZoom = this.camera?.zoom || 1;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                // Анимация столбцов
                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];
                    pair.left.position.lerpVectors(startPositions[i].left, this._torusPositions[i].left, eased);
                    pair.right.position.lerpVectors(startPositions[i].right, this._torusPositions[i].right, eased);
                    pair.left.rotation.y = THREE.MathUtils.lerp(startRotatY[i].left, this._torusRotations[i].left, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(startRotatY[i].right, this._torusRotations[i].right, eased);
                }

                // Анимация групп (веерное раскрытие)
                if (leftSequencerGroup) {
                    leftSequencerGroup.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 1.5, eased);
                }
                if (rightSequencerGroup) {
                    rightSequencerGroup.rotation.y = THREE.MathUtils.lerp(0, Math.PI / 1.5, eased);
                }

                // Затухание линий сетки
                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, 1 - (eased * 0.8));
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, 1 - (eased * 0.8));

                // Анимация камеры
                if (this.camera) {
                    this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);

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
                    console.log('[CochlearCylinder v5] 🍩 Ring formed. Camera INSIDE - user is immersed!');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Возврат к плоскому режиму с восстановлением позиции камеры.
     */
    morphToFlat(duration = EASE_DURATION, leftSequencerGroup = null, rightSequencerGroup = null) {
        if (this.isMorphing || !this.isTorusMode) return Promise.resolve();

        return new Promise(resolve => {
            this.isMorphing = true;
            const startTime = performance.now();
            const offsetY = -GRID_HEIGHT;

            const startPositions = this.columns.map(pair => ({
                left: pair.left.position.clone(),
                right: pair.right.position.clone()
            }));
            const startRotatY = this.columns.map(pair => ({
                left: pair.left.rotation.y,
                right: pair.right.rotation.y
            }));

            // Начальные параметры камеры (из центра кольца)
            const startCameraPos = this.camera ? this.camera.position.clone() : new THREE.Vector3(0, 0, 0);
            const targetCameraPos = this._initialCameraPosition
                ? this._initialCameraPosition.clone()
                : new THREE.Vector3(0, 0, 1000);

            // Восстановление FOV/Zoom
            const startFov = this.camera?.fov || 85;
            const targetFov = this._initialCameraFov || 45;
            const startZoom = this.camera?.zoom || 2;
            const targetZoom = this._initialCameraZoom || 1;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(t);

                for (let i = 0; i < this.columns.length; i++) {
                    const pair = this.columns[i];

                    // Восстанавливаем плоские позиции с учётом offsetY
                    const targetLeft = this._flatPositions[i].left.clone();
                    targetLeft.y += offsetY;
                    const targetRight = this._flatPositions[i].right.clone();
                    targetRight.y += offsetY;

                    pair.left.position.lerpVectors(startPositions[i].left, targetLeft, eased);
                    pair.right.position.lerpVectors(startPositions[i].right, targetRight, eased);
                    pair.left.rotation.y = THREE.MathUtils.lerp(startRotatY[i].left, 0, eased);
                    pair.right.rotation.y = THREE.MathUtils.lerp(startRotatY[i].right, 0, eased);
                }

                // Восстанавливаем поворот групп
                if (leftSequencerGroup) {
                    leftSequencerGroup.rotation.y = THREE.MathUtils.lerp(-Math.PI / 1.5, 0, eased);
                }
                if (rightSequencerGroup) {
                    rightSequencerGroup.rotation.y = THREE.MathUtils.lerp(Math.PI / 1.5, 0, eased);
                }

                // Восстанавливаем видимость линий
                if (leftSequencerGroup) this._fadeGroupLines(leftSequencerGroup, 0.2 + (eased * 0.8));
                if (rightSequencerGroup) this._fadeGroupLines(rightSequencerGroup, 0.2 + (eased * 0.8));

                // Восстанавливаем позицию камеры
                if (this.camera) {
                    this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);

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
                    if (leftSequencerGroup && rightSequencerGroup) {
                        this._reparentColumnsBack(leftSequencerGroup, rightSequencerGroup);
                    }
                    this.isTorusMode = false;
                    this.isMorphing = false;
                    console.log('[CochlearCylinder v5] Flat mode restored. Camera back to original position.');
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Перепривязывает столбцы к mainSequencerGroup для анимации в мировых координатах.
     */
    _reparentColumnsToMain(leftSG, rightSG) {
        const mainSG = leftSG?.parent;
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

    /**
     * Возвращает столбцы обратно в их группы после морфинга.
     */
    _reparentColumnsBack(leftSG, rightSG) {
        const mainSG = leftSG?.parent;
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
     * Изменяет прозрачность линий в группе.
     */
    _fadeGroupLines(group, opacity) {
        group.traverse(child => {
            if (child.isLineSegments && child.material) {
                // Базовая прозрачность сетки 0.002
                child.material.opacity = opacity * 0.002;
                child.material.transparent = true;
            }
        });
    }
}

export default CochlearCylinder;
