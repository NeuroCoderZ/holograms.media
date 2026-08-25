/**
 * InstancedColumns.js — 256 инстанс-столбцов
 * =============================================
 * 2 draw calls: левая сетка (128) + правая сетка (128)
 *
 * 2026-08-08 16:22 MSK — ГОЛОКАДР: 20 480 Б -> 2 048 Б на шине (10x).
 *
 * Было: на каждый кадр в JS (главный поток!) пересобиралась матрица 4x4 на
 * каждый столбец — arrayStride 80 Б x 128 x 2 сетки = 20 КБ. Это работа не
 * для JS и не для CPU: WebGPU существует ровно для того, чтобы такие
 * преобразования делались на GPU, а главный поток занимался только данными.
 * При этом реально меняются лишь ДВЕ величины: глубина (dB SPL) и пан.
 * Ширина, цвет, позиция по Y — константы азбуки из 128 полутонов, они не
 * меняются никогда.
 *
 * Стало (по канону Semitones_Angles.md):
 *   - СТАТИЧЕСКИЙ буфер, пишется ОДИН раз при старте: ширина, цвет, Y;
 *   - ДИНАМИЧЕСКИЙ буфер, пишется каждый кадр: (dB, пан) x 256 голоквантов
 *     в float32 = 2048 байт. Это и есть голокадр на шине;
 *   - матрица модели собирается в ШЕЙДЕРЕ, на GPU.
 *
 * Почему float32, а не упакованные байты: точность здесь бесплатна, а дробный
 * пан несёт ITD (межушную задержку) — огрублять его нельзя. 2048 Б на кадр
 * это 288 КБ/с даже при 144 Гц, то есть ничто.
 * NB: компактные форматы голокадра (512 Б при пане 1 байт, 768 Б при пане
 * 2 байта) относятся к ХРАНЕНИЮ и передаче гологлифа, а не к шине GPU —
 * это разные слои, их нельзя путать.
 *
 * Частота обновления дисплея переменная (24-240 Гц), поэтому экономия на шине
 * масштабируется линейно: чем выше режим, тем больше выигрыш.
 */

