/**
 * EyeLoader.js — v3.1 "XR Eye" (Saccadic Loader)
 * Поведение: влёт из края → центр → саккады → центр → улёт за край.
 * Стиль: frosted glass eyelids, concave pupil, sharp iris.
 */
// Максимальный наклон глаза в boot-саккадах (рад, ~±8°) — огибает радужку под углом взгляда.
const EYE_TILT_MAX = 0.14;
export class EyeLoader {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'eyeLoaderContainer';
        Object.assign(this.container.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            zIndex: '99999', pointerEvents: 'none',
            background: 'transparent', overflow: 'hidden'
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
        this._tilt = 0;          // текущий наклон глаза (рад)
        this._tiltTarget = 0;    // целевой наклон (boot-саккады)
        this.bootControlled = false; // true → bootSequence управляет фазами
        this._centerResolve = null;
        this._exitResolve = null;
        this._saccadeReturnT = null;

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
            backdropFilter: 'blur(var(--glass-blur, 14px)) saturate(var(--glass-saturate, 140%))',
            webkitBackdropFilter: 'blur(var(--glass-blur, 14px)) saturate(var(--glass-saturate, 140%))',
            background: isUpper
                ? 'linear-gradient(to bottom, var(--glass-bg, rgba(255,255,255,0.04)) 60%, rgba(0,0,0,0.5) 100%)'
                : 'linear-gradient(to top,    var(--glass-bg, rgba(255,255,255,0.04)) 60%, rgba(0,0,0,0.5) 100%)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.10))',
            borderRadius: isUpper ? '0 0 12px 12px' : '0 0 12px 12px',
            transition: 'transform 0.9s cubic-bezier(0.19, 1, 0.22, 1)',
            boxShadow: 'none',
            margin: '0',
            padding: '0'
        });
        lid.style.top = isUpper ? '0' : 'auto';
        lid.style.bottom = isUpper ? 'auto' : '0';
        lid.style.transformOrigin = isUpper ? 'top center' : 'bottom center';
        return lid;
    }

    _pickRandomOffscreenPoint(margin) {
        const angle = Math.random() * Math.PI * 2;
        this._entryAngle = angle; // Store for symmetric exit
        const dist = Math.max(this.width, this.height) * 1.5;
        return {
            x: this.cx + Math.cos(angle) * dist,
            y: this.cy + Math.sin(angle) * dist
        };
    }

    _pickSymmetricExitPoint(margin) {
        const angle = (this._entryAngle || 0) + Math.PI; // Exact opposite
        const dist = Math.max(this.width, this.height) * 1.5;
        return {
            x: this.cx + Math.cos(angle) * dist,
            y: this.cy + Math.sin(angle) * dist
        };
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
        const margin = 120;
        const entryPoint = this._pickRandomOffscreenPoint(margin);
        this._startX = entryPoint.x;
        this._startY = entryPoint.y;
        this.eyeX = this._startX;
        this.eyeY = this._startY;
        this._targetX = this.cx;
        this._targetY = this.cy;
        this._flyStartTime = performance.now();
    }

    /** Саккада — вызывается на каждую строку лога (legacy idle-режим). */
    triggerSaccade() {
        if (this.phase !== 'saccade') return;
        this._saccadeIdle();
    }

    /** Idle-саккада: глаз шныряет в пределах радужки, без взгляда на элемент. */
    _saccadeIdle() {
        if (this.phase !== 'saccade') return;
        const rIris = Math.min(this.width, this.height) * 0.15;
        const maxOffsetH = rIris * 3.0;
        const maxOffsetV = rIris * 2.0;
        this._targetX = this.cx + (Math.random() - 0.5) * maxOffsetH;
        this._targetY = this.cy + (Math.random() - 0.5) * maxOffsetV;
        this._tiltTarget = (Math.random() - 0.5) * EYE_TILT_MAX;
    }

    /** Константа idle-режима: глаз шныряет в пределах радужки. */
    saccadeIdle() {
        this._saccadeIdle();
    }

    /**
     * Boot-саккада: глаз смотрит НА проснувшийся элемент (по getBoundingClientRect).
     * Наклон пропорционален вектору взгляда — «огибает радужку» под углом.
     * @param {string} selector — CSS-селектор элемента
     */
    saccadeTo(selector) {
        if (this.phase !== 'saccade') return;
        const el = document.querySelector(selector);
        if (!el) { this._saccadeIdle(); return; }
        const r = el.getBoundingClientRect();
        const tx = r.left + r.width / 2;
        const ty = r.top + r.height / 2;
        // Глаз не уходит за пределы радужки — взгляд «в сторону» элемента.
        const dx = Math.max(-1, Math.min(1, (tx - this.cx) / (this.width / 2)));
        const dy = Math.max(-1, Math.min(1, (ty - this.cy) / (this.height / 2)));
        const rIris = Math.min(this.width, this.height) * 0.15;
        this._targetX = this.cx + dx * rIris * 2.2;
        this._targetY = this.cy + dy * rIris * 1.6;
        // Наклон: ±EYE_TILT_MAX, пропорционально горизонтальному вектору.
        this._tiltTarget = dx * EYE_TILT_MAX;
    }

    /** Boot-режим: центрирование глаза перед выходом. */
    center() {
        return new Promise((resolve) => {
            if (this.phase !== 'saccade') { resolve(); return; }
            this._centerResolve = resolve;
            this._targetX = this.cx;
            this._targetY = this.cy;
            this._tiltTarget = 0;
            this.phase = 'centering';
            // hold 250–350мс перед выстрелом (см. _loop centering)
        });
    }

    /**
     * Boot-режим: выстрел за случайный край.
     * @returns {Promise<string>} edge — 'top'|'bottom'|'left'|'right'
     */
    exit() {
        return new Promise((resolve) => {
            if (this.phase !== 'centering' && this.phase !== 'saccade') {
                resolve(this._exitEdge || 'top');
                return;
            }
            this._exitResolve = resolve;
            // Anticipation: глаз дёргается в противоположную сторону перед броском.
            const edges = ['top', 'bottom', 'left', 'right'];
            const edge = edges[Math.floor(Math.random() * edges.length)];
            this._exitEdge = edge;
            this._beginBootExit(edge);
        });
    }

    _beginBootExit(edge) {
        this.phase = 'fly-out';
        const m = 80;
        let x = this.cx, y = this.cy;
        if (edge === 'top') { y = -m; }
        else if (edge === 'bottom') { y = this.height + m; }
        else if (edge === 'left') { x = -m; }
        else if (edge === 'right') { x = this.width + m; }
        this._startX = this.eyeX;
        this._startY = this.eyeY;
        this._targetX = x;
        this._targetY = y;
        this._flyStartTime = performance.now();
        this._flyDuration = 520; // чуть быстрее обычного (650)
    }

    /**
     * Boot-режим: полностью отключаем авто-завершение по progress.
     * Глаз живёт, пока bootSequence не скажет center()/exit().
     */
    bootControl() {
        this.bootControlled = true;
        this.phase = 'saccade'; // глаз готов к взглядам
        this._tilt = 0;
        this._tiltTarget = 0;
        this._targetX = this.cx;
        this._targetY = this.cy;
    }

    setProgress(p) {
        this.progress = Math.max(0, Math.min(100, p));
        this._maybeFinish();
    }

    /**
     * Завершение возможно только из фазы 'saccade'. Раньше проверка жила прямо
     * в setProgress: если 100% приходили, пока глаз ещё летел ('fly-in'), условие
     * было ложным и больше не перепроверялось — веки не открывались никогда.
     * Теперь та же проверка вызывается и из _loop() при входе в 'saccade'.
     */
    _maybeFinish() {
        // В boot-режиме хореографией управляет bootSequence (center()/exit()),
        // поэтому авто-завершение по progress здесь запрещено.
        if (this.bootControlled) return;
        if (this.progress < 100 || this.phase !== 'saccade') return;

        this._targetX = this.cx;
        this._targetY = this.cy;
        this.phase = 'centering';

        setTimeout(() => {
            if (this.phase === 'centering') {
                this._beginFlyOut();
            }
        }, 250);
    }

    /** Улёт за симметричный край */
    _beginFlyOut() {
        this.phase = 'fly-out';
        const margin = 1200; 
        const exitPoint = this._pickSymmetricExitPoint(margin);
        this._startX = this.eyeX;
        this._startY = this.eyeY;
        this._targetX = exitPoint.x;
        this._targetY = exitPoint.y;
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
            const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
            this.eyeX = this._startX + (this._targetX - this._startX) * e;
            this.eyeY = this._startY + (this._targetY - this._startY) * e;
            this._drawEye(this.eyeX, this.eyeY);
            if (t >= 1) {
                this.eyeX = this.cx;
                this.eyeY = this.cy;
                this._targetX = this.cx;
                this._targetY = this.cy;
                this.phase = 'saccade';
                this._maybeFinish(); // 100% могли прийти ещё во время полёта
            }
        }
        else if (this.phase === 'saccade' || this.phase === 'centering') {
            this.eyeX += (this._targetX - this.eyeX) * 0.25;
            this.eyeY += (this._targetY - this.eyeY) * 0.25;
            // Лерп наклона к цели (boot-саккады); сглаживает «огибание» радужки.
            this._tilt += (this._tiltTarget - this._tilt) * 0.25;
            this._drawEye(this.eyeX, this.eyeY);

            // Boot-режим: center() ждёт ФАКТИЧЕСКОГО прихода в центр без наклона.
            // Без этого промис center() не резолвился никогда → boot вис на await.
            if (this.phase === 'centering' && this._centerResolve) {
                const dist = Math.hypot(this._targetX - this.eyeX, this._targetY - this.eyeY);
                if (dist < 0.5 && Math.abs(this._tilt) < 0.005) {
                    this.eyeX = this._targetX;
                    this.eyeY = this._targetY;
                    this._tilt = 0;
                    const done = this._centerResolve;
                    this._centerResolve = null;
                    done();
                }
            }
        }
        else if (this.phase === 'fly-out') {
            const elapsed = now - this._flyStartTime;
            const t = Math.min(1, elapsed / this._flyDuration);
            const e = t * t * t; // easeInCubic
            this.eyeX = this._startX + (this._targetX - this._startX) * e;
            this.eyeY = this._startY + (this._targetY - this._startY) * e;
            this._drawEye(this.eyeX, this.eyeY);
            if (t >= 1) {
                this.phase = 'done';
                this.canvas.style.display = 'none'; 
                this._openLids();
                setTimeout(() => this._remove(), 1000);
                // Boot-режим: exit() ждёт края, за который глаз реально ушёл.
                if (this._exitResolve) {
                    const done = this._exitResolve;
                    this._exitResolve = null;
                    done(this._exitEdge || 'top');
                }
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
        // УВЕЛИЧЕННЫЙ ГЛАЗ: +15% к базовому размеру
        const R = Math.min(this.width, this.height) * 0.2875; // 0.25 * 1.15 = 0.2875
        const rPupil = R * 0.38;

        ctx.save();
        // Наклон глаза: вращаем весь глаз вокруг его центра (boot-саккады «огибают» радужку).
        if (this._tilt !== 0) {
            ctx.translate(x, y);
            ctx.rotate(this._tilt);
            ctx.translate(-x, -y);
        }

        // --- Внешний ореол (чёрный вместо фиолетового) ---
        const glow = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.6);
        glow.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
        glow.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(x, y, R * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // --- Склера (белок) — чёрный, не серый ---
        const gradScl = ctx.createRadialGradient(x - R * 0.1, y - R * 0.1, 0, x, y, R);
        gradScl.addColorStop(0, '#202020');
        gradScl.addColorStop(0.7, '#151515');
        gradScl.addColorStop(1, '#080808');
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fillStyle = gradScl;
        ctx.fill();

        // --- Радужка (чёткая, без blur, -20% яркость от предыдущего +30%) ---
        const gradIris = ctx.createRadialGradient(x, y, 0, x, y, R * 0.65);
        gradIris.addColorStop(0,    '#9eb2a0');    // Оливково-серый центр (как на фото)
        gradIris.addColorStop(0.3,   '#7da8b8');    // Основной стальной синий
        gradIris.addColorStop(0.7,   '#4e7287');    // Глубокий сине-серый
        gradIris.addColorStop(0.9,   '#2e4a5e');    // Темный край радужки (лимб)
        gradIris.addColorStop(1,     '#1a2835');    // Глубокая тень периметра
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
