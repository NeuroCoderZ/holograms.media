/**
 * EyeLoader.js
 * Продвинутая Canvas-анимация «Пробуждение» (REM wake-up).
 * Версия 2.5: Эффект «Прошмыгивания» (Scuttling Eye).
 * Глаз интенсивно проносится через экран в случайных направлениях.
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
        this.eyeX = -200;
        this.eyeY = -200;
        this.vx = 0;
        this.vy = 0;
        this.isVisible = false;
        
        this.lastScuttleTime = 0;
        this.scuttleCooldown = 200; // ms between scuttles
        
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
            lid.style.background = 'linear-gradient(to bottom, rgba(5,5,10,0.95), rgba(15,15,25,0.85))';
            lid.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
        } else {
            lid.style.bottom = '0';
            lid.style.transformOrigin = 'bottom';
            lid.style.background = 'linear-gradient(to top, rgba(5,5,10,0.95), rgba(15,15,25,0.85))';
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
        console.log('[EyeLoader] v2.5: Scuttle mode activated.');
        this.initScuttle();
        requestAnimationFrame(() => this.loop());
    }

    initScuttle() {
        // Выбираем случайную сторону появления
        const side = Math.floor(Math.random() * 4);
        const margin = 150;
        const speed = Math.max(this.width, this.height) * 0.04; // Довольно быстро

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
        // Очистка чёрным
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.phase === 'scuttle') {
            if (this.isVisible) {
                this.eyeX += this.vx;
                this.eyeY += this.vy;
                
                this.drawEye(this.eyeX, this.eyeY, 1.0);
                
                // Проверка выхода за границы
                const margin = 200;
                if (this.eyeX < -margin || this.eyeX > this.width + margin || 
                    this.eyeY < -margin || this.eyeY > this.height + margin) {
                    this.isVisible = false;
                    this.lastScuttleTime = performance.now();
                }
            } else {
                // Ожидание перед следующим "прошмыгиванием"
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
        const rIris = Math.min(this.width, this.height) * 0.15;
        const rPupil = rIris * 0.45;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Радужка
        const gradIris = this.ctx.createRadialGradient(x, y, 0, x, y, rIris);
        gradIris.addColorStop(0, '#ffffff');
        gradIris.addColorStop(0.2, '#e0e0ff');
        gradIris.addColorStop(0.6, '#808099');
        gradIris.addColorStop(1, '#202033');

        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fillStyle = gradIris;
        this.ctx.fill();

        // Зрачок (с нативным блюром)
        this.ctx.save();
        this.ctx.filter = 'blur(2px)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        this.ctx.restore();

        // Блик
        this.ctx.beginPath();
        this.ctx.arc(x - rIris * 0.3, y - rIris * 0.3, rPupil * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fill();

        this.ctx.restore();
    }
}
