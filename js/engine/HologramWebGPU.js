/**
 * HologramWebGPU.js — Точка входа HoloEngine (с подробным логированием)
 * =====================================================================
 * WebGPU рендеринг голограммы BasilaQ-128.
 * Полностью заменяет Three.js для BasilaQ-128 визуализации.
 */

import { HoloEngine } from './Engine.js';
import { InstancedColumns } from './InstancedColumns.js';
import { GridWireframe } from './GridWireframe.js';
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
        this._frameCount = 0;

        console.log('[HoloEngine] 🏗️ Конструктор создан');

        // Подписка на аудио-данные
        eventBus.on('audioData', (data) => {
            if (this.isDemoMode) {
                console.log('[HoloEngine] 🎵 Переключение: DEMO → AUDIO MODE');
            }
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

        // 1. Находим контейнер
        const container = document.getElementById('grid-container');
        if (!container) {
            console.error('[HoloEngine] ❌ grid-container не найден!');
            return;
        }
        const rect = container.getBoundingClientRect();
        console.log(`[HoloEngine] 📐 grid-container: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);

        // 2. Создаём canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'holo-webgpu-canvas';
        this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
        container.style.position = 'relative';
        container.style.backgroundColor = 'transparent';
        container.appendChild(this.canvas);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        console.log(`[HoloEngine] 🖼️ Canvas создан: ${this.canvas.width}x${this.canvas.height} (DPR: ${dpr})`);

        try {
            // 3. WebGPU Engine
            console.log('[HoloEngine] 🔧 Создание HoloEngine...');
            this.engine = new HoloEngine(this.canvas);
            await this.engine.init();
            console.log('[HoloEngine] ✅ HoloEngine инициализирован');

            // 4. Depth texture
            console.log('[HoloEngine] 📦 Создание depth texture...');
            this._createDepthTexture();
            console.log('[HoloEngine] ✅ Depth texture создан');

            // 5. Шейдеры
            console.log('[HoloEngine] 📝 Компиляция WGSL шейдеров...');
            const shaderCode = this._buildShaderCode();
            console.log(`[HoloEngine] 📝 WGSL код: ${shaderCode.length} символов`);
            const shaderModule = this.engine.device.createShaderModule({ code: shaderCode });
            console.log('[HoloEngine] ✅ Шейдеры скомпилированы');

            // 6. Bind group layout
            console.log('[HoloEngine] 🔗 Создание bind group layout...');
            const bindGroupLayout = this.engine.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                ],
            });

            // 7. Uniform buffer
            console.log('[HoloEngine] 📋 Создание uniform buffer (128 bytes)...');
            this.uniformBuffer = this.engine.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            this.bindGroup = this.engine.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
            });
            console.log('[HoloEngine] ✅ Uniform buffer + bind group созданы');

            // 8. Instanced columns
            console.log('[HoloEngine] 🏗️ Создание InstancedColumns (128 инстансов × 2)...');
            this.columns = new InstancedColumns(this.engine.device, shaderModule, bindGroupLayout);
            console.log('[HoloEngine] ✅ InstancedColumns созданы');

            // 9. Grid wireframe
            console.log('[HoloEngine] 📐 Создание GridWireframe...');
            this.grid = new GridWireframe(this.engine.device, shaderModule, bindGroupLayout);
            console.log('[HoloEngine] ✅ GridWireframe создан');

            // 10. Инициализация завершена
            this.isInitialized = true;
            console.log('[HoloEngine] 🎉 ВСЁ ИНИЦИАЛИЗИРОВАНО');
            console.log(`[HoloEngine] 📊 Режим: ${this.isDemoMode ? 'DEMO (hL=64)' : 'AUDIO'}`);

            // 11. Запуск render loop
            console.log('[HoloEngine] 🎬 Запуск render loop...');
            this._renderLoop();

        } catch (error) {
            console.error('[HoloEngine] ❌ ОШИБКА ИНИЦИАЛИЗАЦИИ:', error);
            console.error('[HoloEngine] 📍 Stack:', error.stack);
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

            // ─── Column Shaders ─────────────────────────────────────
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
            fn main(input: VSInput) -> VSOutput {
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
                return vec4<f32>(input.vColor * brightness, 1.0);
            }

            // ─── Grid Shaders ───────────────────────────────────────
            struct GridVSInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec3<f32>,
            };

            @vertex
            fn gridVertex(input: GridVSInput) -> VSOutput {
                var out: VSOutput;
                out.vColor = input.color;
                out.vWorldZHeight = 0.0;
                let worldPos = vec4<f32>(input.position, 1.0);
                let viewPos = uniforms.uViewMatrix * worldPos;
                out.position = uniforms.uProjectionMatrix * viewPos;
                return out;
            }

            @fragment
            fn gridFragment(input: VSOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.vColor, 1.0);
            }
        `;
    }

    _renderLoop = () => {
        if (!this.isInitialized) return;

        // Лог первых 5 кадров
        if (this._frameCount < 5) {
            console.log(`[HoloEngine] 🎬 Кадр #${this._frameCount}: mode=${this.isDemoMode ? 'DEMO' : 'AUDIO'}, canvas=${this.canvas.width}x${this.canvas.height}`);
        }

        this.engine.resize();
        this._createDepthTexture();

        // ═══════════════════════════════════════════════════
        // DEBUG: Рисуем красный полноэкранный треугольник
        // Если экран стал красным — пайплайн работает!
        // ═══════════════════════════════════════════════════
        const commandEncoder = this.engine.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.engine.context.getCurrentTexture().createView(),
                clearValue: { r: 1, g: 0, b: 0, a: 1 }, // КРАСНЫЙ ФОН!
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
            <p>Используйте Chrome 113+, Edge 113+, Firefox 141+</p>
        </div>`;
        document.body.appendChild(overlay);
    }

    setXRMode(enabled) {
        this.engine.setXRMode(enabled);
    }
}

// Singleton
export const hologramWebGPU = new HologramWebGPU();
export default hologramWebGPU;
