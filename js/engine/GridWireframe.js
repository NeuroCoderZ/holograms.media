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
        const STEP_Y = 2.0; // Высота ячейки

        // 1. Оси из точки (0, 0, Z_BASE)
        addLine([0, 0, Z_BASE], [128, 0, Z_BASE], [1, 0, 0]);   // X+ (Красная)
        addLine([0, 0, Z_BASE], [-128, 0, Z_BASE], [0.5, 0, 1]); // X- (Фиолетовая)
        addLine([0, 0, Z_BASE], [0, 256, Z_BASE], [0, 1, 0]);   // Y+ (Зеленая)
        addLine([0, 0, Z_BASE], [0, 0, Z_BASE + 128], [0, 0, 1]); // Z+ (Синяя вглубь)

        // 2. Сетки (Правая - Красная, Левая - Фиолетовая)
        // Горизонтальные линии
        for (let y = 0; y <= 256; y += 32) {
            addLine([-128, y, Z_BASE], [128, y, Z_BASE], [0.3, 0.3, 0.3]);
        }
        // Вертикальные линии
        for (let x = -128; x <= 128; x += 32) {
            addLine([x, 0, Z_BASE], [x, 256, Z_BASE], [0.3, 0.3, 0.3]);
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
