/**
 * HologramWebGPU.js — Точка входа HoloEngine
 * =============================================
 * Интеграция: Сетки, Столбцы, Оси, Сферы.
 */

import { HoloEngine } from './Engine.js';
import { InstancedColumns } from './InstancedColumns.js';
import { GridWireframe } from './GridWireframe.js';
import eventBus from '../core/eventBus.js';

// Геометрия икосаэдра для сфер
const SPHERE_VERTICES = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
        -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,  0,
         0, -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,
         t,  0, -1,  t,  0,  1, -t,  0, -1, -t,  0,  1
    ];
    // Нормализация
    for(let i=0; i<v.length; i++) v[i] /= Math.sqrt(1 + t*t);
    return new Float32Array(v);
})();

const SPHERE_INDICES = new Uint16Array([
    0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11,
    1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
    3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9,
    4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1
]);

export class HologramWebGPU {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.columns = null;
        this.grid = null;
        this.depthTexture = null;
        this.isInitialized = false;
        this.latestAudioData = null;
        this.isDemoMode = true;
        this._frameCount = 0;

        console.log('[HoloEngine] 🏗️ Конструктор создан');

        eventBus.on('audioData', (data) => {
            if (this.isDemoMode) console.log('[HoloEngine] 🎵 Переключение: DEMO → AUDIO MODE');
            this.latestAudioData = data;
            this.isDemoMode = false;
        });

