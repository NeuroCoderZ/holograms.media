/**
 * Engine.js — HoloEngine WebGPU ядро
 * ===================================
 * Минимальный WebGPU движок для голограммы BasilaQ-128.
 * Два режима камеры: ортографическая (базовый) + перспективная (XR).
 */

export class HoloEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.format = 'bgra8unorm';

        this.viewMatrix = new Float32Array(16);
        this.orthoProjection = new Float32Array(16);
        this.perspectiveProjection = new Float32Array(16);

        this._setupCameras();
    }

    async init() {
        if (!navigator.gpu) throw new Error('WebGPU not supported');

        this.adapter = await navigator.gpu.requestAdapter();
        this.device = await this.adapter.requestDevice();
        this.context = this.canvas.getContext('webgpu');

        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied',
        });

        console.log('[HoloEngine] ✅ WebGPU инициализирован');
        console.log(`[HoloEngine] 📷 Camera: eye=[0, 128, 0], target=[0, 128, 75], ortho=[-150, 150, -20, 280]`);
    }

    getCurrentProjection() {
        // Базовый режим — ортография (для Сканера и монитора)
        return this.orthoProjection;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    _setupCameras() {
        // Ортографическая камера — «человеческий» обзор
        // Голограмма: X[-128..128], Y[0..256], Z[75..203]
        // Фокусируемся так, чтобы видеть фронтальный квадрат
        this.orthoProjection = this._ortho(-150, 150, -20, 280, 0.1, 1000);

        // Перспективная камера (XR режим)
        this.perspectiveProjection = this._perspective(Math.PI / 4, 1.6, 0.1, 1000);

        // Взгляд: стоим в центре (0,0,0) на высоте 1.72м (128 ед.), смотрим в метр перед собой (Z=75)
        this.viewMatrix = this._lookAt([0, 128, 0], [0, 128, 75], [0, 1, 0]);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const width = rect.width * dpr;
        const height = rect.height * dpr;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            // Обновляем перспективу при изменении аспекта
            this.perspectiveProjection = this._perspective(Math.PI / 4, width / height, 0.1, 1000);
        }
    }

    // --- Математика матриц (Row-Major для JS, будет Column-Major в WGSL при передаче) ---

    _ortho(left, right, bottom, top, near, far) {
        const out = new Float32Array(16);
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        out[0] = -2 * lr;
        out[5] = -2 * bt;
        out[10] = 2 * nf;
        out[12] = (left + right) * lr;
        out[13] = (top + bottom) * bt;
        out[14] = (far + near) * nf;
        out[15] = 1;
        return out;
    }

    _perspective(fovy, aspect, near, far) {
        const out = new Float32Array(16);
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = (2 * far * near) * nf;
        return out;
    }

    _lookAt(eye, target, up) {
        const out = new Float32Array(16);
        const z = this._normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
        const x = this._normalize(this._cross(up, z));
        const y = this._normalize(this._cross(z, x));

        out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
        out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
        out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
        out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
        out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
        out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
        out[15] = 1;
        return out;
    }

    _cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    _normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
    }
}

// Singleton
export const holoEngine = new HoloEngine(document.getElementById('holo-canvas') || document.createElement('canvas'));
