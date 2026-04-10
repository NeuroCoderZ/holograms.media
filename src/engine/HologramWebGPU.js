/**
 * HologramWebGPU.js — Точка входа HoloEngine
 * ============================================
 * WebGPU рендеринг голограммы BasilaQ-128.
 * Работает параллельно с Three.js, затем заменит его полностью.
 */

import { HoloEngine } from './Engine.js';
import { InstancedColumns } from './InstancedColumns.js';
import { GridWireframe } from './GridWireframe.js';
import { semitones } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';

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

        // Подписка на аудио-данные
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
        // Создаём canvas поверх grid-container
        const container = document.getElementById('grid-container');
        if (!container) {
            console.warn('[HologramWebGPU] grid-container не найден');
            return;
        }

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'holo-webgpu-canvas';
        this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
        container.style.position = 'relative';
        container.appendChild(this.canvas);

        try {
            // WebGPU Engine
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();

            // Depth texture
            this._createDepthTexture();

            // Шейдер
            const shaderCode = this._buildShaderCode();
            const shaderModule = this.engine.device.createShaderModule({ code: shaderCode });

            // Bind group layout
            const bindGroupLayout = this.engine.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                ],
            });

            // Uniform buffer
            this.uniformBuffer = this.engine.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            this.bindGroup = this.engine.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
            });

            // Instanced columns
            this.columns = new InstancedColumns(this.engine.device, shaderModule, bindGroupLayout);

            // Grid wireframe
            this.grid = new GridWireframe(this.engine.device, shaderModule, bindGroupLayout);

            this.isInitialized = true;
            console.log('[HologramWebGPU] ✅ Инициализирован');

            // Render loop
            this._renderLoop();

        } catch (error) {
            console.error('[HologramWebGPU] ❌ Ошибка инициализации:', error);
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

            struct VSInput {
                @location(0) position: vec3<f32>,
                @location(1) m0: vec4<f32>,
                @location(2) m1: vec4<f32>,
                @location(3) m2: vec4<f32>,
                @location(4) m3: vec4<f32>,
                @location(5) color: vec3<f32>,
                @location(6) scaleZ: f32,
            };

            struct VSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vWorldZHeight: f32,
                @location(1) vColor: vec3<f32>,
            };

            @vertex
            fn vsMain(input: VSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.color;
                out.vWorldZHeight = (input.position.z + 0.5) * input.scaleZ;
                
                let model = mat4x4<f32>(input.m0, input.m1, input.m2, input.m3);
                let worldPos = model * vec4<f32>(input.position, 1.0);
                let viewPos = uniforms.uViewMatrix * worldPos;
                out.position = uniforms.uProjectionMatrix * viewPos;
                return out;
            }

            @fragment
            fn fsMain(input: VSOutput) -> @location(0) vec4<f32> {
                let cellIndex = floor(input.vWorldZHeight);
                let bIndex = clamp(cellIndex, 0.0, 127.0);
                let brightness = (bIndex + 1.0) / 128.0;
                let finalColor = input.vColor * brightness;
                return vec4<f32>(finalColor, 1.0);
            }

            // Grid шейдеры
            struct GridVSInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec3<f32>,
            };

            @vertex
            fn gridVS(input: GridVSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.color;
                out.vWorldZHeight = 0.0;
                let worldPos = vec4<f32>(input.position, 1.0);
                let viewPos = uniforms.uViewMatrix * worldPos;
                out.position = uniforms.uProjectionMatrix * viewPos;
                return out;
            }

            @fragment
            fn gridFS(input: VSOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.vColor, 1.0);
            }
        `;
    }

    _renderLoop = () => {
        if (!this.isInitialized) return;

        this.engine.resize();
        this._createDepthTexture();

        // Uniforms
        const proj = this.engine.getCurrentProjection();
        const view = this.engine.getViewMatrix();
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 0, proj);
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 64, view);

        // Demo mode: hL=64, или реальные аудио-данные
        if (this.isDemoMode || !this.latestAudioData) {
            this.columns.setDemoMode(64);
        } else {
            this.columns.update(this.latestAudioData);
        }

        // Render pass
        const commandEncoder = this.engine.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.engine.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        });

        pass.setBindGroup(0, this.bindGroup);
        this.grid.draw(pass);
        this.columns.drawLeft(pass);
        this.columns.drawRight(pass);
        pass.end();
        this.engine.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this._renderLoop);
    };
}

// Singleton
export const hologramWebGPU = new HologramWebGPU();
export default hologramWebGPU;
