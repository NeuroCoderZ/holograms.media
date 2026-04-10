/**
 * GridWireframe.js — сетки, оси, синяя точка
 * =============================================
 * Фиолетовая сетка (L), красная сетка (R)
 * Оси X/Y/Z с цветными линиями
 * Синяя точка на пересечении осей
 */

import { GRID_OPACITY } from '../config/hologramConfig.js';

const GRID_OPACITY = 0.0021;

export class GridWireframe {
    constructor(device, shaderModule, bindGroupLayout) {
        this.device = device;

        // Создаём линии сеток и осей
        const { points, colors } = this._buildGridAndAxes();
        this.pointCount = points.length / 3;

        // Vertex buffer
        this.vertexBuffer = device.createBuffer({
            size: points.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, points);

        // Color buffer
        this.colorBuffer = device.createBuffer({
            size: colors.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.colorBuffer, 0, colors);

        // Pipeline (lines)
        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: shaderModule,
                entryPoint: 'gridVertex',
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
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
                depthWriteEnabled: false,
                depthCompare: 'less',
            },
        });
    }

    _buildGridAndAxes() {
        const points = [];
        const colors = [];

        const pushLine = (x0, y0, z0, x1, y1, z1, r, g, b) => {
            points.push(x0, y0, z0, x1, y1, z1);
            colors.push(r, g, b, r, g, b);
        };

        const GRID_WIDTH = 128;
        const GRID_HEIGHT = 256; // 128 * CELL_HEIGHT(2)
        const GRID_DEPTH = 128;

        // ═══ Левая сетка (фиолетовая, X: 0→-128) ═══
        const purple = [0.749, 0.0, 1.0]; // 0xBF00FF
        for (let y = 0; y <= GRID_HEIGHT; y += 16) {
            for (let z = 0; z <= GRID_DEPTH; z += 16) {
                pushLine(0, y, z, -GRID_WIDTH, y, z, ...purple);
            }
        }
        for (let x = 0; x >= -GRID_WIDTH; x -= 16) {
            for (let z = 0; z <= GRID_DEPTH; z += 16) {
                pushLine(x, 0, z, x, GRID_HEIGHT, z, ...purple);
            }
        }

        // ═══ Правая сетка (красная, X: 0→+128) ═══
        const red = [1.0, 0.0, 0.0];
        for (let y = 0; y <= GRID_HEIGHT; y += 16) {
            for (let z = 0; z <= GRID_DEPTH; z += 16) {
                pushLine(0, y, z, GRID_WIDTH, y, z, ...red);
            }
        }
        for (let x = 0; x <= GRID_WIDTH; x += 16) {
            for (let z = 0; z <= GRID_DEPTH; z += 16) {
                pushLine(x, 0, z, x, GRID_HEIGHT, z, ...red);
            }
        }

        // ═══ Оси ═══
        // Ось X фиолетовая (лево)
        pushLine(0, 0, 0, -GRID_WIDTH, 0, 0, ...purple);
        // Ось X красная (право)
        pushLine(0, 0, 0, GRID_WIDTH, 0, 0, ...red);
        // Ось Y зелёная
        pushLine(0, 0, 0, 0, GRID_HEIGHT, 0, 0.0, 1.0, 0.0);
        // Ось Z белая
        pushLine(0, 0, 0, 0, 0, GRID_DEPTH, 1.0, 1.0, 1.0);

        // ═══ Синяя точка (сфера на пересечении) ═══
        // 16 линий для имитации сферы
        const sphereR = 3;
        for (let i = 0; i < 16; i++) {
            const a1 = (i / 16) * Math.PI * 2;
            const a2 = ((i + 1) / 16) * Math.PI * 2;
            pushLine(
                Math.cos(a1) * sphereR, Math.sin(a1) * sphereR, 0,
                Math.cos(a2) * sphereR, Math.sin(a2) * sphereR, 0,
                0.0, 0.0, 1.0
            );
        }

        return {
            points: new Float32Array(points),
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