import { semitones } from '../config/hologramConfig.js';
import { PAN_CENTER_CELL } from '../config/panStandard.js';

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

        // Vertex buffer
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
                    {
                        // Геометрия куба (общая для всех столбцов)
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                    },
                    {
                        // СТАТИКА (азбука полутонов): width, posY, colorRGB
                        arrayStride: 20,
                        stepMode: 'instance',
                        attributes: [
                            { shaderLocation: 1, offset: 0, format: 'float32' },   // width
                            { shaderLocation: 2, offset: 4, format: 'float32' },   // posY
                            { shaderLocation: 3, offset: 8, format: 'float32x3' }, // color
                        ],
                    },
                    {
                        // ГОЛОКАДР (меняется каждый кадр): depth (dB SPL), pan
                        arrayStride: 8,
                        stepMode: 'instance',
                        attributes: [
                            { shaderLocation: 4, offset: 0, format: 'float32' },  // depth
                            { shaderLocation: 5, offset: 4, format: 'float32' },  // pan
                        ],
                    },
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fsMain',
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    },
                }],
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

        this._initStaticBuffer();
        this._initDynamicBuffers();
    }

    setDemoMode(height) {
        // Демо: одинаковая глубина, пан по центру (0 = стык сеток на оси Y).
        // 2026-08-25 (юзер): демо-режим должен показывать «пирамиду» глубиной
        // в ОДНУ ячейку, прижатую к ДАЛЬНЕЙ стенке, в ПОЛНОЙ яркости.
        // Раньше height=64 давал тёмно-серые столбцы посередине объёма.
        // Глубину 1 ячейка задаёт шейдер через DEMO-флаг? Нет — глубина это и есть
        // height: ставим 1. Прижатие к дальней стенке делает вершинный шейдер
        // (см. HologramWebGPU._buildShaderCode: worldPos.z = FAR_WALL - h*0.5).
        for (let i = 0; i < this.count; i++) {
            this.leftDynamicData[i * 2] = 1;
            this.leftDynamicData[i * 2 + 1] = PAN_CENTER_CELL;
            this.rightDynamicData[i * 2] = 1;
            this.rightDynamicData[i * 2 + 1] = PAN_CENTER_CELL;
        }
        this._uploadDynamic();
    }

    /**
     * СТАТИЧЕСКИЙ буфер — азбука 128 полутонов. Пишется ОДИН раз.
     * На голоквант: ширина (ячейки), позиция Y, цвет RGB = 5 float = 20 байт.
     * Обе сетки читают один и тот же буфер: азбука для них общая, различие
     * несёт только знак пана (см. panStandard.js).
     */
    _initStaticBuffer() {
        const FLOATS_PER_COLUMN = 5;
        const data = new Float32Array(this.count * FLOATS_PER_COLUMN);

        for (let i = 0; i < this.count; i++) {
            const s = semitones[i];
            const base = i * FLOATS_PER_COLUMN;
            data[base + 0] = s.width || 1;  // ширина пучка в ячейках (= ID полутона)
            data[base + 1] = i * 2;         // Y: высота ячейки = 2.0
            data[base + 2] = s.color.r;
            data[base + 3] = s.color.g;
            data[base + 4] = s.color.b;
        }

        this.staticBuffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.staticBuffer, 0, data);
    }

    /**
     * ДИНАМИЧЕСКИЙ буфер — голокадр. Пишется каждый кадр.
     * На голоквант: (dB SPL, пан) = 2 float = 8 байт.
     * Итого 128 x 8 x 2 сетки = 2048 байт на кадр.
     */
    _initDynamicBuffers() {
        const bytes = this.count * 2 * 4; // 2 float32 на столбец

        this.leftDynamicBuffer = this.device.createBuffer({
            size: bytes,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.leftDynamicData = new Float32Array(this.count * 2);

        this.rightDynamicBuffer = this.device.createBuffer({
            size: bytes,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.rightDynamicData = new Float32Array(this.count * 2);

        this.setDemoMode(64);
    }

    _uploadDynamic() {
        this.device.queue.writeBuffer(this.leftDynamicBuffer, 0, this.leftDynamicData);
        this.device.queue.writeBuffer(this.rightDynamicBuffer, 0, this.rightDynamicData);
    }

    update(audioData) {
        if (!audioData || !audioData.levels) return;

        for (let i = 0; i < this.count; i++) {
            const dbL = audioData.levels[i] || 0;
            const dbR = audioData.levels[i + 128] || 0;

            // Глубина столбца (dB SPL) — ДРОБНАЯ, без округления.
            // Термометрический код хранит «докуда залито» — величина непрерывна,
            // как ртуть в термометре. Главное в визуализации — плавная
            // затемнённость поверхности ячеек (яркость линейна по глубине),
            // поэтому дробная высота даёт градацию без ступенек и сохраняет
            // точность, нужную Триа для восстановления звука по голомации.
            // GPU растеризует дробный масштаб штатно — ограничение только clamp.
            const hL = Math.max(1, Math.min(128, dbL));
            const hR = Math.max(1, Math.min(128, dbR));

            // ЯЧЕИСТЫЙ СТАНДАРТ ПАНОРАМЫ (см. js/config/panStandard.js):
            // источник отдаёт ЗНАКОВЫЕ ячейки [-127.0, +127.0], где 0 = ЦЕНТР
            // (стык двух сеток на зелёной оси Y, звук перед слушателем).
            // Значение уже отсчитано ОТ ЦЕНТРА — вычитать ничего не нужно.
            // Ноль означает центр, поэтому `?? 0` — безопасный дефолт.
            const panL = audioData.pans?.[i] ?? PAN_CENTER_CELL;
            const panR = audioData.pans?.[i + 128] ?? PAN_CENTER_CELL;

            const o = i * 2;
            this.leftDynamicData[o] = hL;
            this.leftDynamicData[o + 1] = panL;
            this.rightDynamicData[o] = hR;
            this.rightDynamicData[o + 1] = panR;
        }
        this._uploadDynamic();
    }

    drawLeft(pass) {
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.staticBuffer);
        pass.setVertexBuffer(2, this.leftDynamicBuffer);
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(36, this.count);
    }

    drawRight(pass) {
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.staticBuffer);
        pass.setVertexBuffer(2, this.rightDynamicBuffer);
        pass.setIndexBuffer(this.indexBuffer, 'uint16');
        pass.drawIndexed(36, this.count);
    }
}
