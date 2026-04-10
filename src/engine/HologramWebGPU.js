/**
 * HologramWebGPU.js — Точка входа HoloEngine
 * ============================================
 * Инициализирует WebGPU рендеринг голограммы.
 * Заменяет Three.js для BasilaQ-128 визуализации.
 */

import { HoloEngine } from './engine/Engine.js';
import { InstancedColumns } from './engine/InstancedColumns.js';
import { GridWireframe } from './engine/GridWireframe.js';
import { holoEngine } from './engine/Engine.js';
import eventBus from './core/eventBus.js';

class HologramWebGPU {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = null;
        this.columns = null;
        this.grid = null;
        this.depthTexture = null;
        this.isInitialized = false;
        this.latestAudioData = null;

        // Подписка на аудио-данные
        eventBus.on('audioData', (data) => {
            this.latestAudioData = data;
        });

        eventBus.on('audioReset', () => {
            this.latestAudioData = null;
        });
    }

    async init() {
        try {
            // 1. WebGPU Engine
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();

            // 2. Depth texture
            this._createDepthTexture();

            // 3. Shader module
            const shaderModule = this.engine.device.createShaderModule({
                code: await this._loadShaders(),
            });

            // 4. Bind group layout
            const bindGroupLayout = this.engine.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                ],
            });

            // 5. Uniform buffer (projection + view = 128 bytes)
            this.uniformBuffer = this.engine.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            this.bindGroup = this.engine.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
            });

            // 6. Instanced columns
            this.columns = new InstancedColumns(this.engine.device, shaderModule, bindGroupLayout);

            // 7. Grid wireframe
            this.grid = new GridWireframe(this.engine.device, shaderModule, bindGroupLayout);

            this.isInitialized = true;
            console.log('[HologramWebGPU] ✅ Инициализирован');

            // Start render loop
            this._renderLoop();

        } catch (error) {
            console.error('[HologramWebGPU] ❌ Ошибка инициализации:', error);
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

    async _loadShaders() {
        // WGSL шейдеры встроены как JS модули
        const { vertexWGSL, fragmentWGSL } = await import('./engine/shaders/columns.wgsl.js');

        // Добавляем grid шейдеры
        const gridVertexWGSL = /* wgsl */`
            struct Uniforms {
                uProjectionMatrix: mat4x4<f32>,
                uViewMatrix: mat4x4<f32>,
            };
            @binding(0) @group(0) var<uniform> uniforms: Uniforms;

            @vertex
            fn gridVertex(@location(0) position: vec3<f32>, @location(1) color: vec3<f32>) -> @builtin(position) vec4<f32> {
                let worldPos = vec4<f32>(position, 1.0);
                let viewPos = uniforms.uViewMatrix * worldPos;
                return uniforms.uProjectionMatrix * viewPos;
            }
        `;

        const gridFragmentWGSL = /* wgsl */`
            @fragment
            fn gridFragment(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
                return vec4<f32>(color, 1.0);
            }
        `;

        // Объединяем все шейдеры в один модуль
        return `
            struct Uniforms {
                uProjectionMatrix: mat4x4<f32>,
                uViewMatrix: mat4x4<f32>,
            };
            @binding(0) @group(0) var<uniform> uniforms: Uniforms;

            ${vertexWGSL.replace('struct Uniforms { ... };', '')
                        .replace('@binding(0) @group(0) var<uniform> uniforms: Uniforms;', '')}

            ${fragmentWGSL}

            ${gridVertexWGSL.replace('struct Uniforms { ... };', '')
                            .replace('@binding(0) @group(0) var<uniform> uniforms: Uniforms;', '')}

            ${gridFragmentWGSL}
        `;
    }

    _renderLoop = () => {
        if (!this.isInitialized) return;

        this.engine.resize();
        this._createDepthTexture();

        // Обновляем uniform buffer
        const proj = this.engine.getCurrentProjection();
        const view = this.engine.getViewMatrix();
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 0, proj);
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 64, view);

        // Обновляем столбцы из аудио-данных
        if (this.latestAudioData) {
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

        // Рисуем сетку (глубина не пишется)
        this.grid.draw(pass);

        // Рисуем столбцы
        this.columns.drawLeft(pass);
        this.columns.drawRight(pass);

        pass.end();
        this.engine.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this._renderLoop);
    };

    _showError(message) {
        const overlay = document.createElement('div');
        overlay.id = 'webgpu-error';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; color: #f00; display: flex; align-items: center;
            justify-content: center; z-index: 99999; font-family: monospace;
            font-size: 18px; text-align: center; padding: 20px;
        `;
        overlay.innerHTML = `
            <div>
                <h1>⚠️ WebGPU не поддерживается</h1>
                <p>${message}</p>
                <p>Используйте Chrome 113+, Edge 113+, Firefox 141+ или Safari 16.4+</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    setXRMode(enabled) {
        this.engine.setXRMode(enabled);
    }
}

// Singleton
export const hologramWebGPU = new HologramWebGPU(
    document.getElementById('holo-canvas') || document.createElement('canvas')
);

export default hologramWebGPU;
