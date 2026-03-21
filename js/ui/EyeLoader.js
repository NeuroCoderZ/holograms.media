/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Использует DIV-веки с матовым эффектом и Canvas для динамического зрачка.
 */

export class EyeLoader {
    constructor() {
        // Контейнер
        this.container = document.createElement('div');
        this.container.id = 'eyeLoaderContainer';
        this.container.style.position = 'fixed';
        this.container.style.inset = '0';
        this.container.style.zIndex = '10000';
        this.container.style.pointerEvents = 'none';

        // Канвас для глаза
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
        this.canvas.style.zIndex = '10';
        
        // Веки (Стеклянные панели)
        this.upperLid = this.createEyelid(true);
        this.lowerLid = this.createEyelid(false);

        this.container.appendChild(this.canvas);
        this.container.appendChild(this.upperLid);
        this.container.appendChild(this.lowerLid);
        
        this.progress = 0;
        this.phase = 'black'; // black, appear, loading, opening, blink_wait, done
        this.startTime = Date.now();
        this.phaseStartTime = Date.now();
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.saccadeX = 0;
        this.saccadeY = 0;
        this.lastSaccadeTime = 0;
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    createEyelid(isUpper) {
        const lid = document.createElement('div');
        lid.style.position = 'absolute';
        lid.style.left = '-10vw';
        lid.style.width = '120vw';
        lid.style.height = '100vh';
        lid.style.zIndex = '20';
        lid.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        lid.style.backdropFilter = 'blur(var(--glass-blur, 25px)) saturate(var(--glass-saturate, 180%))';
        lid.style.webkitBackdropFilter = 'blur(var(--glass-blur, 25px)) saturate(var(--glass-saturate, 180%))';
        lid.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        lid.style.transition = 'transform 0.05s linear';
        
        if (isUpper) {
            lid.style.top = '-50vh';
            lid.style.borderRadius = '0 0 50% 50% / 0 0 15% 15%';
        } else {
            lid.style.top = '50vh';
            lid.style.borderRadius = '50% 50% 0 0 / 15% 15% 0 0';
        }
        return lid;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    start() {
        document.body.appendChild(this.container);
        this.phase = 'black';
        this.phaseStartTime = Date.now();
        requestAnimationFrame(() => this.loop());
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 90 && this.phase === 'loading') {
            // Центрирование начинается при 90%
            this.returningToCenter = true;
            this.centerStartTime = Date.now();
        }
        if (this.progress >= 100 && this.phase === 'loading') {
            this.setPhase('opening');
        }
    }

    setPhase(newPhase) {
        this.phase = newPhase;
        this.phaseStartTime = Date.now();
    }

    triggerSaccade() {
        if (this.phase !== 'loading' || this.returningToCenter) return;
        
        const p = this.progress / 100;
        const angle = Math.random() * Math.PI * 2;
        const dist = (0.35 + p * 5) * (this.width * 0.012);
        
        this.saccadeX = Math.cos(angle) * dist;
        this.saccadeY = Math.sin(angle) * dist;
        this.lastSaccadeTime = Date.now();
    }

    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

    loop() {
        const now = Date.now();
        const elapsedPhase = now - this.phaseStartTime;
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (this.phase === 'black') {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.width, this.height);
            if (now - this.startTime > 200) this.setPhase('appear');
        }
        
        else if (this.phase === 'appear') {
            this.upperLid.style.transform = 'translateY(0vh)';
            this.lowerLid.style.transform = 'translateY(0vh)';
            if (elapsedPhase > 60) this.setPhase('loading');
        }
        
        else if (this.phase === 'loading') {
            if (this.returningToCenter) {
                const t = Math.min((now - this.centerStartTime) / 400, 1);
                this.saccadeX *= (1 - t);
                this.saccadeY *= (1 - t);
            }

            const irisAlpha = this.clamp((this.progress - 5) / 50, 0, 1);
            if (irisAlpha > 0) {
                this.drawEye(irisAlpha);
            }
        }
        
        else if (this.phase === 'opening') {
            const t = this.clamp(elapsedPhase / 600, 0, 1);
            const openFrac = this.easeInOut(t);
            
            this.upperLid.style.transform = `translateY(${-60 * openFrac}vh)`;
            this.lowerLid.style.transform = `translateY(${60 * openFrac}vh)`;
            
            if (t >= 1) this.setPhase('blink_wait');
        }
        
        else if (this.phase === 'blink_wait') {
            if (!this.s1) {
                this.s1 = 100;
                this.gap = 300;
                this.s2 = this.s1 + this.gap;
            }
            
            const t = elapsedPhase;
            let closeFrac = 0;
            
            const processBlink = (start) => {
                const bt = t - start;
                if (bt >= 0 && bt < 250) {
                    if (bt < 100) closeFrac = this.easeInOut(bt / 100);
                    else closeFrac = 1 - this.easeOutCubic((bt - 100) / 150);
                }
            };
            
            processBlink(this.s1);
            processBlink(this.s2);
            
            if (closeFrac > 0) {
                this.upperLid.style.transform = `translateY(${-60 * (1 - closeFrac)}vh)`;
                this.lowerLid.style.transform = `translateY(${60 * (1 - closeFrac)}vh)`;
            }
            
            if (t > 1200) this.setPhase('done');
        }
        
        if (this.phase !== 'done') {
            requestAnimationFrame(() => this.loop());
        } else {
            this.container.remove();
        }
    }

    drawEye(alpha) {
        const cx = this.width / 2 + this.saccadeX;
        const cy = this.height / 2 + this.saccadeY;
        const rIris = this.height * 0.4;
        const rPupil = this.height * 0.16;

        // Динамический свет относительно центра экрана
        const offX = (cx - this.width / 2) / 20;
        const offY = (cy - this.height / 2) / 20;

        // Радужка (Выпуклая)
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const gradIris = this.ctx.createRadialGradient(
            cx - offX, cy - offY, rIris * 0.1,
            cx, cy, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        gradIris.addColorStop(0.5, 'rgba(100, 100, 100, 0.05)');
        gradIris.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        this.ctx.fillStyle = gradIris;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rIris, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Зрачок (Вдавленный)
        const gradPupil = this.ctx.createRadialGradient(
            cx + offX * 2, cy + offY * 2, rPupil * 0.1,
            cx, cy, rPupil
        );
        gradPupil.addColorStop(0, 'black');
        gradPupil.addColorStop(1, '#111');
        
        this.ctx.fillStyle = gradPupil;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil, 0, Math.PI * 2);
        this.ctx.fill();

        // Тени/Блики для объема
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * alpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil, Math.PI, 0); // Верхняя дуга (вдавленность)
        this.ctx.stroke();

        this.ctx.restore();
    }
}
