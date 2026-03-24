/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Версия 2.3: Повышенная яркость и контрастность для видимости на черном фоне.
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
        this.phase = 'alive'; 
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.eyeX = 0;
        this.eyeY = 0;
        this.targetX = 0;
        this.targetY = 0;
        
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
        lid.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)';
        
        // Полупрозрачные чёрные веки
        if (isUpper) {
            lid.style.top = '0';
            lid.style.transformOrigin = 'top';
            lid.style.background = 'linear-gradient(to bottom, rgba(5,5,10,0.9), rgba(15,15,25,0.75))';
            lid.style.borderBottom = '1px solid rgba(255,255,255,0.12)';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
            lid.style.background = 'linear-gradient(to top, rgba(5,5,10,0.9), rgba(15,15,25,0.75))';
            lid.style.borderTop = '1px solid rgba(255,255,255,0.12)';
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
        console.log('[EyeLoader] Start animation loop');
        this.phase = 'alive';
        this.saccadeInterval = setInterval(() => this.triggerSaccade(), 1200 + Math.random() * 800);
        requestAnimationFrame(() => this.loop());
    }

    triggerSaccade() {
        if (this.phase !== 'alive') return;
        const range = Math.min(this.width, this.height) * 0.18;
        this.targetX = (Math.random() - 0.5) * range;
        this.targetY = (Math.random() - 0.5) * range;
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 0 && this.progress < 80) {
            this.phase = 'alive';
        } else if (this.progress >= 80 && this.progress < 90) {
            this.phase = 'return';
            this.targetX = 0;
            this.targetY = 0;
        } else if (this.progress >= 90 && this.progress < 96) {
            this.phase = 'static';
            this.eyeX = 0;
            this.eyeY = 0;
        } else if (this.progress >= 96 && this.progress < 100) {
            if (this.phase !== 'fly') {
                this.phase = 'fly';
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.max(this.width, this.height) * 0.15;
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

        if (this.phase === 'alive' || this.phase === 'return' || this.phase === 'static' || this.phase === 'fly') {
            const ease = this.phase === 'return' ? 0.15 : 0.1;
            this.eyeX += (this.targetX - this.eyeX) * ease;
            this.eyeY += (this.targetY - this.eyeY) * ease;
            
            if (this.phase === 'fly') {
                this.eyeX += this.flyDirX;
                this.eyeY += this.flyDirY;
            }
            
            this.drawEye(centerX + this.eyeX, centerY + this.eyeY, 1.0);
            requestAnimationFrame(() => this.loop());
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
        }
    }

    drawEye(x, y, alpha) {
        const rIris = Math.min(this.width, this.height) * 0.22;
        const rPupil = rIris * 0.42;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // --- 1. Радужка: Гипер-яркое стекло ---
        const gradIris = this.ctx.createRadialGradient(
            x - rIris * 0.35, y - rIris * 0.35, rPupil * 0.2,
            x, y, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // Яркий центр
        gradIris.addColorStop(0.2, 'rgba(230, 235, 255, 0.95)');
        gradIris.addColorStop(0.5, 'rgba(150, 160, 180, 0.85)');
        gradIris.addColorStop(0.8, 'rgba(60, 70, 90, 0.7)');
        gradIris.addColorStop(1, 'rgba(20, 25, 40, 0.6)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris;
        this.ctx.fill();

        // Контур радужки
        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // --- 2. Зрачок ---
        const gradPupil = this.ctx.createRadialGradient(x, y, 0, x, y, rPupil);
        gradPupil.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradPupil.addColorStop(0.7, 'rgba(10, 10, 20, 1)');
        gradPupil.addColorStop(1, 'rgba(40, 45, 60, 1)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = gradPupil;
        this.ctx.fill();

        // --- 3. Блики ---
        // Главный блик
        this.ctx.beginPath();
        this.ctx.ellipse(
            x - rIris * 0.25, y - rIris * 0.28,
            rPupil * 0.55, rPupil * 0.35,
            -Math.PI / 5, 0, Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.ctx.fill();

        // Доп. блик для объема
        this.ctx.beginPath();
        this.ctx.arc(x + rIris * 0.4, y + rIris * 0.35, rPupil * 0.15, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
