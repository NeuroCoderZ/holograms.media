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
        
        // СТРОГО прямые веки (no borderRadius)
        if (isUpper) {
            lid.style.top = '-50vh';
        } else {
            lid.style.top = '50vh';
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
        
        // Начальное скрытие UI для "проступания"
        this.uiElements = [
            document.getElementById('left-panel'),
            document.querySelector('.right-panel'),
            document.getElementById('gesture-area'),
            document.getElementById('grid-container')
        ].filter(el => el);
        
        this.uiElements.forEach(el => {
            el.style.opacity = '0';
            el.style.filter = 'blur(20px)';
            el.style.transition = 'opacity 1s ease, filter 1s ease';
        });

        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        requestAnimationFrame(() => this.loop());
    }

    setProgress(p) {
        this.progress = p;
        
        // Проступание элементов UI
        if (this.uiElements && this.uiElements.length > 0) {
            const threshold = 100 / (this.uiElements.length + 1);
            this.uiElements.forEach((el, index) => {
                if (this.progress > (index + 1) * threshold) {
                    el.style.opacity = '1';
                    el.style.filter = 'blur(0px)';
                }
            });
        }

        if (this.progress >= 90 && this.phase === 'loading') {
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
            
            // Пока сомкнуты - маски клипа нет (полный блюр)
            this.upperLid.style.clipPath = 'none';
            this.lowerLid.style.clipPath = 'none';
        }
        
        else if (this.phase === 'opening') {
            const t = this.clamp(elapsedPhase / 600, 0, 1);
            const openFrac = this.easeInOut(t);
            
            const offset = 60 * openFrac;
            this.upperLid.style.transform = `translateY(${-offset}vh)`;
            this.lowerLid.style.transform = `translateY(${offset}vh)`;
            
            // Изоляция радужки через clip-path
            // Нам нужно "вырезать" область глаза из век.
            // clip-path: polygon(...) или path(...)
            const cx = this.width / 2 + this.saccadeX;
            const cy = this.height / 2 + this.saccadeY;
            const rIris = this.height * 0.42; // Чуть больше радужки для запаса
            
            // Вырезаем область глаза (инвертированный круг через polygon с разрезом)
            // Но для DIV панелей проще сделать rect с вырезом
            // clip-path: path(...) поддерживается не везде идеально, используем polygon
            const updateClip = (lid, isUpper) => {
                const lidY = isUpper ? this.height/2 - (this.height * offset/100) : this.height/2 + (this.height * offset/100);
                // Если глаз попадает на панель - вырезаем его
                lid.style.clipPath = `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                    ${(cx - rIris)/this.width * 100}% ${(cy - rIris)/this.height * 100}%,
                    ${(cx - rIris)/this.width * 100}% ${(cy + rIris)/this.height * 100}%,
                    ${(cx + rIris)/this.width * 100}% ${(cy + rIris)/this.height * 100}%,
                    ${(cx + rIris)/this.width * 100}% ${(cy - rIris)/this.height * 100}%,
                    ${(cx - rIris)/this.width * 100}% ${(cy - rIris)/this.height * 100}%
                )`;
            };
            
            // На самом деле, проще использовать CSS mask-image для мягкого перехода
            this.upperLid.style.maskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${rIris}px, black ${rIris + 2}px)`;
            this.lowerLid.style.maskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${rIris}px, black ${rIris + 2}px)`;

            if (t >= 1) {
                // Рандомизация моргания (0, 1 или 2 раза)
                this.blinkCount = Math.floor(Math.random() * 3);
                this.setPhase('blink_wait');
            }
        }
        
        else if (this.phase === 'blink_wait') {
            const t = elapsedPhase;
            let closeFrac = 0;
            
            const blinkDuration = 250;
            const gap = 300;
            
            for (let i = 0; i < this.blinkCount; i++) {
                const start = 100 + i * (blinkDuration + gap);
                const bt = t - start;
                if (bt >= 0 && bt < blinkDuration) {
                    if (bt < 100) closeFrac = this.easeInOut(bt / 100);
                    else closeFrac = 1 - this.easeOutCubic((bt - 100) / 150);
                }
            }
            
            if (closeFrac > 0) {
                this.upperLid.style.transform = `translateY(${-60 * (1 - closeFrac)}vh)`;
                this.lowerLid.style.transform = `translateY(${60 * (1 - closeFrac)}vh)`;
            }
            
            if (t > 100 + this.blinkCount * (blinkDuration + gap) + 500) this.setPhase('done');
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

        // Динамический свет относительно центра экрана + мышь
        const centerLightX = this.width / 2;
        const centerLightY = this.height / 2;
        
        const mX = this.mouseX || centerLightX;
        const mY = this.mouseY || centerLightY;

        // Эффект "массивности": большие смещения для теней (10x)
        const offX = (cx - centerLightX) / 2 + (cx - mX) / 10;
        const offY = (cy - centerLightY) / 2 + (cy - mY) / 10;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // 1. Радужка (Сильно выпуклая)
        // Внешняя тень радужки для глубины
        this.ctx.shadowBlur = 40;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowOffsetX = offX / 2;
        this.ctx.shadowOffsetY = offY / 2;

        const gradIris = this.ctx.createRadialGradient(
            cx - offX, cy - offY, rIris * 0.05,
            cx, cy, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // Ярче блик
        gradIris.addColorStop(0.4, 'rgba(150, 150, 150, 0.1)');
        gradIris.addColorStop(1, 'rgba(0, 0, 0, 0.6)'); // Глубже тени
        
        this.ctx.fillStyle = gradIris;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rIris, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 2. Зрачок (Сильно вдавленный)
        this.ctx.shadowBlur = 0; // Сброс тени
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        const gradPupil = this.ctx.createRadialGradient(
            cx + offX * 1.5, cy + offY * 1.5, rPupil * 0.05,
            cx, cy, rPupil
        );
        gradPupil.addColorStop(0, '#000'); // Чернее черного
        gradPupil.addColorStop(1, '#1a1a1a'); // Глубокий градиент
        
        this.ctx.fillStyle = gradPupil;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Массивные блики/тени на изгибах (10x шире)
        this.ctx.lineWidth = 15; // В 10-15 раз шире
        this.ctx.lineCap = 'round';
        
        // Верхний светлый ободок (выпуклость радужки)
        const irisGlow = this.ctx.createLinearGradient(cx, cy - rIris, cx, cy);
        irisGlow.addColorStop(0, `rgba(255, 255, 255, ${0.15 * alpha})`);
        irisGlow.addColorStop(1, 'transparent');
        this.ctx.strokeStyle = irisGlow;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rIris - 7, -Math.PI * 0.8, -Math.PI * 0.2);
        this.ctx.stroke();

        // Ободок зрачка (вдавленность)
        const pupilRim = this.ctx.createLinearGradient(cx, cy, cx, cy + rPupil);
        pupilRim.addColorStop(0, 'transparent');
        pupilRim.addColorStop(1, `rgba(255, 255, 255, ${0.2 * alpha})`);
        this.ctx.strokeStyle = pupilRim;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil + 7, Math.PI * 0.2, Math.PI * 0.8);
        this.ctx.stroke();

        // Тень от верхнего края зрачка (усиливает вдавленность)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil + 5, -Math.PI * 0.8, -Math.PI * 0.2);
        this.ctx.stroke();

        this.ctx.restore();
    }
}
