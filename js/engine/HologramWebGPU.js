/**
 * HologramWebGPU.js — Точка входа HoloEngine (WebGPU)
 * ====================================================
 * Фаза 1: Синяя сфера (0,0,0) — центр координат двух декартовых систем.
 */

import { HoloEngine } from './Engine.js';

export class HologramWebGPU {
    constructor() {
        this.engine = null;
        this.isInitialized = false;
        this.isDemoMode = false;
        this._frameCount = 0;

        // Ресурсы для Синей Сферы
        this.spherePipeline = null;
        this.sphereVertexBuffer = null;
        this.sphereIndexBuffer = null;
        this.indexCount = 0;
    }

    async init() {
        console.log('[HoloEngine] 🏗️ Конструктор создан');

        // 1. Находим контейнер
        const container = document.getElementById('grid-container');
        if (!container) {
            console.error('[HoloEngine] ❌ grid-container не найден!');
            return;
        }
        const rect = container.getBoundingClientRect();

        // 2. Создаём canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'holo-webgpu-canvas';
        this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
        container.style.position = 'relative';
        container.appendChild(this.canvas);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        try {
            // 3. WebGPU Engine
            console.log('[HoloEngine] 🔧 Создание HoloEngine...');
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();
            console.log('[HoloEngine] ✅ HoloEngine инициализирован');

            // 4. Создаём Синюю Сферу
            console.log('[HoloEngine] 🔵 Создание Синей Сферы...');
            this._createSphere();

            console.log('[HoloEngine] 🎉 ВСЁ ИНИЦИАЛИЗИРОВАНО');
            this.isInitialized = true;

            // 5. Запуск
            this.isDemoMode = true;
            this._renderLoop();

        } catch (error) {
            console.error('[HoloEngine] ❌ Ошибка:', error);
            this._showError(error.message);
        }
    }

    _createSphere() {
        // Простой икосаэдр (20 граней, 12 вершин, 30 индексов)
        const t = (1 + Math.sqrt(5)) / 2;
        const vertices = new Float32Array([
            -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,  0,
             0, -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,
             t,  0, -1,  t,  0,  1, -t,  0, -1, -t,  0,  1
        ]);
        // Нормализуем радиус ~0.2
        const scale = 0.2;
        for(let i=0; i<vertices.length; i++) vertices[i] *= scale;

        const indices = new Uint16Array([
            0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11,
            1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
            3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9,
            4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1
        ]);

        this.indexCount = indices.length;

        // Буферы
        this.sphereVertexBuffer = this.engine.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(this.sphereVertexBuffer.getMappedRange()).set(vertices);
        this.sphereVertexBuffer.unmap();

        this.sphereIndexBuffer = this.engine.device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true,
        });
        new Uint16Array(this.sphereIndexBuffer.getMappedRange()).set(indices);
        this.sphereIndexBuffer.unmap();

        // Шейдер: просто синий цвет
        const shaderModule = this.engine.device.createShaderModule({ code: `
            struct VSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec4<f32>,
            };

            @vertex fn vs(
                @location(0) pos: vec3<f32>,
                @builtin(instance_index) idx: u32
            ) -> VSOutput {
                // Матрицы из uniform buffer
                let viewProj = uniforms.uProjectionMatrix * uniforms.uViewMatrix;
                var out: VSOutput;
                out.position = viewProj * vec4<f32>(pos, 1.0);
                out.color = vec4<f32>(0.0, 0.5, 1.0, 1.0); // Синяя сфера
                return out;
            }

            @fragment fn fs(input: VSOutput) -> @location(0) vec4<f32> {
                return input.color;
            }

            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            struct Uniforms {
                uProjectionMatrix: mat4x4<f32>,
                uViewMatrix: mat4x4<f32>,
            };
        `});

        this.spherePipeline = this.engine.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs',
                buffers: [{
                    arrayStride: 12, // 3 floats
                    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                }],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs',
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
        });
    }

    _renderLoop = () => {
        if (!this.isInitialized) return;

        const commandEncoder = this.engine.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.engine.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 }, // Прозрачный фон
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        pass.setPipeline(this.spherePipeline);
        pass.setVertexBuffer(0, this.sphereVertexBuffer);
        pass.setIndexBuffer(this.sphereIndexBuffer, 'uint16');
        pass.drawIndexed(this.indexCount);
        pass.end();

        this.engine.device.queue.submit([commandEncoder.finish()]);

        this._frameCount++;
        requestAnimationFrame(this._renderLoop);
    };

    _showError(message) {
        const overlay = document.createElement('div');
        overlay.id = 'holoengine-error';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); color: #f44; display: flex;
            align-items: center; justify-content: center; z-index: 999999;
            font-family: monospace; font-size: 16px; text-align: center; padding: 20px;
        `;
        overlay.innerHTML = `<div>
            <h1>⚠️ HoloEngine ошибка</h1>
            <p>${message}</p>
        </div>`;
        document.body.appendChild(overlay);
    }
}

export const hologramWebGPU = new HologramWebGPU();
