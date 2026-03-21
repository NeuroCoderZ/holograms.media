/**
 * MiniEyeLoader.js
 * Облегченная версия глаза для процесса "размышления" Триа в чате.
 * Включает эффект "Портала": сжатие в точку, падение и вылет символов.
 */

export class MiniEyeLoader {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.className = 'mini-eye-loader';
        
        this.width = 60;
        this.height = 40;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.progress = 0;
        this.state = 'loading'; // loading, shrinking, falling, portal, typing
        this.startTime = Date.now();
        
        this.symbols = [];
        this.cursorX = 10;
        this.cursorY = 20;
        this.isCursorVisible = true;
        this.lastBlink = 0;
        
        this.irisX = this.width / 2;
        this.irisY = this.height / 2;
        this.irisRadius = 12;
        this.pupilRadius = 5;
        
        this.isDone = false;
    }

    start() {
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        this.state = 'loading';
        this.startTime = Date.now();
        requestAnimationFrame(() => this.loop());
    }

    stop() {
        if (this.state === 'loading') {
            this.state = 'shrinking';
            this.phaseStartTime = Date.now();
        }
    }

    loop() {
        const now = Date.now();
        const dt = now - this.startTime;
        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.state === 'loading') {
            this.drawEye(this.irisX, this.irisY, this.irisRadius, this.pupilRadius, 1);
            // Саккады в мини-режиме
            if (now % 600 < 30) {
                this.irisX = this.width / 2 + (Math.random() - 0.5) * 6;
                this.irisY = this.height / 2 + (Math.random() - 0.5) * 4;
            }
        } 
        else if (this.state === 'shrinking') {
            const t = Math.min((now - this.phaseStartTime) / 400, 1);
            const scale = 1 - t;
            this.drawEye(this.width / 2, this.height / 2, this.irisRadius * scale, this.pupilRadius * scale, scale);
            if (t >= 1) {
                this.state = 'falling';
                this.phaseStartTime = now;
            }
        }
        else if (this.state === 'falling') {
            const t = Math.min((now - this.phaseStartTime) / 300, 1);
            const y = this.height / 2 + (this.height * 0.3 * t);
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(this.width / 2, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            if (t >= 1) {
                this.state = 'portal';
                this.phaseStartTime = now;
            }
        }
        else if (this.state === 'portal') {
            this.drawPortal(now);
            if (now - this.phaseStartTime > 1500) {
                this.isDone = true;
                this.canvas.remove();
            }
        }

        if (!this.isDone) {
            requestAnimationFrame(() => this.loop());
        }
    }

    drawEye(x, y, rIris, rPupil, alpha) {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Радужка
        const grad = this.ctx.createRadialGradient(x, y, rIris * 0.2, x, y, rIris);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(1, 'rgba(100, 100, 100, 0.1)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(x, y, rIris, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Зрачок
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(x, y, rPupil, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawPortal(now) {
        // Мигающий курсор
        if (now - this.lastBlink > 400) {
            this.isCursorVisible = !this.isCursorVisible;
            this.lastBlink = now;
        }

        if (this.isCursorVisible) {
            this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.cursorX, 10);
            this.ctx.lineTo(this.cursorX, 30);
            this.ctx.stroke();
        }

        // Вылетающие символы
        if (Math.random() > 0.85) {
            const char = String.fromCharCode(33 + Math.random() * 90);
            this.symbols.push({
                char,
                x: this.cursorX,
                y: 20,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3,
                rot: 0,
                vRot: (Math.random() - 0.5) * 0.2,
                alpha: 1
            });
            this.cursorX += 3;
        }

        for (let i = this.symbols.length - 1; i >= 0; i--) {
            const s = this.symbols[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.15; // Гравитация
            s.rot += s.vRot;
            s.alpha -= 0.02;

            this.ctx.save();
            this.ctx.globalAlpha = s.alpha;
            this.ctx.translate(s.x, s.y);
            this.ctx.rotate(s.rot);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(s.char, 0, 0);
            this.ctx.restore();

            if (s.alpha <= 0) this.symbols.splice(i, 1);
        }
    }
}
