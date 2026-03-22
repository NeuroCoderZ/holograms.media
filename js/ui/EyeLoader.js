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
        this.container.style.inset = '0';
        this.container.style.zIndex = '10000';
        this.container.style.pointerEvents = 'none';

        // Канвас для глаза
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
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
        lid.style.height = '50vh'; // Exactly half screen
        lid.style.zIndex = '20';
        lid.style.backgroundColor = '#000000'; // Match body background for seamless look
        // Optional: Glass effect if desired, but brief says "invisible junction"
        // To make junction invisible, they must be same color.
        // If we want glass, we need a background behind them.
        // Brief: "Стык верхнего и нижнего века в закрытом состоянии: линия невидима — оба века того же цвета что и фон."
        // So Black #000000.
        
        lid.style.transition = 'transform 0.1s linear';
        lid.style.borderBottom = isUpper ? '1px solid transparent' : 'none';
        lid.style.borderTop = !isUpper ? '1px solid transparent' : 'none';
        
        if (isUpper) {
            lid.style.top = '0';
            lid.style.transformOrigin = 'top';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
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
        this.phase = 'alive';
        
        // Saccade loop
        this.saccadeInterval = setInterval(() => this.triggerSaccade(), 1500 + Math.random() * 1000);
        this.triggerSaccade();

        requestAnimationFrame(() => this.loop());
    }

    triggerSaccade() {
        if (this.phase !== 'alive') return;
        // Random position within 10% of center
        const range = Math.min(this.width, this.height) * 0.15;
        this.targetX = (Math.random() - 0.5) * range;
        this.targetY = (Math.random() - 0.5) * range;
    }

    setProgress(p) {
        this.progress = p;
        
        // Phase Logic
        if (this.progress >= 0 && this.progress < 80) {
            this.phase = 'alive';
        } else if (this.progress >= 80 && this.progress < 90) {
            if (this.phase !== 'return') {
                this.phase = 'return';
                // Set target to center
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
                // Pick random direction for fly away
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.max(this.width, this.height) * 0.1; // Fast speed per frame
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

        // Logic per phase
        if (this.phase === 'alive') {
            // Smooth lerp to target
            this.eyeX += (this.targetX - this.eyeX) * 0.1;
            this.eyeY += (this.targetY - this.eyeY) * 0.1;
            this.drawEye(centerX + this.eyeX, centerY + this.eyeY, 1.0);
        } 
        else if (this.phase === 'return') {
            // Ease out to 0,0
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
            // Open eyelids
            this.upperLid.style.transform = `translateY(-100%)`;
            this.lowerLid.style.transform = `translateY(100%)`;
            
            // Remove container after transition
            setTimeout(() => {
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
                if (this.saccadeInterval) clearInterval(this.saccadeInterval);
            }, 500);
            return; // Stop loop
        }

        requestAnimationFrame(() => this.loop());
    }

    drawEye(x, y, alpha) {
        const rIris = Math.min(this.width, this.height) * 0.15; // Smaller, realistic iris size
        const rPupil = rIris * 0.4;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        // 1. Iris
        const gradIris = this.ctx.createRadialGradient(x, y, rIris * 0.2, x, y, rIris);
        gradIris.addColorStop(0, '#444'); 
        gradIris.addColorStop(0.5, '#222');
        gradIris.addColorStop(1, '#000');
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris; // Simple dark style
        // Add white glow ring (Tria style)
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 2. Pupil
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000';
        this.ctx.fill();

        // 3. Specular Highlight (Reflection)
        this.ctx.beginPath();
        this.ctx.arc(x + rIris * 0.3, y - rIris * 0.3, rPupil * 0.3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
