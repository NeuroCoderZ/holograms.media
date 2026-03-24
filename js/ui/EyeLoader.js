/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Версия 2.4: Физика на основе пружин (Spring Physics) — стандарт 2026 года.
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
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Оптимизация композиции
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
        
        // Spring Physics state
        this.eyeX = 0;
        this.eyeY = 0;
        this.vx = 0;
        this.vy = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        // Settings
        this.stiffness = 0.12;
        this.damping = 0.75;
        
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
            lid.style.background = 'linear-gradient(to bottom, rgba(5,5,10,0.92), rgba(15,15,25,0.8))';
            lid.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
            lid.style.background = 'linear-gradient(to top, rgba(5,5,10,0.92), rgba(15,15,25,0.8))';
            lid.style.borderTop = '1px solid rgba(255,255,255,0.15)';
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
        console.log('[EyeLoader] v2.4: Spring Physics REM simulation active.');
        this.phase = 'alive';
        this.saccadeInterval = setInterval(() => this.triggerSaccade(), 1000 + Math.random() * 1500);
        requestAnimationFrame(() => this.loop());
    }

    triggerSaccade() {
        if (this.phase !== 'alive') return;
        const range = Math.min(this.width, this.height) * 0.22;
        this.targetX = (Math.random() - 0.5) * range;
        this.targetY = (Math.random() - 0.5) * range;
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 0 && this.progress < 85) {
            this.phase = 'alive';
        } else if (this.progress >= 85 && this.progress < 92) {
            this.phase = 'return';
            this.targetX = 0;
            this.targetY = 0;
        } else if (this.progress >= 92 && this.progress < 97) {
            this.phase = 'static';
            this.targetX = 0;
            this.targetY = 0;
        } else if (this.progress >= 97 && this.progress < 100) {
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
        // Очистка чёрным для оптимизации {alpha: false}
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        if (this.phase === 'alive' || this.phase === 'return' || this.phase === 'static' || this.phase === 'fly') {
            // Spring Physics logic
            const ax = (this.targetX - this.eyeX) * this.stiffness;
            const ay = (this.targetY - this.eyeY) * this.stiffness;
            
            this.vx += ax;
            this.vy += ay;
            this.vx *= this.damping;
            this.vy *= this.damping;
            
            this.eyeX += this.vx;
            this.eyeY += this.vy;
            
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
        const rIris = Math.min(this.width, this.height) * 0.24;
        const rPupil = rIris * 0.45;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // --- 1. Радужка: Стеклянный эффект 2026 ---
        const gradIris = this.ctx.createRadialGradient(
            x - rIris * 0.3, y - rIris * 0.3, rPupil * 0.1,
            x, y, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); 
        gradIris.addColorStop(0.1, 'rgba(240, 245, 255, 0.98)');
        gradIris.addColorStop(0.4, 'rgba(160, 175, 200, 0.9)');
        gradIris.addColorStop(0.7, 'rgba(70, 85, 110, 0.8)');
        gradIris.addColorStop(1, 'rgba(25, 30, 50, 0.7)');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris;
        this.ctx.fill();

        // Яркий контур
        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // --- 2. Зрачок: Нативный Blur 2026 ---
        const gradPupil = this.ctx.createRadialGradient(x, y, 0, x, y, rPupil);
        gradPupil.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradPupil.addColorStop(0.8, 'rgba(15, 15, 25, 1)');
        gradPupil.addColorStop(1, 'rgba(45, 50, 70, 1)');

        this.ctx.save();
        this.ctx.filter = 'blur(4px)'; // Мягкий фокус зрачка
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = gradPupil;
        this.ctx.fill();
        this.ctx.restore();

        // --- 3. Блики: Многослойные ---
        // Основной (Specular)
        this.ctx.beginPath();
        this.ctx.ellipse(
            x - rIris * 0.28, y - rIris * 0.3,
            rPupil * 0.6, rPupil * 0.4,
            -Math.PI / 6, 0, Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.ctx.fill();

        // Глубинный (Rim)
        this.ctx.beginPath();
        this.ctx.arc(x + rIris * 0.45, y + rIris * 0.4, rPupil * 0.18, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
