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
        lid.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; // Slightly more transparent for liquid look
        lid.style.backdropFilter = 'blur(var(--glass-blur, 35px)) saturate(var(--glass-saturate, 200%))';
        lid.style.webkitBackdropFilter = 'blur(var(--glass-blur, 35px)) saturate(var(--glass-saturate, 200%))';
        lid.style.border = 'none'; // Seamless
        lid.style.transition = 'transform 0.05s linear, opacity 0.3s ease';
        
        // СТРОГО прямые веки (no borderRadius)
        // Deep seamless join: Overlap shadow at the center
        const shadowColor = 'rgba(0, 0, 0, 0.4)';
        if (isUpper) {
            lid.style.top = '-50vh';
            lid.style.boxShadow = `0 15px 40px -10px ${shadowColor}`; // Shadow on bottom edge
        } else {
            lid.style.top = '50vh';
            lid.style.boxShadow = `0 -15px 40px -10px ${shadowColor}`; // Shadow on top edge
        }

        // --- Liquid Glass Distortion Gradient ---
        // This simulates the "mold" underneath the glass.
        // It's a radial gradient that we'll position dynamically.
        lid.style.backgroundRepeat = 'no-repeat';
        lid.style.backgroundSize = '100% 100%';
        
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
        
        const eyeX = this.width / 2 + this.saccadeX;
        const eyeY = this.height / 2 + this.saccadeY;

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
            
            // Full blur while closed
            this.upperLid.style.maskImage = 'none';
            this.lowerLid.style.maskImage = 'none';

            // Deformation logic even when closed (subtle breathing?)
            this.updateGlassDeformation(0, 0);
        }
        
        else if (this.phase === 'opening') {
            const t = this.clamp(elapsedPhase / 600, 0, 1);
            const openFrac = this.easeInOut(t);
            const offset = 60 * openFrac;
            
            this.updateEyeGeometry(offset, openFrac, eyeX, eyeY);

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
            
            const offset = 60 * (1 - closeFrac);
            this.updateEyeGeometry(offset, 1 - closeFrac, eyeX, eyeY);
            
            if (t > 100 + this.blinkCount * (blinkDuration + gap) + 500) this.setPhase('done');
        }
        
        if (this.phase !== 'done') {
            requestAnimationFrame(() => this.loop());
        } else {
            this.container.remove();
        }
    }

    updateEyeGeometry(offset, intensity, eyeX, eyeY) {
        this.upperLid.style.transform = `translateY(${-offset}vh)`;
        this.lowerLid.style.transform = `translateY(${offset}vh)`;
        
        const rIris = this.height * 0.42;
        
        // Update mask for clear vision (the eye is behind the glass)
        // Intensity is 0 when open, 1 when closed. 
        // We want mask only when partially/fully open to see the eye.
        const maskAlpha = this.clamp(offset / 10, 0, 1);
        const mask = `radial-gradient(circle at ${eyeX}px ${eyeY}px, transparent ${rIris}px, black ${rIris + 2}px)`;
        this.upperLid.style.maskImage = mask;
        this.lowerLid.style.maskImage = mask;
        this.upperLid.style.webkitMaskImage = mask;
        this.lowerLid.style.webkitMaskImage = mask;

        // Deformation logic: The "bulge" follows the eye but is drawn on the moving lid.
        this.updateGlassDeformation(offset, intensity, eyeX, eyeY);
    }

    updateGlassDeformation(offset, intensity, eyeX, eyeY) {
        // Fade out deformation as lids open fully
        // The user says "При полном открытии эта форма исчезает"
        const deformationAlpha = this.clamp(1 - offset / 50, 0, 1);
        if (deformationAlpha <= 0) {
            this.upperLid.style.backgroundImage = 'none';
            this.lowerLid.style.backgroundImage = 'none';
            return;
        }

        const rIris = this.height * 0.4;
        const rPupil = this.height * 0.16;

        // The gradient must stay at eyeX, eyeY relative to the viewport.
        // But it's applied to the lid which has its own transform.
        // Lid coordinate system: top is affected by translateY.
        // Upper lid Y center is -50vh + translateY.
        // Lower lid Y center is 50vh + translateY.
        
        const drawDeformation = (lid, isUpper) => {
            // Pos in lid coordinates
            // Correct for viewport offset.
            const lidTopPx = isUpper ? -this.height * 0.5 - (this.height * offset / 100) : this.height * 0.5 + (this.height * offset / 100);
            const localEyeY = eyeY - lidTopPx - (this.height * (isUpper ? 0 : 0)); // Adjust for absolute top
            
            // Wait, lid is absolute top: -50vh (upper) or 50vh (lower).
            // Transform only moves the div.
            // So lid's top edge in viewport is:
            const currentTop = isUpper ? (-this.height * 0.5 - (this.height * offset / 100)) : (this.height * 0.5 + (this.height * offset / 100));
            const yInLid = eyeY - currentTop;

            const irisColor = `rgba(255, 255, 255, ${0.12 * deformationAlpha})`;
            const pupilColor = `rgba(0, 0, 0, ${0.25 * deformationAlpha})`;

            lid.style.backgroundImage = `
                radial-gradient(circle at ${eyeX}px ${yInLid}px, 
                    ${irisColor} 0%, 
                    transparent ${rIris}px),
                radial-gradient(circle at ${eyeX}px ${yInLid}px, 
                    ${pupilColor} 0%, 
                    transparent ${rPupil}px)
            `;
        };

        drawDeformation(this.upperLid, true);
        drawDeformation(this.lowerLid, false);
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
        
        // --- High Detail Sharp Eye (Behind Glass) ---
        // 1. Iris (Convex effect via gradients)
        // Внешняя тень радужки для глубины
        this.ctx.shadowBlur = 40;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowOffsetX = offX / 2;
        this.ctx.shadowOffsetY = offY / 2;

        const gradIris = this.ctx.createRadialGradient(
            cx - offX, cy - offY, rIris * 0.05,
            cx, cy, rIris
        );
        gradIris.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); 
        gradIris.addColorStop(0.4, 'rgba(120, 120, 120, 0.2)');
        gradIris.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        this.ctx.fillStyle = gradIris;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rIris, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 2. Pupil (Concave effect)
        this.ctx.shadowBlur = 0; // Сброс тени
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        const gradPupil = this.ctx.createRadialGradient(
            cx + offX * 1.5, cy + offY * 1.5, rPupil * 0.05,
            cx, cy, rPupil
        );
        gradPupil.addColorStop(0, '#040404');
        gradPupil.addColorStop(1, '#000000');
        
        this.ctx.fillStyle = gradPupil;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. V-Cut Edges (Hard highlights for engraving look)
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rIris - 2, -Math.PI * 0.7, -Math.PI * 0.3);
        this.ctx.stroke();

        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rPupil + 2, Math.PI * 0.3, Math.PI * 0.7);
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
