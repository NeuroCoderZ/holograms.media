/**
 * HologramWebGPU.js — Точка входа HoloEngine
 * =============================================
 * Интеграция: Сетки, Столбцы, Оси, Сферы.
 */

import { HoloEngine } from './Engine.js';
import { InstancedColumns } from './InstancedColumns.js';
import { GridWireframe } from './GridWireframe.js';
import { PresenceLayer } from './PresenceLayer.js';
import eventBus from '../core/eventBus.js';

// Максимум одновременно видимых маркеров присутствия
const MAX_PRESENCE_MARKERS = 64;

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
        // 2026-10-15 — Счётчик попыток re-init (v0.20.625): провал «Второй жизни»
        // в том же окне = процесс 100% отравлен → сразу poisoned-оверлей.
        this._reinitAttempts = 0;

        // Нативный слой «маркеров присутствия» (замена Three.js EarthZero)
        this.presence = new PresenceLayer();
        this.presenceDataBuffer = null;
        this.presenceColorBuffer = null;
        this._lastFrameTime = performance.now();

        console.log('[HoloEngine] 🏗️ Конструктор создан');

        eventBus.on('audioData', (data) => {
            this.latestAudioData = data;
            this.isDemoMode = false;
        });

        eventBus.on('audioReset', () => {
            this.latestAudioData = null;
            this.isDemoMode = true;
        });

        // Шаг 5 (контур жестов): gestureManager эмитит 'gesture:modify' (Шаг 3b).
        // Применяем к нативным параметрам голограммы. Раньше это шло в мёртвый SmartHologram.
        eventBus.on('gesture:modify', ({ param, value }) => {
            this._applyGestureParam(param, value);
        });
    }

    /** Применение параметра модификации жестом к нативной голограмме. */
    _applyGestureParam(param, value) {
        if (!this.engine || typeof value !== 'number' || !Number.isFinite(value)) return;
        switch (param) {
            case 'axisRotation':
                this.engine.orbit((value ?? 0) * 0.05, 0);
                break;
            case 'scale':
                this.engine.zoomBy(1 + (value ?? 0) * 0.1);
                break;
            case 'color':
            case 'visualIntensity':
                this._hueOffset = (this._hueOffset || 0) + (value ?? 0) * 0.02;
                break;
            case 'audioFrequency':
                // Частота аудио управляет тоном — эффект применяется в этом кадре.
                this._freqBias = value ?? 0;
                break;
            default:
                break;
        }
    }

    async init() {
        console.log('[HoloEngine] 🚀 Запуск инициализации...');

        // 2026-10-14 — Чёрный ящик между сессиями (v0.20.621, задание Qwen 3.8 Max).
        // Если прошлое падение GPU свежее 24 ч — печатаем его одним warn,
        // чтобы следующий лог был самодостаточным без копипасты владельца.
        try {
            const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('holo:lastGpuLost') : null;
            if (raw) {
                const last = JSON.parse(raw);
                // 2026-10-15 — Фильтр sid (v0.20.625): клик «Восстановить без перезагрузки»
                // пишет ящик из той же сессии (sid живёт на window.__holoBootSid и не
                // меняется при re-init, а this.engine в этой точке ещё null) —
                // не выдаём падение 1-й жизни за падение прошлой сессии браузера.
                const bootSid = (typeof window !== 'undefined') ? window.__holoBootSid : null;
                const sameSession = !!(last && last.sid && bootSid && last.sid === bootSid);
                if (last && last.ts && (Date.now() - last.ts) < 24 * 3600 * 1000 && !sameSession) {
                    console.warn('[HoloEngine] ⚫ Прошлое падение GPU (<24ч):', last);
                }
            }
        } catch (e) { /* битый JSON чёрного ящика — молча пропускаем */ }

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

            // 2026-08-25 (юзер): вращение голограммы мышью. Только две оси —
            // горизонталь (yaw) и вертикаль (pitch), без крена вокруг Z.
            this._setupMouseOrbit();

            this.isInitialized = true;
            console.log('[HoloEngine] 🎉 ВСЁ ИНИЦИАЛИЗИРОВАНО');
            this._renderLoop();

        } catch (error) {
            console.error('[HoloEngine] ❌ Ошибка:', error);
            this._showError(error.message);
            this.isInitialized = false;
            // Ошибку ОБЯЗАТЕЛЬНО пробрасываем: раньше она гасилась здесь, и вызывающий
            // init.js печатал «✅ HoloEngine (WebGPU) инициализирован» поверх провала —
            // в логе стояла зелёная галочка, а голограмма не рендерилась.
            throw error;
        }
    }

    /**
     * 2026-08-25 (юзер): вращение голограммы мышью.
     * Зажать левую кнопку и тянуть — поворот по двум осям:
     *   горизонтальный drag -> yaw (влево/вправо),
     *   вертикальный drag  -> pitch (вверх/вниз).
     * Крен вокруг Z отсутствует by design. Шаг ограничен лимитами орбиты.
     */
    _setupMouseOrbit() {
        const host = document.getElementById('grid-container') || this.canvas.parentElement;
        if (!host) return;

        let dragging = false;
        let lastX = 0, lastY = 0;

        host.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;      // только левая кнопка
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            // 0.005 рад на пиксель — комфортный темп поворота
            this.engine.orbit(dx * 0.005, dy * 0.005);
        });
        window.addEventListener('mouseup', () => { dragging = false; });
        // Курсор-подсказка
        host.style.cursor = 'grab';
        host.addEventListener('mousedown', () => { host.style.cursor = 'grabbing'; });
        window.addEventListener('mouseup', () => { host.style.cursor = 'grab'; });
    }

    _createDepthTexture() {
        // 2026-10-13 — guards. Раньше при width/height = 0 (или уже мёртвом
        // device) device.createTexture создавал невалидную текстуру, и цикл
        // каждый кадр сыпал [Invalid Texture] → [Invalid TextureView] →
        // [Invalid CommandBuffer], пока троттлинг не глушил первую причину.
        if (!this.engine?.device || this.engine.deviceLost) return;

        const { width, height } = this.canvas;
        if (!Number.isFinite(width) || !Number.isFinite(height)
            || width < 1 || height < 1) {
            return; // нулевой/битый размер — кадр пропускаем, текстуру не создаём
        }
        // Пересоздаём ТОЛЬКО при реальном изменении размера.
        // В противном случае каждый кадр уничтожался бы и пересоздавался буфер
        // глубины (~60 аллокаций/сек) — расточительно для GPU.
        if (this.depthTexture
            && this.depthTexture.width === width
            && this.depthTexture.height === height) {
            return;
        }
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = this.engine.device.createTexture({
            size: [width, height],
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
                // Протокол 1 Метр (внутренняя грань) + глубина объёма 128 ячеек.
                // Дальняя стенка = z = 75 + 128 = 203.
                const Z_FRONT = 75.0;
                const GRID_DEPTH = 128.0;
                const Z_FAR = Z_FRONT + GRID_DEPTH;

                // Масштаб + позиция без матричного умножения:
                // куб единичный, поэтому достаточно поэлементно.
                let scaled = vec3<f32>(
                    input.position.x * w,
                    input.position.y * 2.0,
                    input.position.z * h
                );
                // 2026-08-25 (юзер): столбец растёт ОТ ДАЛЬНЕЙ СТЕНКИ к зрителю
                // (раньше — от передней грани вглубь). Базовая точка столбца:
                // z_far - h, передняя грань столбца на z_far - h, задняя на z_far.
                let worldPos = vec4<f32>(
                    scaled.x + input.pan,
                    scaled.y + input.posY,
                    scaled.z + (Z_FAR - h),
                    1.0
                );

                // Глубина в ячейках для градации яркости во фрагменте.
                out.vDepthCells = (input.position.z + 0.5) * h;

                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * worldPos);
                return out;
            }
            @fragment fn fsMain(input: ColVSOutput) -> @location(0) vec4<f32> {
                // Яркость ячейки: индекс от ДАЛЬНЕЙ стенки (2026-08-25, юзер).
                // Раньше: (bIndex+1)/128 — столбец у дальней стенки с h=1 был чёрным
                // (1/128), что убивало демо-пирамиду и тихий звук.
                // Теперь: базовая яркость 0.85 (дальние ячейки почти полные),
                // спад к передней грани столбца — «термометр» остаётся читаемым,
                // но ничего не проваливается в чистый чёрный.
                let bIndex = clamp(floor(input.vDepthCells), 0.0, 127.0);
                let brightness = mix(0.35, 1.0, bIndex / 127.0);
                return vec4<f32>(input.vColor * brightness, 1.0);
            }

            // ─── Grid ───────────────────────────────────────
            struct GridVSInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec4<f32>,
            };
            struct GridVSOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vColor: vec4<f32>,
            };
            @vertex fn gridVertex(input: GridVSInput) -> GridVSOutput {
                var out: GridVSOutput;
                out.vColor = input.color;
                let worldPos = vec4<f32>(input.position, 1.0);
                out.position = uniforms.uProjectionMatrix * (uniforms.uViewMatrix * worldPos);
                return out;
            }
            @fragment fn gridFragment(input: GridVSOutput) -> @location(0) vec4<f32> {
                return input.vColor;
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

        // Динамические буферы маркеров присутствия (максимум MAX_PRESENCE_MARKERS)
        this.presenceDataBuffer = device.createBuffer({
            size: MAX_PRESENCE_MARKERS * 16,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.presenceColorBuffer = device.createBuffer({
            size: MAX_PRESENCE_MARKERS * 16,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

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

    /**
     * Добавить/обновить маркер присутствия другого клиента (нативный EarthZero).
     * @param {string} peerId — уникальный ID пира
     * @param {{x:number,y:number,z:number}} position — позиция в юнитах голограммы
     * @param {number} intensity — сила активности 0..1
     */
    addPresenceMarker(peerId, position, intensity = 1.0) {
        this.presence.addMarker(peerId, position, intensity);
    }

    /** Удалить маркер присутствия пира. */
    removePresenceMarker(peerId) {
        this.presence.removeMarker(peerId);
    }

    /** Обновить буферы маркеров из PresenceLayer. Возвращает число маркеров. */
    _syncPresenceBuffers() {
        const now = performance.now();
        const dt = Math.min((now - this._lastFrameTime) / 1000, 0.1);
        this._lastFrameTime = now;

        const batch = this.presence.update(dt);
        if (!batch || batch.count === 0) return 0;

        const count = Math.min(batch.count, MAX_PRESENCE_MARKERS);
        this.engine.device.queue.writeBuffer(
            this.presenceDataBuffer, 0, batch.data.subarray(0, count * 4));
        this.engine.device.queue.writeBuffer(
            this.presenceColorBuffer, 0, batch.colors.subarray(0, count * 4));
        return count;
    }

    _drawSpheres(pass) {
        // Статические сферы-«якоря» (центр/право/лево/верх)
        pass.setPipeline(this.spherePipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);      
        pass.setVertexBuffer(1, this.sphereDataBuffer);  
        pass.setVertexBuffer(2, this.sphereColorBuffer); 
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(this.sphereIndexCount, 4);

        // Динамические маркеры присутствия (нативный EarthZero)
        const presenceCount = this._syncPresenceBuffers();
        if (presenceCount > 0) {
            pass.setVertexBuffer(1, this.presenceDataBuffer);
            pass.setVertexBuffer(2, this.presenceColorBuffer);
            pass.drawIndexed(this.sphereIndexCount, presenceCount);
        }
    }

    _renderLoop = () => {
        if (!this.isInitialized) return;

        // 2026-10-13 — потеря устройства: останавливаемся сразу, без попыток
        // рендерить потерянным device (и без каскада невалидных текстур).
        if (this.engine.deviceLost) {
            this._stopOnDeviceLost();
            return;
        }

        this.engine.resize();
        this._createDepthTexture();

        // Глубина могла не создаться (нулевой размер канваса) — тогда кадр
        // пропускаем, иначе .createView() уронит RAF-цикл навсегда.
        if (!this.depthTexture) {
            requestAnimationFrame(this._renderLoop);
            return;
        }

        const proj = this.engine.getCurrentProjection();
        const view = this.engine.getViewMatrix();
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 0, proj);
        this.engine.device.queue.writeBuffer(this.uniformBuffer, 64, view);

        if (this.isDemoMode || !this.latestAudioData) {
            this.columns.setDemoMode(1);
        } else {
            this.columns.update(this.latestAudioData);
        }

        // getCurrentTexture() бросает/возвращает битую текстуру, если канвас
        // нулевого размера или контекст не сконфигурирован. Раньше отсюда
        // каждый кадр уходил невалидный colorAttachment в render pass.
        let swapView;
        try {
            swapView = this.engine.context.getCurrentTexture().createView();
        } catch (swapError) {
            console.warn('[HoloEngine] Кадр пропущен: swapchain недоступен —', swapError.message);
            requestAnimationFrame(this._renderLoop);
            return;
        }

        const commandEncoder = this.engine.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: swapView,
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
        // 2026-10-15 — firstcleanframe с отложенной проверкой (v0.20.623).
        // onuncapturederror доставляется асинхронно: синхронная проверка на кадре 1
        // видела чистые флаги даже поверх умирающего GPU, и руки стартовали в каскад.
        // Теперь взводим таймер 1200 мс — к его срабатыванию доставка ошибок уже
        // выставит флаги, и проверка станет честной.
        if (this._frameCount === 1 && !this._firstFrameCheckArmed) {
            this._firstFrameCheckArmed = true;
            setTimeout(() => this._emitFirstCleanFrameIfClean(), 1200);
        }
        requestAnimationFrame(this._renderLoop);
    };

    /**
     * 2026-10-15 — Отложенная проверка чистоты первого кадра (v0.20.623).
     * Эмитит holoengine:firstcleanframe только если конвейер жив и ни одной
     * WebGPU-ошибки не зафиксировано; иначе руки ждут фолбэк 3 с из init.js.
     */
    _emitFirstCleanFrameIfClean() {
        if (this._firstCleanFrameEmitted) return;
        const eng = this.engine;
        const alive = this.isInitialized && !!eng && !eng.deviceLost;
        const clean = !!eng && !eng._firstWebGPUErrorLogged
            && (!eng._webgpuErrorCounts || eng._webgpuErrorCounts.size === 0);
        if (alive && clean) {
            this._firstCleanFrameEmitted = true;
            try { eventBus.emit('holoengine:firstcleanframe', {}); } catch (e) { /* ignore */ }
            if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('holoengine:firstcleanframe'));
            }
        } else {
            console.warn('[HoloEngine] первый кадр нечистый (отложенная проверка) — holoengine:firstcleanframe не эмитится, руки ждут фолбэк');
        }
    }

    _showError(message, opts = {}) {
        // 2026-10-15 — hideReinit для отравленного GPU-процесса (v0.20.623):
        // кнопка восстановления при бут-паттерне бессмысленна — показываем инструкцию.
        const hideReinit = !!(opts && opts.hideReinit);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:#f44;display:flex;align-items:center;justify-content:center;z-index:999999;font-family:monospace;font-size:16px;text-align:center;';
        overlay.innerHTML = hideReinit
            ? `<div><h1>⚠️ HoloEngine ошибка</h1><p id="holo-error-text">${message}</p><p style="color:#fa0;font-size:13px;">Кнопка восстановления скрыта: при отравленном GPU-процессе она бессмысленна.</p></div>`
            : `<div><h1>⚠️ HoloEngine ошибка</h1><p id="holo-error-text">${message}</p><button id="holo-reinit-btn" style="margin-top:12px;padding:8px 16px;font-size:14px;cursor:pointer;">Восстановить без перезагрузки</button><p id="holo-reinit-status" style="color:#fa0;font-size:13px;"></p></div>`;
        document.body.appendChild(overlay);
        if (hideReinit) return;
        // 2026-10-14 — Кнопка восстановления без перезагрузки (v0.20.621, задание Qwen 3.8 Max).
        // Chrome перезапускает GPU-процесс сам, поэтому одна попыточная re-init
        // оправдана; второй провал — жёстко требуем reload.
        const btn = overlay.querySelector('#holo-reinit-btn');
        const status = overlay.querySelector('#holo-reinit-status');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (this._reinitAttempted) {
                    if (status) status.textContent = 'Повторная попытка не удалась — перезагрузите страницу (F5).';
                    return;
                }
                this._reinitAttempted = true;
                btn.disabled = true;
                if (status) status.textContent = 'Попытка восстановления…';
                try {
                    await this._tryReinit();
                    overlay.remove();
                } catch (e) {
                    if (status) status.textContent = `Не восстановлено (${e?.message || e}) — перезагрузите страницу (F5).`;
                }
            });
        }
    }

    /**
     * 2026-10-14 — Одна попыточная re-init после авторестарта GPU-процесса Chrome
     * (v0.20.621, задание Qwen 3.8 Max). Сносит старый канвас и строит весь
     * конвейер заново через init() (swapchain + depth + пайплайны на новом device).
     * Второй провал обрабатывает вызыватель (кнопка): жёсткое требование reload.
     */
    async _tryReinit() {
        // 2026-10-15 — Учёт попытки (v0.20.625): смерть нового device после клика
        // ведёт в poisoned-ветку _stopOnDeviceLost вместо бесконечной кнопки.
        this._reinitAttempts = (this._reinitAttempts || 0) + 1;
        try { this.canvas?.remove?.(); } catch (e) { /* ignore */ }
        this.engine = null;
        this.columns = null;
        this.grid = null;
        this.depthTexture = null;
        this._deviceLostStopped = false;
        this.isInitialized = false;
        // Новая жизнь конвейера — новая отложенная проверка первого кадра.
        this._frameCount = 0;
        this._firstFrameCheckArmed = false;
        this._firstCleanFrameEmitted = false;
        await this.init();
    }

    /**
     * 2026-10-13 — мягкая остановка при потере GPU-устройства.
     * Один раз печатает причину и dangling-оверлей с инструкцией;
     * RAF-цикл не перепланируется, консоль не заваливается ошибками.
     */
    _stopOnDeviceLost() {
        if (this._deviceLostStopped) return;
        this._deviceLostStopped = true;
        this.isInitialized = false;

        const reason = this.engine.deviceLostReason || 'unknown';
        // 2026-10-15 — Poisoned-детектор v2 (v0.20.624): критерий — время ОСТАНОВКИ
        // (stopAgeMs), а не подтверждения. ageMs lost дрожит (never / 1091 / 35123),
        // смерть при этом всегда на кадре 1 — порог на ageMs давал ложно-отрицательный
        // результат (35123 ≥ 2000). sid исключает запись текущей сессии из «прошлых».
        const stopBase = this.engine._stopTs || Date.now();
        if (!this.engine._stopTs) this.engine._stopTs = stopBase;
        const nowStopAgeMs = this.engine._initTs ? (stopBase - this.engine._initTs) : null;
        const last = this._readLastGpuLost();
        const firstSec = !!this.engine._firstErrorSecondary;
        const lastSec = !!(last && last.firstSecondary);
        const fresh = !!last && !!last.sid && last.sid !== this.engine._bootSid
            && (Date.now() - last.ts) < 10 * 60 * 1000;
        const stopOld = !!(last && last.stopAgeMs !== null && last.stopAgeMs !== undefined && last.stopAgeMs < 5000);
        const stopNow = nowStopAgeMs !== null && nowStopAgeMs < 5000;
        // Усилитель: первая ошибка уже вторична («invalid due to a previous error»)
        // = смерть до первого submit. Требуется вместе со свежей похожей записью,
        // одиночный инцидент poisoned не даёт никогда.
        // 2026-10-15 — Провал in-place re-init (v0.20.625): клик по кнопке был, новый
        // device снова умер за <5000 мс в том же окне — процесс 100% отравлен,
        // сразу честный poisoned-экран вместо бесконечной кнопки.
        const failedReinit = (this._reinitAttempts || 0) >= 1 && stopNow;
        const poisoned = failedReinit || (fresh && stopNow && (stopOld || (lastSec && firstSec)));
        // Фиксируем stop-метку в ящике (путь lost-без-breaker: хендлер lost записал
        // ящик без stopAgeMs — дописываем сейчас; preliminaryReason хелпер сохранит).
        try {
          this.engine._writeGpuBlackbox({
            preliminaryReason: null,
            reason: this.engine.deviceLostReason || 'unknown',
            message: this.engine._lastLostMessage || '',
            ageMs: this.engine._initTs ? (Date.now() - this.engine._initTs) : null,
          });
        } catch (e) { /* ignore */ }
        if (poisoned) {
            console.error(
                `[HoloEngine] ☠️ GPU-процесс отравлен: повторная смерть device на буте `
                + `(stopAgeMs=${nowStopAgeMs}, прошлая stopAgeMs=${last.stopAgeMs}). Re-init и F5 не помогут.`,
            );
            this._showError(
                `GPU-процесс отравлен: WebGPU-device гибнет на ~1-й секунде бута (stopAgeMs=${nowStopAgeMs}), WebGL при этом жив. `
                + `Восстановление без перезагрузки и F5 не помогут — перезапустите браузер полностью (все окна).`,
                { hideReinit: true },
            );
            return;
        }
        // 2026-10-15 — Сообщение драйвера независимо от порядка (v0.20.623):
        // если lost уже разрешился — сразу в оверлей; если нет — позже допишет
        // доживление по holo-error-text.
        const driverMsg = this.engine._lastLostMessage || null;
        console.error(
            `[HoloEngine] Остановка рендера: GPU-устройство потеряно (${reason}). `
            + 'Перезагрузите страницу. Если повторяется — проверьте '
            + 'chrome://gpu (WebGPU/Vulkan) и не держите вторые GPU-контексты.',
        );
        this._showError(
            driverMsg
                ? `GPU-устройство потеряно (${reason}). Драйвер: ${driverMsg}. Перезагрузите страницу, чтобы восстановить рендер.`
                : `GPU-устройство потеряно (${reason}). Перезагрузите страницу, чтобы восстановить рендер.`
        );
    }

    /**
     * 2026-10-15 — Чтение чёрного ящика (v0.20.623). Возвращает запись
     * holo:lastGpuLost или null (нет записи / битая / нет sessionStorage).
     */
    _readLastGpuLost() {
        try {
            if (typeof sessionStorage === 'undefined') return null;
            const raw = sessionStorage.getItem('holo:lastGpuLost');
            if (!raw) return null;
            const last = JSON.parse(raw);
            return (last && typeof last.ts === 'number') ? last : null;
        } catch (e) { return null; }
    }
}

export const hologramWebGPU = new HologramWebGPU();
export default hologramWebGPU;
