/**
 * InstancedColumns.js — 256 инстанс-столбцов
 * =============================================
 * 2 draw calls: левая сетка (128) + правая сетка (128)
 * Каждый инстанс: mat4 (position+scale) + vec3 (color) + float (aColumnScaleZ)
 */

import { semitones } from '../config/hologramConfig.js';

const CUBE_VERTICES = new Float32Array([
    // Front face
    -0.5, -0.5,  0.0,   0.5, -0.5,  0.0,   0.5,  0.5,  0.0,  -0.5,  0.5,  0.0,
    // Back face
    -0.5, -0.5,  1.0,  -0.5,  0.5,  1.0,   0.5,  0.5,  1.0,   0.5, -0.5,  1.0,
    // Top face
    -0.5,  0.5,  0.0,   0.5,  0.5,  0.0,   0.5,  0.5,  1.0,  -0.5,  0.5,  1.0,
    // Bottom face
    -0.5, -0.5,  0.0,  -0.5, -0.5,  1.0,   0.5, -0.5,  1.0,   0.5, -0.5,  0.0,
    // Right face
     0.5, -0.5,  0.0,   0.5,  0.5,  0.0,   0.5,  0.5,  1.0,   0.5, -0.5,  1.0,
    // Left face
    -0.5, -0.5,  0.0,  -0.5, -0.5,  1.0,  -0.5,  0.5,  1.0,  -0.5,  0.5,  0.0,
]);

const CUBE_INDICES = new Uint16Array([
     0,  1,  2,   0,  2,  3,     // front
     4,  5,  6,   4,  6,  7,     // back
     8,  9, 10,   8, 10, 11,     // top
    12, 13, 14,  12, 14, 15,     // bottom
    16, 17, 18,  16, 18, 19,     // right
    20, 21, 22,  20, 22, 23,     // left
]);

export class InstancedColumns {
    constructor(device, shaderModule, bindGroupLayout) {
        this.device = device;
        this.count = semitones.length; // 128

        // Vertex buffer (общий для всех инстансов)
        this.vertexBuffer = device.createBuffer({
            size: CUBE_VERTICES.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, CUBE_VERTICES);

        // Index buffer
        this.indexBuffer = device.createBuffer({
            size: CUBE_INDICES.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, CUBE_INDICES);

        // Pipeline
        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: shaderModule,
                entryPoint: 'main',
                buffers: [
                    // position: vec3<f32>
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                    },
                    // instanceMatrix: mat4x4 (4 x vec4)
                    {
                        arrayStride: 64,
                        stepMode: 'instance',
                        attributes: [
                            { shaderLocation: 1, offset: 0, format: 'float32x4' },
                            { shaderLocation: 2, offset: 16, format: 'float32x4' },
                            { shaderLocation: 3, offset: 32, format: 'float32x4' },
                            { shaderLocation: 4, offset: 48, format: 'float32x4' },
                        ],
                    },
                    // aInstanceColor: vec3<f32> + aColumnScaleZ: f32 (padding до 16)
                    {
                        arrayStride: 16,
                        stepMode: 'instance',
                        attributes: [
                            { shaderLocation: 5, offset: 0, format: 'float32x3' },
                            { shaderLocation: 6, offset: 12, format: 'float32' },
                        ],
                    },
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'main',
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
        });

        // Instance buffers (будут обновляться каждый кадр)
        this._initInstanceBuffers();
    }

    setDemoMode(height) {
        for (let i = 0; i < this.count; i++) {
            const s = semitones[i];
            this._setInstance(this.leftInstanceData, i, 0, -128 + i, height, s.color, s.width);
            this._setInstance(this.rightInstanceData, i, 0, -128 + i, height, s.color, s.width);
        }
        this._uploadInstances();
    }

    _initInstanceBuffers() {
        // 80 байт на инстанс: mat4(64) + color(12) + scaleZ(4)
        const instanceSize = 80;
        const bufferSize = instanceSize * this.count;

        // Левая сетка
        this.leftInstanceBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.leftInstanceData = new Float32Array(this.count * 20); // 80/4 = 20 floats

        // Правая сетка
        this.rightInstanceBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.rightInstanceData = new Float32Array(this.count * 20);

        // Демо: hL=1, полный цвет
        for (let i = 0; i < this.count; i++) {
            const s = semitones[i];
            this._setInstance(this.leftInstanceData, i, 0, -128 + i, 1, s.color, s.width);
            this._setInstance(this.rightInstanceData, i, 0, -128 + i, 1, s.color, s.width);
        }

        this._uploadInstances();
    }

    _setInstance(data, idx, panX, posY, height, color, width) {
        const base = idx * 20;
        // Матрица: translation + scale
        const x = panX;
        const y = posY;
        const z = 0;
        const w = width || 1;
        const h = Math.max(1, Math.min(128, height));

        // Row 0: [w, 0, 0, 0]
        data[base + 0] = w; data[base + 1] = 0;  data[base + 2] = 0;  data[base + 3] = 0;
        // Row 1: [0, 2, 0, 0] — CELL_HEIGHT = 2
        data[base + 4] = 0;  data[base + 5] = 2;  data[base + 6] = 0;  data[base + 7] = 0;
        // Row 2: [0, 0, h, 0]
        data[base + 8] = 0;  data[base + 9] = 0;  data[base + 10] = h; data[base + 11] = 0;
        // Row 3: [x, y, h/2, 1] — position.z = h/2 (центр столбца)
        data[base + 12] = x; data[base + 13] = y; data[base + 14] = h/2; data[base + 15] = 1;
        // Color: r, g, b, scaleZ
        data[base + 16] = color.r; data[base + 17] = color.g; data[base + 18] = color.b;
        data[base + 19] = h;
    }

    _uploadInstances() {
        this.device.queue.writeBuffer(this.leftInstanceBuffer, 0, this.leftInstanceData);
        this.device.queue.writeBuffer(this.rightInstanceBuffer, 0, this.rightInstanceData);
    }

    update(audioData) {
        // audioData: { levels: Float32Array(256), pans: Float32Array(256) }
        if (!audioData || !audioData.levels) return;

        for (let i = 0; i < this.count; i++) {
            const s = semitones[i];
            const dbL = audioData.levels[i] || 0;
            const dbR = audioData.levels[i + 128] || 0;
            const hL = Math.max(1, Math.min(128, Math.round(dbL)));
            const hR = Math.max(1, Math.min(128, Math.round(dbR)));

            // Pan cells → X смещение
            const panL = (audioData.pans?.[i] ?? 64) - 64;
            const panR = (audioData.pans?.[i + 128] ?? 64) - 64;

            this._setInstance(this.leftInstanceData, i, panL, -128 + i, hL, s.color, s.width);
            this._setInstance(this.rightInstanceData, i, panR, -128 + i, hR, s.color, s.width);
        }
        this._uploadInstances();
    }

    drawLeft(pass) {
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.leftInstanceBuffer, 0, 64);
        pass.setVertexBuffer(2, this.leftInstanceBuffer, 64, 16);
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(36, this.count);
    }

    drawRight(pass) {
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.rightInstanceBuffer, 0, 64);
        pass.setVertexBuffer(2, this.rightInstanceBuffer, 64, 16);
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(36, this.count);
    }
}
