/**
 * Engine.js — HoloEngine WebGPU ядро
 * ===================================
 * Минимальный WebGPU движок для голограммы BasilaQ-256.
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

        // ─── Единый источник истины камеры (Three.js больше не участвует) ───
        // Половина вертикального объёма ортокамеры в единицах голограммы.
        // Ширина считается из aspect канваса, поэтому круг остаётся кругом.
        this.ORTHO_HALF_H = 150;   // по вертикали ±150 ед. (128 ячеек + отступ)
        this.ORTHO_CENTER_Y = 130; // центр кадра по Y (голограмма стоит на Y=0..256)

        // Орбита вокруг точки интереса: сферические координаты.
        this.camera = {
            target: [0, 128, 75],  // центр голограммы (внутренняя грань, Протокол 1 метр)
            distance: 300,         // радиус орбиты
            yaw: 0,                // рыскание (рад), 0 = вид строго в +Z
            pitch: 0,              // тангаж (рад), 0 = горизонтальный взгляд
            zoom: 1,               // масштаб ортокамеры (>1 — крупнее)
        };
        this.ORBIT_LIMIT = Math.PI / 2; // ±90° — как в старом Three.js-контуре

        this._aspect = 1;
        this._setupCameras();
    }

    /**
     * Орбита камеры (замена OrbitControls + hologramPivot.rotation).
     * @param {number} dYaw   — приращение рыскания в радианах
     * @param {number} dPitch — приращение тангажа в радианах
     */
    orbit(dYaw, dPitch) {
        const c = this.camera;
        c.yaw = this._clamp(c.yaw + dYaw, -this.ORBIT_LIMIT, this.ORBIT_LIMIT);
        c.pitch = this._clamp(c.pitch + dPitch, -this.ORBIT_LIMIT, this.ORBIT_LIMIT);
        this._updateView();
    }

    /** Абсолютная установка орбиты (для XR-позы и сброса анимацией). */
    setOrbit(yaw, pitch) {
        this.camera.yaw = this._clamp(yaw, -this.ORBIT_LIMIT, this.ORBIT_LIMIT);
        this.camera.pitch = this._clamp(pitch, -this.ORBIT_LIMIT, this.ORBIT_LIMIT);
        this._updateView();
    }

    /**
     * Поза камеры (единый источник истины для всех слоёв).
     * Возвращает позицию «eye» из сферических координат орбиты — то, что
     * должны разделять и нативный рендер, и Three-слои (Holoworld).
     * @returns {{ eye: number[], target: number[] }}
     */
    getCameraPose() {
        const c = this.camera;
        const cosP = Math.cos(c.pitch);
        const eye = [
            c.target[0] + c.distance * cosP * Math.sin(c.yaw),
            c.target[1] + c.distance * Math.sin(c.pitch),
            c.target[2] - c.distance * cosP * Math.cos(c.yaw),
        ];
        return { eye, target: c.target.slice() };
    }

    /** Масштаб ортокамеры (замена pinch-зума hologramPivot.scale). */
    setZoom(zoom) {
        this.camera.zoom = this._clamp(zoom, 0.2, 5.0);
        this._updateProjection();
    }

    /**
     * Приращение масштаба (замена wheel-зума OrbitControls).
     * @param {number} factor — множитель (>1 — приблизить, <1 — отдалить).
     */
    zoomBy(factor) {
        this.setZoom(this.camera.zoom * factor);
    }

    /** Плавный возврат в исходное положение (аналог TWEEN в gestures.js). */
    resetOrbit() {
        this.camera.yaw = 0;
        this.camera.pitch = 0;
        this.camera.zoom = 1;
        this._updateView();
        this._updateProjection();
    }

    _clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
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
        return this.orthoProjection;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    _setupCameras() {
        this._updateProjection();
        this.perspectiveProjection = this._perspective(Math.PI / 4, this._aspect, 0.1, 1000);
        this._updateView();
    }

    /**
     * Ортопроекция с учётом aspect канваса.
     * Раньше объём был жёстко квадратным (300×300) при неквадратном канвасе —
     * голограмма растягивалась по X (замер: aspect 1.803 → круг превращался в овал).
     */
    _updateProjection() {
        const halfH = this.ORTHO_HALF_H / this.camera.zoom;
        const halfW = halfH * this._aspect;
        const cy = this.ORTHO_CENTER_Y;

        this.orthoProjection = this._ortho(
            -halfW, halfW,
            cy - halfH, cy + halfH,
            0.1, 2000
        );
    }

    /** Пересчёт viewMatrix из сферических координат орбиты. */
    _updateView() {
        const c = this.camera;
        const cosP = Math.cos(c.pitch);

        // yaw=0, pitch=0 → камера строго перед голограммой (смотрит в +Z),
        // что повторяет исходный кадр eye=[0,128,0] → target=[0,128,75].
        const eye = this.getCameraPose().eye;

        this.viewMatrix = this._lookAt(eye, c.target, [0, 1, 0]);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const width = Math.max(1, rect.width * dpr);
        const height = Math.max(1, rect.height * dpr);

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this._aspect = width / height;
            this._updateProjection();
            this.perspectiveProjection = this._perspective(Math.PI / 4, this._aspect, 0.1, 1000);
        }
    }

    // --- WebGPU-Compatible Matrix Math (Column-Major) ---

    _ortho(left, right, bottom, top, near, far) {
        const out = new Float32Array(16);
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        
        out[0] = -2 * lr;
        out[5] = -2 * bt;
        out[10] = nf; // WebGPU: 1 / (n - f)
        out[12] = (left + right) * lr;
        out[13] = (top + bottom) * bt;
        out[14] = near * nf; // WebGPU: n / (n - f)
        out[15] = 1;
        return out;
    }

    _perspective(fovy, aspect, near, far) {
        const out = new Float32Array(16);
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        out[0] = f / aspect;
        out[5] = f;
        out[10] = far * nf;
        out[11] = -1;
        out[14] = far * near * nf;
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

export const holoEngine = new HoloEngine(document.getElementById('holo-canvas') || document.createElement('canvas'));
