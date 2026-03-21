/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Использует полноэкранный Canvas для имитации моргания и движения глаза.
 */

export class EyeLoader {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'fixed';
        this.canvas.style.inset = '0';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.pointerEvents = 'none'; // Позволяет кликать сквозь него, если нужно, но в фазе loading мы перекроем
        
        this.progress = 0;
        this.phase = 'black'; // black, appear, loading, opening, blink_wait, done
        this.startTime = Date.now();
        this.phaseStartTime = Date.now();
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.saccadeX = 0;
        this.saccadeY = 0;
        this.lastSaccadeTime = 0;
        
        this.isUpper = true; // Для отрисовки век
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    start() {
        document.body.appendChild(this.canvas);
        this.phase = 'black';
        this.phaseStartTime = Date.now();
        requestAnimationFrame(() => this.loop());
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 100 && this.phase === 'loading') {
            this.setPhase('opening');
        }
    }

    setPhase(newPhase) {
        this.phase = newPhase;
        this.phaseStartTime = Date.now();
    }

    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

    updateSaccades(now) {
        const elapsed = now - this.phaseStartTime;
        const p = this.progress / 100;
        const interval = Math.max(85, 850 - p * 700);
        
        if (now - this.lastSaccadeTime > interval) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.35 + p * 4.8) * (0.25 + Math.random() * 0.85);
            const dist = speed * (this.width * 0.015); // Ограничение смещения
            
            this.saccadeX = Math.cos(angle) * dist;
            this.saccadeY = Math.sin(angle) * dist;
            
            // Ограничение смещения не более 8.5% от ширины экрана
            const maxOffset = this.width * 0.085;
            this.saccadeX = this.clamp(this.saccadeX, -maxOffset, maxOffset);
            this.saccadeY = this.clamp(this.saccadeY, -maxOffset, maxOffset);
            
            this.lastSaccadeTime = now;
        }
    }

    drawEyelid(isUpper, offsetFrac, curvature) {
        const mid = this.height / 2;
        const edgeY = isUpper ? mid - (this.height * 0.5 * offsetFrac) : mid + (this.height * 0.5 * offsetFrac);
        
        const sag = curvature * (this.height * 0.038);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // Glass BG
        this.ctx.beginPath();
        
        if (isUpper) {
            this.ctx.moveTo(-this.width * 0.1, 0);
            this.ctx.lineTo(this.width * 1.1, 0);
            this.ctx.lineTo(this.width * 1.1, edgeY);
            this.ctx.quadraticCurveTo(this.width / 2, edgeY + sag, -this.width * 0.1, edgeY);
        } else {
            this.ctx.moveTo(-this.width * 0.1, this.height);
            this.ctx.lineTo(this.width * 1.1, this.height);
            this.ctx.lineTo(this.width * 1.1, edgeY);
            this.ctx.quadraticCurveTo(this.width / 2, edgeY - sag, -this.width * 0.1, edgeY);
        }
        
        this.ctx.fill();
        
        // Матовый эффект (blur/saturate имитируется через наложение)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.fill();
    }

    loop() {
        const now = Date.now();
        const elapsedTotal = now - this.startTime;
        const elapsedPhase = now - this.phaseStartTime;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (this.phase === 'black') {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.width, this.height);
            if (elapsedPhase > 200) this.setPhase('appear');
        }
        
        else if (this.phase === 'appear') {
            // Мгновенная материализация стеклянных век
            this.drawEyelid(true, 1, 0);
            this.drawEyelid(false, 1, 0);
            if (elapsedPhase > 60) this.setPhase('loading');
        }
        
        else if (this.phase === 'loading') {
            this.updateSaccades(now);
            
            // Отрисовка век (сомкнуты)
            this.drawEyelid(true, 1, 0);
            this.drawEyelid(false, 1, 0);
            
            // Радужка и зрачок проступают сквозь стекло
            const p = this.progress;
            const irisAlpha = this.clamp((p - 10) / 50, 0, 1);
            
            if (irisAlpha > 0) {
                const centerX = this.width / 2 + this.saccadeX;
                const centerY = this.height / 2 + this.saccadeY;
                const rIris = this.height * 0.40;
                const rPupil = this.height * 0.17;
                
                // Радужка (Выдавленная)
                const gradIris = this.ctx.createRadialGradient(
                    centerX - rIris * 0.3, centerY - rIris * 0.3, rIris * 0.1,
                    centerX, centerY, rIris
                );
                gradIris.addColorStop(0, `rgba(255, 255, 255, ${0.1 * irisAlpha})`);
                gradIris.addColorStop(1, `rgba(0, 0, 0, ${0.3 * irisAlpha})`);
                
                this.ctx.fillStyle = gradIris;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, rIris, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Обводка радужки
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * irisAlpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Зрачок (Вдавленный)
                const gradPupil = this.ctx.createRadialGradient(
                    centerX + rPupil * 0.3, centerY + rPupil * 0.3, rPupil * 0.1,
                    centerX, centerY, rPupil
                );
                gradPupil.addColorStop(0, `rgba(50, 50, 50, ${1 * irisAlpha})`);
                gradPupil.addColorStop(1, `rgba(0, 0, 0, ${1 * irisAlpha})`);
                
                this.ctx.fillStyle = gradPupil;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, rPupil, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Блик зрачка (вдавленность)
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * irisAlpha})`;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, rPupil, 0.25 * Math.PI, 0.75 * Math.PI);
                this.ctx.stroke();
            }
        }
        
        else if (this.phase === 'opening') {
            const t = this.clamp(elapsedPhase / 520, 0, 1);
            const openFrac = this.easeInOut(t);
            const curvature = this.clamp(openFrac * 1.5, 0, 1);
            
            // Веки расходятся
            this.drawEyelid(true, 1 - openFrac * 1.6, curvature);
            this.drawEyelid(false, 1 - openFrac * 1.6, curvature);
            
            // Радужка исчезает
            const irisAlpha = this.clamp(1 - t * 1.4, 0, 1);
            if (irisAlpha > 0) {
                 this.ctx.fillStyle = `rgba(255,255,255, ${0.05 * irisAlpha})`;
                 this.ctx.beginPath();
                 this.ctx.arc(this.width/2, this.height/2, this.height * 0.4, 0, Math.PI*2);
                 this.ctx.fill();
            }
            
            if (t >= 1) this.setPhase('blink_wait');
        }
        
        else if (this.phase === 'blink_wait') {
            if (!this.s1) {
                this.s1 = 30 + Math.random() * 370;
                this.gap = 220 + Math.random() * 200;
                this.s2 = this.s1 + this.gap;
            }
            
            const t = elapsedPhase;
            let closeFrac = 0;
            
            const processBlink = (start) => {
                const bt = t - start;
                if (bt >= 0 && bt < 203) {
                    if (bt < 78) closeFrac = this.easeInOut(bt / 78);
                    else closeFrac = 1 - this.easeOutCubic((bt - 78) / 125);
                }
            };
            
            processBlink(this.s1);
            processBlink(this.s2);
            
            if (closeFrac > 0) {
                this.drawEyelid(true, 1 - closeFrac, 0.2 * closeFrac);
                this.drawEyelid(false, 1 - closeFrac, 0.2 * closeFrac);
                
                // Силуэт радужки при моргании
                const irisAlpha = this.clamp(closeFrac * 0.50, 0, 0.5);
                this.ctx.fillStyle = `rgba(255,255,255, ${0.03 * irisAlpha})`;
                this.ctx.beginPath();
                this.ctx.arc(this.width/2, this.height/2, this.height * 0.4, 0, Math.PI*2);
                this.ctx.fill();
            }
            
            if (t > 1000) this.setPhase('done');
        }
        
        if (this.phase !== 'done') {
            requestAnimationFrame(() => this.loop());
        } else {
            this.canvas.remove();
        }
    }
}
