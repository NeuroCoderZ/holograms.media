/**
 * EyeLoader.js — v3.0 "XR Eye" (Saccadic Loader)
 * Поведение: влёт из края → центр → саккады → центр → улёт за край.
 * Стиль: frosted glass eyelids, concave pupil, sharp iris.
 */
export class EyeLoader {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'eyeLoaderContainer';
        Object.assign(this.container.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            zIndex: '99999', pointerEvents: 'none',
            background: '#000', overflow: 'hidden'
        });

        // Canvas для глаза
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        Object.assign(this.canvas.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%', zIndex: '10'
        });

        // Верхнее веко — frosted glass, без border
        this.upperLid = this._makeLid(true);
        // Нижнее веко — frosted glass, без border
        this.lowerLid = this._makeLid(false);

        this.container.appendChild(this.canvas);
        this.container.appendChild(this.upperLid);
        this.container.appendChild(this.lowerLid);

        // Состояние
        this.progress = 0;
        this.phase = 'fly-in'; // fly-in | saccade | fly-out | done
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cx = this.width / 2;  // центр X
        this.cy = this.height / 2; // центр Y
        this.eyeX = this.cx;
        this.eyeY = this.cy;
        this._targetX = this.cx;
        this._targetY = this.cy;
        this._startX = this.cx;
        this._startY = this.cy;
        this._flyT = 0;       // прогресс fly-in/fly-out [0..1]
        this._flyDuration = 800; // мс
        this._flyStartTime = 0;
        this._exitEdge = null;
        this._rafId = null;
        this._lidOpen = 0; // 0 = закрыты, 1 = открыты

        window.addEventListener('resize', () => this._resize());
        this._resize();
    }

    _makeLid(isUpper) {
        const lid = document.createElement('div');
        Object.assign(lid.style, {
            position: 'absolute',
            left: '0',
            width: '100%',
            height: '50%',
            zIndex: '20',
            backdropFilter: 'blur(20px)',
            webkitBackdropFilter: 'blur(20px)',
            background: isUpper
                ? 'linear-gradient(to bottom, rgba(8,8,18,0.97) 60%, rgba(12,12,28,0.6) 100%)'
                : 'linear-gradient(to top,    rgba(8,8,18,0.97) 60%, rgba(12,12,28,0.6) 100%)',
            transition: 'transform 0.85s cubic-bezier(0.77, 0, 0.175, 1)',
            // Нет border — интеграция через blur
            border: 'none',
            boxShadow: 'none',
        });
        lid.style.top = isUpper ? '0' : 'auto';
        lid.style.bottom = isUpper ? 'auto' : '0';
        lid.style.transformOrigin = isUpper ? 'top center' : 'bottom center';
        return lid;
    }

    _resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    /** Точка входа */
    start() {
        if (this.container.parentNode) return;
        document.body.appendChild(this.container);
        this._beginFlyIn();
        this._loop();
    }

    /** Прилёт из случайного края в центр */
    _beginFlyIn() {
        this.phase = 'fly-in';
        const edge = Math.floor(Math.random() * 4);
        const margin = 80;
        switch (edge) {
            case 0: this._startX = Math.random() * this.width; this._startY = -margin; break;
            case 1: this._startX = this.width + margin;        this._startY = Math.random() * this.height; break;
            case 2: this._startX = Math.random() * this.width; this._startY = this.height + margin; break;
            case 3: this._startX = -margin;                    this._startY = Math.random() * this.height; break;
        }
        this.eyeX = this._startX;
        this.eyeY = this._startY;
        this._targetX = this.cx;
        this._targetY = this.cy;
        this._flyStartTime = performance.now();
    }

    /** Саккада — вызывается на каждую строку лога */
    triggerSaccade() {
        if (this.phase !== 'saccade') return;
        const rIris = Math.min(this.width, this.height) * 0.15;
        const maxOffset = rIris * 2.5;
        // Резкий прыжок — без easing, мгновенная смена target
        this._targetX = this.cx + (Math.random() - 0.5) * maxOffset * 2;
        this._targetY = this.cy + (Math.random() - 0.5) * maxOffset * 2;
        // После паузы — возврат к центру
        clearTimeout(this._saccadeReturnTimer);
        this._saccadeReturnTimer = setTimeout(() => {
            this._targetX = this.cx;
            this._targetY = this.cy;
        }, 120);
    }

    setProgress(p) {
        this.progress = Math.max(0, Math.min(100, p));
        if (this.progress >= 95 && this.phase === 'saccade') {
            // Возврат в центр перед улётом
            this._targetX = this.cx;
            this._targetY = this.cy;
        }
        if (this.progress >= 100 && this.phase !== 'fly-out' && this.phase !== 'done') {
            this._beginFlyOut();
        }
    }

    /** Улёт за случайный край */
    _beginFlyOut() {
        this.phase = 'fly-out';
        const edge = Math.floor(Math.random() * 4);
        const margin = 350; // Увеличен, чтобы глаз 100% покинул экран
        let exitX, exitY;
        switch (edge) {
            case 0: exitX = Math.random() * this.width; exitY = -margin; break;
            case 1: exitX = this.width + margin;        exitY = Math.random() * this.height; break;
            case 2: exitX = Math.random() * this.width; exitY = this.height + margin; break;
            case 3: exitX = -margin;                    exitY = Math.random() * this.height; break;
        }
        this._startX = this.eyeX;
        this._startY = this.eyeY;
        this._targetX = exitX;
        this._targetY = exitY;
        this._flyStartTime = performance.now();
    }

    _easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    _loop() {
        const now = performance.now();
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.phase === 'fly-in') {
            const elapsed = now - this._flyStartTime;
            const t = Math.min(1, elapsed / this._flyDuration);
            const e = this._easeInOut(t);
            this.eyeX = this._startX + (this._targetX - this._startX) * e;
            this.eyeY = this._startY + (this._targetY - this._startY) * e;
            this._drawEye(this.eyeX, this.eyeY);
            if (t >= 1) {
                this.eyeX = this.cx;
                this.eyeY = this.cy;
                this._targetX = this.cx;
                this._targetY = this.cy;
                this.phase = 'saccade';
            }
        }
        else if (this.phase === 'saccade') {
            // Инерционное движение к target (для возврата), моментальное для прыжков
            this.eyeX += (this._targetX - this.eyeX) * 0.25;
            this.eyeY += (this._targetY - this.eyeY) * 0.25;
            this._drawEye(this.eyeX, this.eyeY);
        }
        else if (this.phase === 'fly-out') {
            const elapsed = now - this._flyStartTime;
            const t = Math.min(1, elapsed / this._flyDuration);
            // Ease-in для ускоряющегося улёта
            const e = t * t;
            this.eyeX = this._startX + (this._targetX - this._startX) * e;
            this.eyeY = this._startY + (this._targetY - this._startY) * e;
            this._drawEye(this.eyeX, this.eyeY);
            if (t >= 1) {
                this.phase = 'done';
                this.canvas.style.display = 'none'; // Полностью скрываем canvas
                this._openLids();
                setTimeout(() => this._remove(), 950);
                return;
            }
        }
        else if (this.phase === 'done') {
            return;
        }

        this._rafId = requestAnimationFrame(() => this._loop());
    }

    _drawEye(x, y) {
        const ctx = this.ctx;
        const R = Math.min(this.width, this.height) * 0.15; // Большой глаз
        const rPupil = R * 0.38;

        ctx.save();

        // --- Внешний ореол (glass extrusion effect) ---
        const glow = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.6);
        glow.addColorStop(0, 'rgba(130, 100, 255, 0.18)');
        glow.addColorStop(0.5, 'rgba(80, 60, 180, 0.07)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(x, y, R * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // --- Склера (белок) ---
        const gradScl = ctx.createRadialGradient(x - R * 0.1, y - R * 0.1, 0, x, y, R);
        gradScl.addColorStop(0, '#e8e8f8');
        gradScl.addColorStop(0.7, '#c0c0e0');
        gradScl.addColorStop(1, '#5050a0');
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fillStyle = gradScl;
        ctx.fill();

        // --- Радужка (чёткая, без blur) ---
        const gradIris = ctx.createRadialGradient(x, y, 0, x, y, R * 0.65);
        gradIris.addColorStop(0,    '#6060ff');
        gradIris.addColorStop(0.15, '#4040cc');
        gradIris.addColorStop(0.55, '#2020aa');
        gradIris.addColorStop(0.85, '#101080');
        gradIris.addColorStop(1,    '#080840');
        ctx.beginPath();
        ctx.arc(x, y, R * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = gradIris;
        ctx.fill();

        // --- Текстура радужки (лучи без blur) ---
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.3;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * rPupil * 1.1, y + Math.sin(a) * rPupil * 1.1);
            ctx.lineTo(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62);
            ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
        ctx.restore();

        // --- Зрачок (вогнутый — concave через тёмный радиальный градиент) ---
        const gradPupil = ctx.createRadialGradient(
            x + rPupil * 0.15, y + rPupil * 0.15, 0,  // оффсет = иллюзия вдавленности
            x, y, rPupil
        );
        gradPupil.addColorStop(0,    '#1a1a2e');
        gradPupil.addColorStop(0.35, '#0a0a18');
        gradPupil.addColorStop(0.7,  '#050510');
        gradPupil.addColorStop(1,    '#000008');
        ctx.beginPath();
        ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        ctx.fillStyle = gradPupil;
        ctx.fill();

        // Внутренний светлый ободок зрачка (усиливает concave)
        const rimGrad = ctx.createRadialGradient(x, y, rPupil * 0.85, x, y, rPupil);
        rimGrad.addColorStop(0, 'rgba(0,0,40,0)');
        rimGrad.addColorStop(1, 'rgba(60,60,120,0.4)');
        ctx.beginPath();
        ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();

        // --- Блик (specular highlight) ---
        const highlightX = x - R * 0.28;
        const highlightY = y - R * 0.3;
        const gradHL = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, rPupil * 0.55);
        gradHL.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        gradHL.addColorStop(0.4, 'rgba(220, 220, 255, 0.45)');
        gradHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, rPupil * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = gradHL;
        ctx.fill();

        // --- Внешний ring (glass extrusion border) ---
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(160, 130, 255, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
    }

    _openLids() {
        // Скрываем canvas МГНОВЕННО до начала анимации век
        this.canvas.style.display = 'none';
        // Небольшая задержка чтобы display:none применился до CSS transition
        requestAnimationFrame(() => {
            this.upperLid.style.transform = 'scaleY(0)';
            this.lowerLid.style.transform = 'scaleY(0)';
        });
    }

    _remove() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }
}
