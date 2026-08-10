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

    /**
     * Шаг 5: Нативный picking (замена THREE.Raycaster).
     * Координаты канваса (px) → мировые координаты на плоскости голограммы.
     *
     * Для ортокамеры строим луч через NDC (near → far), инвертируем matrix
     * (projection × view), пересекаем с плоскостью Z = camera.target[2]
     * (фронтальная грань голограммы). Возвращает мировую точку или null.
     *
     * @param {number} clientX — X в пикселях относительно канваса
     * @param {number} clientY — Y в пикселях относительно канваса
     * @returns {{x:number,y:number,z:number}|null}
     */
    pickFromNDC(clientX, clientY) {
        if (!this.canvas || !this.canvas.width) return null;

        // NDC: ортокамера смотрит в -Z, поэтому Y переворачиваем (canvas origin top-left).
        const halfW = this.canvas.width / 2;
        const halfH = this.canvas.height / 2;
        const ndcX = (clientX - halfW) / halfW;
        const ndcY = (halfH - clientY) / halfH;

        // Две точки луча в NDC-пространстве (z=-1 near, z=+1 far).
        const nearNd = [ndcX, ndcY, -1, 1];
        const farNd  = [ndcX, ndcY,  1, 1];

        // inv(VP) = inv(V) * inv(P). Соберём вручную: invertProjection × invertView.
        const invProj = this._invert4(this.orthoProjection);
        const invView = this._invert4(this.viewMatrix);
        const nearWorld = this._transformPoint(invView, this._transformPoint(invProj, nearNd));
        const farWorld  = this._transformPoint(invView, this._transformPoint(invProj, farNd));

        // Пересечение луча (near→far) с плоскостью Z = camera.target[2].
        const zPlane = this.camera.target[2];
        const dz = farWorld[2] - nearWorld[2];
        if (!dz) return null;

        const t = (zPlane - nearWorld[2]) / dz;
        if (t < 0 || t > 1) return null;

        return {
            x: nearWorld[0] + (farWorld[0] - nearWorld[0]) * t,
            y: nearWorld[1] + (farWorld[1] - nearWorld[1]) * t,
            z: zPlane,
        };
    }

    /** Обращение матрицы 4×4 (column-major), возвращает Float32Array или null. */
    _invert4(m) {
        const a00=m[0],a01=m[1],a02=m[2],a03=m[3];
        const a10=m[4],a11=m[5],a12=m[6],a13=m[7];
        const a20=m[8],a21=m[9],a22=m[10],a23=m[11];
        const a30=m[12],a31=m[13],a32=m[14],a33=m[15];

        const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
        const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
        const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
        const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;

        let det = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
        if (!det) return null;
        det = 1 / det;

        return new Float32Array([
            (a11*b11 - a12*b10 + a13*b09)*det,
            (a02*b10 - a01*b11 - a03*b09)*det,
            (a31*b05 - a32*b04 + a33*b03)*det,
            (a22*b04 - a21*b05 - a23*b03)*det,
            (a12*b08 - a10*b11 - a13*b07)*det,
            (a00*b11 - a02*b08 + a03*b07)*det,
            (a32*b02 - a30*b05 - a33*b01)*det,
            (a20*b05 - a22*b02 + a23*b01)*det,
            (a10*b10 - a11*b08 + a13*b06)*det,
            (a01*b08 - a00*b10 - a03*b06)*det,
            (a30*b04 - a31*b02 + a33*b00)*det,
            (a21*b02 - a20*b04 - a23*b00)*det,
            (a11*b07 - a10*b09 - a12*b06)*det,
            (a00*b09 - a01*b07 + a02*b06)*det,
            (a31*b01 - a30*b03 - a32*b00)*det,
            (a20*b03 - a21*b01 + a22*b00)*det,
        ]);
    }

    /** Умножить матрицу 4×4 на точку (xyz + w=1), вернуть [x,y,z]. */
    _transformPoint(mat, p) {
        const x = mat[0]*p[0] + mat[4]*p[1] + mat[8]*p[2]  + mat[12]*p[3];
        const y = mat[1]*p[0] + mat[5]*p[1] + mat[9]*p[2]  + mat[13]*p[3];
        const z = mat[2]*p[0] + mat[6]*p[1] + mat[10]*p[2] + mat[14]*p[3];
        const w = mat[3]*p[0] + mat[7]*p[1] + mat[11]*p[2] + mat[15]*p[3];
        return w !== 0 ? [x / w, y / w, z / w] : [x, y, z];
    }

    _clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    async init() {
        if (!navigator.gpu) throw new Error('WebGPU не поддерживается этим браузером');

        // requestAdapter() возвращает null, когда GPU не подходит (нет драйвера,
        // софт-рендер, блокировка в about:gpu). Раньше следующая строка сразу дёргала
        // .requestDevice() и падала с «Cannot read properties of null».
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            this.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' })
                        || await navigator.gpu.requestAdapter({ forceFallbackAdapter: true });
        }
        if (!this.adapter) {
            throw new Error('WebGPU-адаптер недоступен: GPU заблокирован или нет драйвера (проверь chrome://gpu)');
        }

        this.device = await this.adapter.requestDevice();

        this.context = this.canvas.getContext('webgpu');
        if (!this.context) throw new Error('Канвас не отдал webgpu-контекст');

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
