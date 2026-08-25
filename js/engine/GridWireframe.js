/**
 * GridWireframe.js — сетки, оси, синяя точка
 * =============================================
 * Фиолетовая сетка (L: 128x128 ячеек), красная сетка (R: 128x128 ячеек)
 * Прозрачность линий сеток: 99.95% (альфа 0.0005)
 * Оси X/Y/Z с яркими цветными линиями (альфа 1.0)
 * Синяя точка на пересечении осей (альфа 1.0)
 */

import { GRID_WIDTH, GRID_HEIGHT } from '../config/hologramConstants.js';

export class GridWireframe {
    constructor(device, shaderModule, bindGroupLayout) {
        this.device = device;
        this.pointCount = 0;

        const { vertices, colors } = this._buildGridAndAxes();
        this.pointCount = vertices.length / 3;

        this.vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

        this.colorBuffer = device.createBuffer({
            size: colors.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.colorBuffer, 0, colors);

        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: shaderModule,
                entryPoint: 'gridVertex',
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                    },
                    {
                        arrayStride: 16,
                        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }],
                    }
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'gridFragment',
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    },
                }],
            },
            primitive: {
                topology: 'line-list',
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: false, // Полупрозрачные линии не блокируют буфер глубины
                depthCompare: 'less-equal',
            }
        });
    }

    _buildGridAndAxes() {
        const vertices = [];
        const colors = [];

        const addLine = (p1, p2, colorRGBA) => {
            vertices.push(...p1, ...p2);
            colors.push(...colorRGBA, ...colorRGBA);
        };

        const Z_BASE = 75; // Протокол 1 Метр
        const GRID_WIDTH = 128;
        const GRID_HEIGHT = 256; // 128 полутонов * шаг Y (2.0)
        const GRID_DEPTH = 128;

        // Линии сеток: 2026-08-25 (юзер) — сетки должны быть ЯВНО видны.
        // Было alpha = 0.15 (едва заметные), стало 0.6.
        const GRID_ALPHA = 0.6;
        const purpleGrid = [0.749, 0.0, 1.0, GRID_ALPHA]; // Левая сетка (Фиолетовая, X < 0)
        const redGrid = [1.0, 0.0, 0.0, GRID_ALPHA];      // Правая сетка (Красная, X > 0)

        // Оси и ключевые маркеры: 100% непрозрачные (alpha = 1.0)
        const redAxis = [1.0, 0.0, 0.0, 1.0];
        const purpleAxis = [0.749, 0.0, 1.0, 1.0];
        const greenAxis = [0.0, 1.0, 0.0, 1.0];
        const whiteAxis = [1.0, 1.0, 1.0, 1.0];
        const blueSphere = [0.0, 0.4, 1.0, 1.0];

        // 1. Оси из точки (0, 0, Z_BASE)
        addLine([0, 0, Z_BASE], [-GRID_WIDTH, 0, Z_BASE], purpleAxis);     // Слева X- (Фиолетовая)
        addLine([0, 0, Z_BASE], [GRID_WIDTH, 0, Z_BASE], redAxis);         // Справа X+ (Красная)
        addLine([0, 0, Z_BASE], [0, GRID_HEIGHT, Z_BASE], greenAxis);      // Сверху Y+ (Зеленая)
        addLine([0, 0, Z_BASE], [0, 0, Z_BASE + GRID_DEPTH], whiteAxis);   // Вглубь Z+ (Белая)

        // 2. Левая сетка (Фиолетовая слева, X: 0 -> -128, Y: 0 -> 256)
        // 128 ячеек по вертикали (шаг 2.0 = 128 линий)
        for (let y = 0; y <= GRID_HEIGHT; y += 2) {
            addLine([0, y, Z_BASE], [-GRID_WIDTH, y, Z_BASE], purpleGrid);
        }
        // 128 ячеек по горизонтали (шаг 1.0 = 128 линий)
        for (let x = 0; x >= -GRID_WIDTH; x -= 1) {
            addLine([x, 0, Z_BASE], [x, GRID_HEIGHT, Z_BASE], purpleGrid);
        }

        // 3. Правая сетка (Красная справа, X: 0 -> +128, Y: 0 -> 256)
        // 128 ячеек по вертикали (шаг 2.0 = 128 линий)
        for (let y = 0; y <= GRID_HEIGHT; y += 2) {
            addLine([0, y, Z_BASE], [GRID_WIDTH, y, Z_BASE], redGrid);
        }
        // 128 ячеек по горизонтали (шаг 1.0 = 128 линий)
        for (let x = 0; x <= GRID_WIDTH; x += 1) {
            addLine([x, 0, Z_BASE], [x, GRID_HEIGHT, Z_BASE], redGrid);
        }

        // 4. Синяя точка (сфера на пересечении осей)
        const sphereR = 3;
        for (let i = 0; i < 16; i++) {
            const a1 = (i / 16) * Math.PI * 2;
            const a2 = ((i + 1) / 16) * Math.PI * 2;
            addLine(
                [Math.cos(a1) * sphereR, Math.sin(a1) * sphereR + 0, Z_BASE],
                [Math.cos(a2) * sphereR, Math.sin(a2) * sphereR + 0, Z_BASE],
                blueSphere
            );
        }

        return {
            vertices: new Float32Array(vertices),
            colors: new Float32Array(colors),
        };
    }

    draw(pass) {
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.colorBuffer);
        pass.draw(this.pointCount);
    }
}
