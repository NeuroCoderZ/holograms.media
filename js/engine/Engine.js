/**
 * Engine.js — HoloEngine WebGPU ядро
 * ===================================
 * Минимальный WebGPU движок для голограммы BasilaQ-128.
 * Два режима камеры: ортографическая (базовый) + перспективная (XR).
 */

export class HoloEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.device = null;
        this.context = null;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.isXRMode = false;

        // Камеры
        this.orthoProjection = null;
        this.perspectiveProjection = null;
        this.viewMatrix = null;
    }

    async init() {
        if (!navigator.gpu) {
            throw new Error('WebGPU не поддерживается. Используйте Chrome 113+, Edge 113+, Firefox 141+, Safari 16.4+');
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error('Не удалось получить WebGPU адаптер');
        }

        this.device = await adapter.requestDevice();

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied',
        });

        this.resize();
        this._setupCameras();

        console.log('[HoloEngine] ✅ WebGPU инициализирован');
        console.log('[HoloEngine] 📷 Camera: eye=[0, -64, 160], target=[0, -64, 0], ortho=[-140,140,-140,10]');
        return this;
    }

    _setupCameras() {
        // Ортографическая камера
        // Столбцы: X от -64 до +64 (самый широкий C0 width=128)
        // Y от -64 до +63 (view space)
        this.orthoProjection = this._ortho(-70, 70, -70, 70, 0.1, 300);

        // Перспективная камера (XR режим)
        this.perspectiveProjection = this._perspective(Math.PI / 4, 1.6, 0.1, 300);

        // Позиция камеры
        this.viewMatrix = this._lookAt([0, -64, 160], [0, -64, 0], [0, 1, 0]);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.clientWidth * dpr;
        const height = this.canvas.clientHeight * dpr;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        if (this.context) {
            this.context.configure({
                device: this.device,
                format: this.format,
                alphaMode: 'premultiplied',
            });
        }
    }

    setXRMode(enabled) {
        this.isXRMode = enabled;
    }

    getCurrentProjection() {
        return this.isXRMode ? this.perspectiveProjection : this.orthoProjection;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    // ─── Матрицы ─────────────────────────────────────────────────

    _ortho(left, right, bottom, top, near, far) {
        const w = right - left;
        const h = top - bottom;
        const nf = 1.0 / (near - far); // WebGPU: z → [0, 1]
        // WGSL column-major + WebGPU NDC z ∈ [0,1]
        return new Float32Array([
            2/w, 0, 0, -(left+right)/w,
            0, 2/h, 0, -(top+bottom)/h,
            0, 0, nf, near * nf,  // ← WebGPU z-range [0,1]
            0, 0, 0, 1,
        ]);
    }

    _perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        // WGSL column-major
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * nf, 2 * near * far * nf,
            0, 0, -1, 0,
        ]);
    }

    _lookAt(eye, center, up) {
        const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
        let len = 1 / Math.sqrt(zx*zx + zy*zy + zz*zz);
        const z = [zx*len, zy*len, zz*len];

        const xx = up[1]*z[2] - up[2]*z[1], xy = up[2]*z[0] - up[0]*z[2], xz = up[0]*z[1] - up[1]*z[0];
        len = 1 / Math.sqrt(xx*xx + xy*xy + xz*xz);
        const x = [xx*len, xy*len, xz*len];

        const y = [z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]];

        // WGSL column-major (транспонированная OpenGL матрица)
        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),
            -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),
            -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),
            1,
        ]);
    }
}

// Singleton
export const holoEngine = new HoloEngine(document.getElementById('holo-canvas') || document.createElement('canvas'));
