/**
 * hologramGridFactory.js
 * ======================
 * Чистые фабричные функции для создания геометрий сеток, осей и сфер.
 * Не хранят состояния — только принимают параметры и возвращают Three.js объекты.
 */

import * as THREE from 'three';

/** Высота одной ячейки по оси Y (1 dB = 1 unit) */
export const CELL_HEIGHT = 2.0;

/** Opacity сетки (едва видима — только намечает объём) */
const GRID_OPACITY = 0.0021; // Calibration v0.20.399: -5% from 0.0023

/**
 * Невидимая маркерная сфера (для внутреннего позиционирования).
 * Белый цвет → прозрачная (служит target-точкой, не отображается).
 */
export function createCentralMarkerSphere(radius, color) {
    const isTarget = (color === 0xffffff);
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshBasicMaterial({
            color: isTarget ? 0xffff00 : color,
            transparent: isTarget,
            opacity: isTarget ? 0.0 : 1.0,
            visible: !isTarget,
        })
    );
    mesh.name = "StaticSphere";
    return mesh;
}

/** Видимая сфера-маркер конца оси. */
export function createSphereForAxis(radius, color) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: false, opacity: 1.0 })
    );
    mesh.name = "StaticSphere";
    return mesh;
}

/** Линия оси по массиву точек. */
export function createLineForAxis(points, color, linewidth, depthTest = true) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
        color, linewidth, depthTest, transparent: !depthTest,
    });
    const line = new THREE.Line(geometry, material);
    line.name = "StaticAxis";
    return line;
}

/**
 * 3D сетка ячеек (LineSegments).
 * gridWidth < 0 → левая сетка (уходит в отрицательный X).
 */
export function createGridVisualization(gridWidth, gridHeight, gridDepth, cellSize, color) {
    const points = [];
    const divisionsX = Math.floor(Math.abs(gridWidth) / cellSize);
    const divisionsY = Math.round(gridHeight / CELL_HEIGHT);
    const divisionsZ = Math.floor(gridDepth / cellSize);
    const signX = Math.sign(gridWidth) || 1;

    // Горизонтальные XZ-линии (фасад и профиль)
    const stepsX = Math.max(1, Math.floor(Math.abs(gridWidth) / 4));
    for (let i = 0; i <= divisionsY; i++) {
        for (let j = 0; j <= divisionsZ; j++) {
            for (let s = 0; s < stepsX; s++) {
                const x0 = (s / stepsX) * gridWidth;
                const x1 = ((s + 1) / stepsX) * gridWidth;
                points.push(x0, i * CELL_HEIGHT, j * cellSize,
                    x1, i * CELL_HEIGHT, j * cellSize);
            }
        }
    }
    // Вертикальные XY-линии
    for (let i = 0; i <= divisionsX; i++) {
        const x = i * cellSize * signX;
        for (let j = 0; j <= divisionsZ; j++) {
            points.push(x, 0, j * cellSize, x, gridHeight, j * cellSize);
        }
    }
    // Горизонтальные XY-линии (пол и потолок)
    for (let i = 0; i <= divisionsX; i++) {
        const x = i * cellSize * signX;
        for (let j = 0; j <= divisionsY; j++) {
            points.push(x, j * CELL_HEIGHT, 0, x, j * CELL_HEIGHT, gridDepth);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({
        color,
        opacity: GRID_OPACITY,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });
    material.needsUpdate = true;

    return new THREE.LineSegments(geometry, material);
}

/**
 * Группа трёх осей (X, Y, Z) с цветными сферами на концах.
 *
 * @param {number}  xLength — длина оси X
 * @param {number}  yLength — длина оси Y (позвоночник)
 * @param {number}  zLength — длина оси Z
 * @param {boolean} isLeftGrid — левая сетка (ось X уходит в −X, цвет фиолетовый)
 */
export function createAxis(xLength, yLength, zLength, isLeftGrid) {
    const group = new THREE.Group();
    const sphereRadius = 2.4192;
    const origin = [0, 0, 0];
    const colorX = isLeftGrid ? 0xBF00FF : 0xFF0000;

    // Ось X (сегментированная для морфинга в дугу)
    const xPoints = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * xLength * (isLeftGrid ? -1 : 1);
        xPoints.push(x, 0, 0);
    }
    const xAxis = createLineForAxis(xPoints, colorX, 1.5, true);
    xAxis.name = "XAxis"; // Присваиваем имя для идентификации при морфинге
    group.add(xAxis);

    const xSphere = createSphereForAxis(sphereRadius, colorX);
    xSphere.position.set(isLeftGrid ? -xLength : xLength, 0, 0);
    xSphere.name = "XAxisSphere";
    group.add(xSphere);

    // Ось Y (позвоночник — зелёная, от -yLength/2 до +yLength/2)
    const yStart = -yLength / 2;
    const yEnd = yLength / 2;
    const spineLine = createLineForAxis([0, yStart, 0, 0, yEnd, 0], 0x00FF00, 1.5, true);
    spineLine.name = "YAxis";
    group.add(spineLine);

    const ySphere = createSphereForAxis(sphereRadius, 0x00FF00);
    ySphere.position.set(0, yEnd, 0);
    ySphere.name = "YAxisSphere";
    group.add(ySphere);

    // Ось Z (белая, от 0 до zLength)
    const zAxisLength = 128;
    const zLine = createLineForAxis([0, 0, 0, 0, 0, zAxisLength], 0xFFFFFF, 1.5, true);
    zLine.name = "ZAxis";
    group.add(zLine);

    const zSphere = createSphereForAxis(sphereRadius, 0xFFFFFF);
    zSphere.position.set(0, 0, zAxisLength);
    zSphere.name = "ZAxisSphere";
    group.add(zSphere);

    // Центр группы = (0, 0, 0) — пересечение всех осей
    group.position.set(0, 0, 0);
    return group;
}
