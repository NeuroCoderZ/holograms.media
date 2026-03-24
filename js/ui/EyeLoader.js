/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Версия 2.6: Интенсивное «Прошмыгивание» (Fast Scuttling).
 * Глаз стремительно проносится через экран, имитируя быстрые фазы сознания.
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
        this.ctx = this.canvas.getContext('2d', { alpha: false }); 
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
        this.phase = 'scuttle'; 
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Scuttle state
        this.eyeX = -300;
        this.eyeY = -300;
        this.vx = 0;
        this.vy = 0;
        this.isVisible = false;
        
        this.lastScuttleTime = 0;
        this.scuttleCooldown = 150; // Уменьшено для интенсивности
        
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
        
        if (isUpper) {
            lid.style.top = '0';
            lid.style.transformOrigin = 'top';
            lid.style.background = 'linear-gradient(to bottom, rgba(5,5,10,0.98), rgba(15,15,25,0.9))';
            lid.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
            lid.style.background = 'linear-gradient(to top, rgba(5,5,10,0.98), rgba(15,15,25,0.9))';
            lid.style.borderTop = '1px solid rgba(255,255,255,0.2)';
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
        console.log('[EyeLoader] v2.6: Intensive Scuttle mode activated.');
        this.initScuttle();
        requestAnimationFrame(() => this.loop());
    }

    initScuttle() {
        const side = Math.floor(Math.random() * 4);
        const margin = 200;
        // УВЕЛИЧЕННАЯ СКОРОСТЬ: 6% от экрана за кадр
        const speedBase = Math.max(this.width, this.height) * 0.065; 
        const speedVar = (Math.random() * 0.5 + 0.8); // 80% to 130% variation
        const speed = speedBase * speedVar;

        switch(side) {
            case 0: // Top
                this.eyeX = Math.random() * this.width;
                this.eyeY = -margin;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = speed;
                break;
            case 1: // Right
                this.eyeX = this.width + margin;
                this.eyeY = Math.random() * this.height;
                this.vx = -speed;
                this.vy = (Math.random() - 0.5) * speed;
                break;
            case 2: // Bottom
                this.eyeX = Math.random() * this.width;
                this.eyeY = this.height + margin;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = -speed;
                break;
            case 3: // Left
                this.eyeX = -margin;
                this.eyeY = Math.random() * this.height;
                this.vx = speed;
                this.vy = (Math.random() - 0.5) * speed;
                break;
        }
        this.isVisible = true;
    }

    setProgress(p) {
        this.progress = p;
        if (this.progress >= 100) {
            this.phase = 'open';
        }
    }

    loop() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.phase === 'scuttle') {
            if (this.isVisible) {
                this.eyeX += this.vx;
                this.eyeY += this.vy;
                
                this.drawEye(this.eyeX, this.eyeY, 1.0);
                
                const margin = 300;
                if (this.eyeX < -margin || this.eyeX > this.width + margin || 
                    this.eyeY < -margin || this.eyeY > this.height + margin) {
                    this.isVisible = false;
                    this.lastScuttleTime = performance.now();
                }
            } else {
                // Интенсивная частота
                if (performance.now() - this.lastScuttleTime > this.scuttleCooldown) {
                    this.initScuttle();
                }
            }
            requestAnimationFrame(() => this.loop());
        } 
        else if (this.phase === 'open') {
            this.upperLid.style.transform = 'translateY(-100%)';
            this.lowerLid.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
            }, 900);
        }
    }

    drawEye(x, y, alpha) {
        // Уменьшенный размер для "быстрого" ощущения (12% вместо 15%)
        const rIris = Math.min(this.width, this.height) * 0.12;
        const rPupil = rIris * 0.45;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Стеклянная радужка
        const gradIris = this.ctx.createRadialGradient(x, y, 0, x, y, rIris);
        gradIris.addColorStop(0, '#ffffff');
        gradIris.addColorStop(0.15, '#f0f0ff');
        gradIris.addColorStop(0.5, '#a0a0cc');
        gradIris.addColorStop(1, '#303050');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris;
        this.ctx.fill();

        // Зрачок
        this.ctx.save();
        this.ctx.filter = 'blur(1.5px)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        this.ctx.restore();

        // Динамический блик (смещается в сторону движения)
        const glintOffset = 0.3 * rIris;
        this.ctx.beginPath();
        this.ctx.arc(x - glintOffset, y - glintOffset, rPupil * 0.45, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