        eventBus.on('audioReset', () => {
            console.log('[HoloEngine] 🔄 Переключение: AUDIO → DEMO MODE');
            this.latestAudioData = null;
            this.isDemoMode = true;
        });
    }

    async init() {
        console.log('[HoloEngine] 🚀 Запуск инициализации...');

        const container = document.getElementById('grid-container');
        if (!container) {
            console.error('[HoloEngine] ❌ grid-container не найден!');
            return;
        }
        const rect = container.getBoundingClientRect();

        // 1. Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'holo-webgpu-canvas';
        this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;';
        container.style.position = 'relative';
        container.style.backgroundColor = 'transparent';
        container.appendChild(this.canvas);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        try {
            // 2. Engine
            console.log('[HoloEngine] 🔧 Создание HoloEngine...');
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();

            // 3. Depth
            this._createDepthTexture();

            // 4. Shaders
            console.log('[HoloEngine] 📝 Компиляция WGSL...');
            const shaderCode = this._buildShaderCode();
            const shaderModule = this.engine.device.createShaderModule({ code: shaderCode });

            // 5. Bind Group
            const bindGroupLayout = this.engine.device.createBindGroupLayout({
                entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }],
            });
            this.uniformBuffer = this.engine.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            this.bindGroup = this.engine.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
            });

            // 6. Components
            console.log('[HoloEngine] 🏗️ Создание компонентов...');
            this.columns = new InstancedColumns(this.engine.device, shaderModule, bindGroupLayout);
            this.grid = new GridWireframe(this.engine.device, shaderModule, bindGroupLayout);

            // 7. Spheres (4 маркера: Центр+Оси)
            this._initSpheres(shaderModule, bindGroupLayout);

            this.isInitialized = true;
            console.log('[HoloEngine] 🎉 ВСЁ ИНИЦИАЛИЗИРОВАНО');
            this._renderLoop();

        } catch (error) {
            console.error('[HoloEngine] ❌ Ошибка:', error);
            this._showError(error.message);
        }
    }

    _createDepthTexture() {
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = this.engine.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    _buildShaderCode() {
        return `
            struct Uniforms {
                uProjectionMatrix: mat4x4<f32>,
                uViewMatrix: mat4x4<f32>,
            };
            @binding(0) @group(0) var<uniform> uniforms: Uniforms;

            // ─── Columns ─────────────────────────────────────
            struct ColVSInput {
                @location(0) position: vec3<f32>,
                @location(1) m0: vec4<f32>, @location(2) m1: vec4<f32>,
                @location(3) m2: vec4<f32>, @location(4) m3: vec4<f32>,
                @location(5) color: vec3<f32>,
                @location(6) scaleZ: f32,
            };
            struct VSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vColor: vec3<f32>,
            };

            @vertex fn main(input: ColVSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.color;
                let model = mat4x4<f32>(input.m0, input.m1, input.m2, input.m3);
                let worldPos = model * vec4<f32>(input.position, 1.0);
                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * worldPos);
                return out;
            }
            @fragment fn fsMain(input: VSOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.vColor, 1.0);
            }

            // ─── Grid ───────────────────────────────────────
            struct GridVSInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec3<f32>,
            };
            @vertex fn gridVertex(input: GridVSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.color;
                let worldPos = vec4<f32>(input.position, 1.0);
                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * worldPos);
                return out;
            }
            @fragment fn gridFragment(input: VSOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.vColor, 1.0);
            }

            // ─── Spheres ────────────────────────────────────
            struct SphereVSInput {
                @location(0) pos: vec3<f32>,
                @location(1) instanceData: vec4<f32>, // x,y,z,scale
                @location(2) instanceColor: vec4<f32>, // r,g,b,1
            };
            @vertex fn sphereVertex(input: SphereVSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.instanceColor.rgb;
                let p = vec4<f32>(input.pos * input.instanceData.w + input.instanceData.xyz, 1.0);
                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * p);
                return out;
            }
            @fragment fn sphereFragment(input: VSOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.vColor, 1.0);
            }
        `;
    }

    _initSpheres(shaderModule, bindGroupLayout) {
        const device = this.engine.device;

        // 1. Geometry Buffers
        this.vertexBuffer = device.createBuffer({ size: SPHERE_VERTICES.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(SPHERE_VERTICES); this.vertexBuffer.unmap();

        this.indexBuffer = device.createBuffer({ size: SPHERE_INDICES.byteLength, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(SPHERE_INDICES); this.indexBuffer.unmap();

        // 2. Instance Buffer (4 сферы)
        // Структура: pos(12) + data(16) + color(16) = 44 bytes -> 48 bytes alignment
        // pos: 3 floats. data: x,y,z,scale. color: r,g,b,1.
        const instanceData = new Float32Array([
            // pos(0,0,0) [unused for instance, used for local mesh], data, color
            // 1. Center (Blue) - Scale 1.2
            0,0,0,  0,0,0,1.2,  0,0.4,1,1,
            // 2. Right (Red) - Scale 1.0
            0,0,0,  128,0,0,1.0,  1,0,0,1,
            // 3. Left (Violet) - Scale 1.0
            0,0,0,  -128,0,0,1.0,  0.6,0,1,1,
            // 4. Top (Green) - Scale 1.0
            0,0,0,  0,256,0,1.0,  0,1,0,1,
        ]);

        this.sphereInstanceBuffer = device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(this.sphereInstanceBuffer.getMappedRange()).set(instanceData);
        this.sphereInstanceBuffer.unmap();

        // 3. Pipeline
        this.spherePipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            vertex: {
                module: shaderModule, entryPoint: 'sphereVertex',
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }, // Local Pos
                    { arrayStride: 48, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 12, format: 'float32x4' }] }, // Data
                    { arrayStride: 48, stepMode: 'instance', attributes: [{ shaderLocation: 2, offset: 28, format: 'float32x4' }] }, // Color
                ],
            },
            fragment: { module: shaderModule, entryPoint: 'sphereFragment', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
            primitive: { topology: 'triangle-list', cullMode: 'none' },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
        });

        this.sphereIndexCount = SPHERE_INDICES.length;
    }

    _drawSpheres(pass) {
        pass.setPipeline(this.spherePipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.setVertexBuffer(0, this.sphereVertexBuffer); // Wait, need to define this
        pass.setVertexBuffer(1, this.sphereInstanceBuffer);
        pass.setIndexBuffer(this.sphereIndexBuffer, 'uint16');
        pass.drawIndexed(this.sphereIndexCount, 4); // 4 instances
    }
    // Fix: buffers are local to _initSpheres, need to save them
    // Let's fix _initSpheres to save buffers to this.sphereVertexBuffer etc.

    _renderLoop = () => {
        if (!this.isInitialized) return;

        this.engine.resize();
        this._createDepthTexture();

        const proj = this.engine.getCurrentProjection();
        const view = this.engine.getViewMatrix();
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 0, proj);
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 64, view);

        if (this.isDemoMode || !this.latestAudioData) {
            this.columns.setDemoMode(64);
        } else {
            this.columns.update(this.latestAudioData);
        }

        const commandEncoder = this.engine.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.engine.context.getCurrentTexture().createView(),
                clearValue: { r: 0.05, g: 0.05, b: 0.15, a: 1 }, // Тёмный фон
                loadOp: 'clear', storeOp: 'store',
            }],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store',
            },
        });

        pass.setBindGroup(0, this.bindGroup);
        this.grid.draw(pass);
        this.columns.drawLeft(pass);
        this.columns.drawRight(pass);
        
        // Spheres
        pass.setPipeline(this.spherePipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.sphereInstanceBuffer);
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(this.sphereIndexCount, 4);

        pass.end();
        this.engine.device.queue.submit([commandEncoder.finish()]);

        this._frameCount++;
        requestAnimationFrame(this._renderLoop);
    };

    _showError(message) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:#f44;display:flex;align-items:center;justify-content:center;z-index:999999;font-family:monospace;font-size:16px;text-align:center;';
        overlay.innerHTML = `<div><h1>⚠️ HoloEngine ошибка</h1><p>${message}</p></div>`;
        document.body.appendChild(overlay);
    }
}

export const hologramWebGPU = new HologramWebGPU();
export default hologramWebGPU;
