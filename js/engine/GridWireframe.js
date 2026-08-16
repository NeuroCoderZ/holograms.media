/**
 * GridWireframe.js — сетки, оси, синяя точка
 * =============================================
 * Фиолетовая сетка (L), красная сетка (R)
 * Оси X/Y/Z с цветными линиями
 * Синяя точка на пересечении осей
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
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
                    }
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'gridFragment',
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
            },
            primitive: {
                topology: 'line-list',
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            }
        });
    }

    _buildGridAndAxes() {
        const vertices = [];
        const colors = [];

        const addLine = (p1, p2, color) => {
            vertices.push(...p1, ...p2);
            colors.push(...color, ...color);
        };

        const Z_BASE = 75; // Протокол 1 Метр
        const GRID_WIDTH = 128;
        const GRID_HEIGHT = 256; // 128 * STEP_Y (2.0)
        const GRID_DEPTH = 128;

        const purple = [0.749, 0.0, 1.0]; // Левая сетка (0xBF00FF)
        const red = [1.0, 0.0, 0.0];      // Правая сетка (0xFF0000)

        // 1. Оси из точки (0, 0, Z_BASE)
        addLine([0, 0, Z_BASE], [GRID_WIDTH, 0, Z_BASE], red);         // X+ (Красная)
        addLine([0, 0, Z_BASE], [-GRID_WIDTH, 0, Z_BASE], purple);     // X- (Фиолетовая)
        addLine([0, 0, Z_BASE], [0, GRID_HEIGHT, Z_BASE], [0, 1, 0]);  // Y+ (Зеленая)
        addLine([0, 0, Z_BASE], [0, 0, Z_BASE + GRID_DEPTH], [1, 1, 1]); // Z+ (Белая вглубь)

        // 2. Левая сетка (Фиолетовая, X: 0 -> -128)
        // Горизонтальные линии (каждые 16 единиц)
        for (let y = 0; y <= GRID_HEIGHT; y += 16) {
            addLine([0, y, Z_BASE], [-GRID_WIDTH, y, Z_BASE], purple);
        }
        // Вертикальные линии (каждые 16 единиц)
        for (let x = 0; x >= -GRID_WIDTH; x -= 16) {
            addLine([x, 0, Z_BASE], [x, GRID_HEIGHT, Z_BASE], purple);
        }

        // 3. Правая сетка (Красная, X: 0 -> +128)
        // Горизонтальные линии (каждые 16 единиц)
        for (let y = 0; y <= GRID_HEIGHT; y += 16) {
            addLine([0, y, Z_BASE], [GRID_WIDTH, y, Z_BASE], red);
        }
        // Вертикальные линии (каждые 16 единиц)
        for (let x = 0; x <= GRID_WIDTH; x += 16) {
            addLine([x, 0, Z_BASE], [x, GRID_HEIGHT, Z_BASE], red);
        }

        // 4. Синяя точка (сфера на пересечении осей)
        const sphereR = 3;
        for (let i = 0; i < 16; i++) {
            const a1 = (i / 16) * Math.PI * 2;
            const a2 = ((i + 1) / 16) * Math.PI * 2;
            addLine(
                [Math.cos(a1) * sphereR, Math.sin(a1) * sphereR + 0, Z_BASE],
                [Math.cos(a2) * sphereR, Math.sin(a2) * sphereR + 0, Z_BASE],
                [0.0, 0.4, 1.0]
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
