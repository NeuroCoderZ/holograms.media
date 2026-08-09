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
            this.latestAudioData = data;
            this.isDemoMode = false;
        });

        eventBus.on('audioReset', () => {
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
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();

            this._createDepthTexture();

            const shaderCode = this._buildShaderCode();
            const shaderModule = this.engine.device.createShaderModule({ code: shaderCode });

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

            this.columns = new InstancedColumns(this.engine.device, shaderModule, bindGroupLayout);
            this.grid = new GridWireframe(this.engine.device, shaderModule, bindGroupLayout);

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

            struct VSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vColor: vec3<f32>,
            };

            // Отдельный выход для столбцов: им нужна глубина в ячейках для
            // градации яркости. Сетка и сферы пользуются простым VSOutput,
            // чтобы не заполнять поле, которое им не нужно.
            struct ColVSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vColor: vec3<f32>,
                @location(1) vDepthCells: f32,
            };

            // ─── Columns ─────────────────────────────────────
            // Матрица модели собирается ЗДЕСЬ, на GPU (было: в JS каждый кадр).
            // Вход: статика (азбука полутонов) + голокадр (dB SPL, пан).
            struct ColVSInput {
                @location(0) position: vec3<f32>,
                @location(1) width: f32,       // ширина пучка в ячейках
                @location(2) posY: f32,        // позиция по Y
                @location(3) color: vec3<f32>, // цвет полутона
                @location(4) depth: f32,       // глубина = dB SPL (термокод)
                @location(5) pan: f32,         // знаковые ячейки, 0 = центр
            };

            @vertex fn main(input: ColVSInput) -> ColVSOutput {
                var out: ColVSOutput;
                out.vColor = input.color;

                let h = clamp(input.depth, 1.0, 128.0);
                let w = max(input.width, 1.0);
                let z = 75.0; // Протокол 1 Метр (внутренняя грань)

                // Масштаб + позиция без матричного умножения:
                // куб единичный, поэтому достаточно поэлементно.
                let scaled = vec3<f32>(
                    input.position.x * w,
                    input.position.y * 2.0,
                    input.position.z * h
                );
                let worldPos = vec4<f32>(
                    scaled.x + input.pan,
                    scaled.y + input.posY,
                    scaled.z + z + h * 0.5,
                    1.0
                );

                // Глубина в ячейках для градации яркости во фрагменте.
                out.vDepthCells = (input.position.z + 0.5) * h;

                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * worldPos);
                return out;
            }
            @fragment fn fsMain(input: ColVSOutput) -> @location(0) vec4<f32> {
                // Яркость линейна по глубине: короткий столбец темнее.
                // Визуальная «дырка» = чернота = отсутствие громкости.
                let bIndex = clamp(floor(input.vDepthCells), 0.0, 127.0);
                let brightness = (bIndex + 1.0) / 128.0;
                return vec4<f32>(input.vColor * brightness, 1.0);
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

        this.vertexBuffer = device.createBuffer({ size: SPHERE_VERTICES.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(SPHERE_VERTICES); this.vertexBuffer.unmap();

        this.indexBuffer = device.createBuffer({ size: SPHERE_INDICES.byteLength, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(SPHERE_INDICES); this.indexBuffer.unmap();

        const dataBufferData = new Float32Array([
            0,0,0,1.2,    // Center (Blue)
            128,0,75,1.0, // Right (Red) - сдвиг на Z=75
            -128,0,75,1.0, // Left (Violet)
            0,256,75,1.0,  // Top (Green)
        ]);

        const colorBufferData = new Float32Array([
            0,0.4,1,1,    // Center
            1,0,0,1,      // Right
            0.6,0,1,1,    // Left
            0,1,0,1,      // Top
        ]);

        this.sphereDataBuffer = device.createBuffer({
            size: dataBufferData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.sphereDataBuffer, 0, dataBufferData);

        this.sphereColorBuffer = device.createBuffer({
            size: colorBufferData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.sphereColorBuffer, 0, colorBufferData);

        this.spherePipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            vertex: {
                module: shaderModule, entryPoint: 'sphereVertex',
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }, 
                    { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }] }, 
                    { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x4' }] }, 
                ],
            },
            fragment: { 
                module: shaderModule, 
                entryPoint: 'sphereFragment', 
                targets: [{ 
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
                    }
                }] 
            },
            primitive: { topology: 'triangle-list', cullMode: 'none' },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
        });

        this.sphereIndexCount = SPHERE_INDICES.length;
    }

    _drawSpheres(pass) {
        pass.setPipeline(this.spherePipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);      
        pass.setVertexBuffer(1, this.sphereDataBuffer);  
        pass.setVertexBuffer(2, this.sphereColorBuffer); 
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(this.sphereIndexCount, 4);
    }

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
                clearValue: { r: 0, g: 0, b: 0, a: 0 }, 
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
        
        this._drawSpheres(pass);

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
