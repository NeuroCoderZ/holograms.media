/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Версия 2.2: Фазовая анимация с плоскими веками и улетом глаза.
 */

export class EyeLoader {
    constructor() {
        // Контейнер
        this.container = document.createElement('div');
        this.container.id = 'eyeLoaderContainer';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.zIndex = '99999';
        this.container.style.pointerEvents = 'none';
        this.container.style.background = '#000';

        // Канвас для глаза
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '10';
        
        // Веки (Плоские панели)
        this.upperLid = this.createEyelid(true);
        this.lowerLid = this.createEyelid(false);

        this.container.appendChild(this.canvas);
        this.container.appendChild(this.upperLid);
        this.container.appendChild(this.lowerLid);
        
        this.progress = 0;
        this.phase = 'alive'; // alive, return, static, fly, open
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Eye Position State
        this.eyeX = 0;
        this.eyeY = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        // Fly away state
        this.flyDirX = 0;
        this.flyDirY = 0;
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    createEyelid(isUpper) {
        const lid = document.createElement('div');
        lid.style.position = 'absolute';
        lid.style.left = '0';
        lid.style.width = '100%';
        lid.style.height = '50vh';
        lid.style.zIndex = '20';
        
        // Полупрозрачные чёрные веки (без backdrop-filter — глаз виден сквозь них чётко)
        lid.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)';
        
        if (isUpper) {
            lid.style.top = '0';
            lid.style.transformOrigin = 'top';
            lid.style.background = 'linear-gradient(to bottom, rgba(5,5,10,0.85), rgba(10,10,18,0.7))';
            lid.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
            lid.style.background = 'linear-gradient(to top, rgba(5,5,10,0.85), rgba(10,10,18,0.7))';
            lid.style.borderTop = '1px solid rgba(255,255,255,0.08)';
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
        console.log('[EyeLoader] Пробуждение...', 'размер:', this.canvas.width, 'x', this.canvas.height);
        this.phase = 'alive';
        
        this.saccadeInterval = setInterval(() => this.triggerSaccade(), 1500 + Math.random() * 1000);
        this.triggerSaccade();

        requestAnimationFrame(() => this.loop());
    }

    triggerSaccade() {
        if (this.phase !== 'alive') return;
        const range = Math.min(this.width, this.height) * 0.15;
        this.targetX = (Math.random() - 0.5) * range;
        this.targetY = (Math.random() - 0.5) * range;
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 0 && this.progress < 80) {
            this.phase = 'alive';
        } else if (this.progress >= 80 && this.progress < 90) {
            if (this.phase !== 'return') {
                this.phase = 'return';
                this.targetX = 0;
                this.targetY = 0;
            }
        } else if (this.progress >= 90 && this.progress < 96) {
            this.phase = 'static';
            this.eyeX = 0;
            this.eyeY = 0;
        } else if (this.progress >= 96 && this.progress < 100) {
            if (this.phase !== 'fly') {
                this.phase = 'fly';
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.max(this.width, this.height) * 0.12;
                this.flyDirX = Math.cos(angle) * speed;
                this.flyDirY = Math.sin(angle) * speed;
            }
        } else if (this.progress >= 100) {
            this.phase = 'open';
        }
    }

    loop() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        if (this.phase === 'alive') {
            this.eyeX += (this.targetX - this.eyeX) * 0.1;
            this.eyeY += (this.targetY - this.eyeY) * 0.1;
            this.drawEye(centerX + this.eyeX, centerY + this.eyeY, 1.0);
        } 
        else if (this.phase === 'return') {
            this.eyeX += (0 - this.eyeX) * 0.15;
            this.eyeY += (0 - this.eyeY) * 0.15;
            this.drawEye(centerX + this.eyeX, centerY + this.eyeY, 1.0);
        }
        else if (this.phase === 'static') {
            this.drawEye(centerX, centerY, 1.0);
        }
        else if (this.phase === 'fly') {
            this.eyeX += this.flyDirX;
            this.eyeY += this.flyDirY;
            this.drawEye(centerX + this.eyeX, centerY + this.eyeY, 1.0);
        }
        else if (this.phase === 'open') {
            this.upperLid.style.transform = 'translateY(-100%)';
            this.lowerLid.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
                if (this.saccadeInterval) clearInterval(this.saccadeInterval);
            }, 900);
            return;
        }

        requestAnimationFrame(() => this.loop());
    }

    drawEye(x, y, alpha) {
        const rIris = Math.min(this.width, this.height) * 0.2;
        const rPupil = rIris * 0.45;

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- 1. Радужка: "Выдавленное стекло" (Convex) ---
        const gradIris = this.ctx.createRadialGradient(
            x - rIris * 0.3, y - rIris * 0.3, rPupil * 0.5,
            x, y, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradIris.addColorStop(0.3, 'rgba(200, 200, 210, 0.9)');
        gradIris.addColorStop(0.6, 'rgba(120, 120, 130, 0.7)');
        gradIris.addColorStop(0.85, 'rgba(50, 50, 60, 0.5)');
        gradIris.addColorStop(1, 'rgba(25, 25, 35, 0.4)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris;
        this.ctx.fill();

        // Ободок радужки — яркая граница "стекла"
        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // --- 2. Зрачок: "Вдавленное стекло" (Concave) ---
        const gradPupil = this.ctx.createRadialGradient(x, y, 0, x, y, rPupil);
        gradPupil.addColorStop(0, 'rgba(0, 0, 5, 1)');
        gradPupil.addColorStop(0.6, 'rgba(8, 8, 15, 1)');
        gradPupil.addColorStop(0.9, 'rgba(30, 30, 45, 0.95)');
        gradPupil.addColorStop(1, 'rgba(55, 55, 70, 0.9)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = gradPupil;
        this.ctx.fill();

        // Ободок зрачка — тонкая светящаяся граница "вдавленности"
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // --- 3. Блик (Specular) — яркое пятно на выпуклом стекле ---
        this.ctx.beginPath();
        this.ctx.ellipse(
            x - rIris * 0.2, y - rIris * 0.25,
            rPupil * 0.5, rPupil * 0.3,
            -Math.PI / 6, 0, Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fill();

        // Маленький второй блик (контражур)
        this.ctx.beginPath();
        this.ctx.arc(x + rIris * 0.35, y + rIris * 0.3, rPupil * 0.12, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
