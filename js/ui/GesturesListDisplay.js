// js/ui/GesturesListDisplay.js
// Manages the display of saved gestures in the right panel.
import axios from 'axios';

class GesturesListDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.gesturesListContainer = document.getElementById('myGesturesView');

        if (!this.gesturesListContainer) {
            console.error("GesturesListDisplay: #myGesturesView not found.");
            return;
        }

        if (this.eventBus) {
            this.eventBus.on('gesturesDataUpdated', () => {
                this.loadAndRenderGestures();
            });
        }
        
        // Initial load
        this.loadAndRenderGestures();
        console.log("GesturesListDisplay initialized.");
    }

    async loadAndRenderGestures() {
        if (!this.gesturesListContainer) return;

        try {
            // Загружаем из localStorage (самый быстрый локальный источник истины)
            const savedStr = localStorage.getItem('tria_saved_gestures');
            let gestures = [];
            if (savedStr) {
                gestures = JSON.parse(savedStr);
            }

            if (!Array.isArray(gestures) || gestures.length === 0) {
                this.gesturesListContainer.innerHTML = '<div style="padding: 20px; color: #888; text-align: center; font-size: 0.9em;">Жаждет первых паттернов... Запишите жест.</div>';
                return;
            }
            
            // Reverse so newest is on top
            this.renderGestures(gestures.reverse());
        } catch (error) {
            console.error("Error loading gestures from local storage:", error);
            this.gesturesListContainer.innerHTML = '<p>Failed to load gestures.</p>';
        }
    }

    renderGestures(gestures) {
        if (!this.gesturesListContainer) return;
        this.gesturesListContainer.innerHTML = ''; 

        const ul = document.createElement('div');
        ul.className = 'gestures-grid';
        ul.style.display = 'flex';
        ul.style.flexDirection = 'column';
        ul.style.gap = '10px';
        ul.style.padding = '10px';

        gestures.forEach((gesture) => {
            const card = document.createElement('div');
            card.className = 'gesture-card';
            card.style.background = 'var(--glass-bg)';
            card.style.border = '1px solid var(--glass-border)';
            card.style.borderRadius = '12px';
            card.style.padding = '10px';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.2s ease';
            card.dataset.id = gesture.id;
            
            card.onmouseenter = () => card.style.background = 'rgba(255, 255, 255, 0.1)';
            card.onmouseleave = () => card.style.background = 'var(--glass-bg)';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const title = document.createElement('div');
            title.style.color = '#E3E3E3';
            title.style.fontWeight = '500';
            title.style.fontSize = '14px';
            title.textContent = gesture.name || gesture.gesture_name || gesture.id;

            const time = document.createElement('div');
            time.style.color = '#888';
            time.style.fontSize = '10px';
            time.textContent = gesture.timestamp ? new Date(gesture.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

            header.appendChild(title);
            header.appendChild(time);
            card.appendChild(header);

            const canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 80;
            canvas.style.width = '100%';
            canvas.style.height = '60px';
            canvas.style.background = 'rgba(0,0,0,0.3)';
            canvas.style.borderRadius = '8px';
            
            this.drawMiniature(canvas, gesture.paths || gesture.trajectories);
            card.appendChild(canvas);

            // Клик -> Отправка в Студию
            card.addEventListener('click', () => {
                const paths = gesture.paths || gesture.trajectories;
                if (!paths) return;
                
                // Эмиттим событие в EventBus
                if (this.eventBus) {
                    this.eventBus.emit('tria:status', { message: 'Импорт паттерна в двигатель...', pulse: true });
                    this.eventBus.emit('loadGestureToStudio', paths);
                    setTimeout(() => this.eventBus.emit('tria:status', { message: 'Жест загружен', pulse: false }), 500);
                }
            });

            ul.appendChild(card);
        });
        
        this.gesturesListContainer.appendChild(ul);
    }

    drawMiniature(canvas, pathsData) {
        if (!pathsData || !Array.isArray(pathsData) || pathsData.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Find bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pathsData.forEach(([key, pts]) => {
            if (!Array.isArray(pts)) return;
            pts.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
        });

        const w = maxX - minX;
        const h = maxY - minY;
        if (w <= 0 || h <= 0) return;

        const pad = 10;
        const scale = Math.min((canvas.width - pad*2) / w, (canvas.height - pad*2) / h);
        const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        pathsData.forEach(([key, pts], idx) => {
            if (!Array.isArray(pts) || pts.length === 0) return;
            
            // Randomish color for different fingers
            const hue = (idx * 40) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.8)`;
            
            ctx.beginPath();
            pts.forEach((p, i) => {
                const x = p.x * scale + offsetX;
                const y = p.y * scale + offsetY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });
    }

    destroy() {
        if (this.gesturesListContainer) {
            this.gesturesListContainer.innerHTML = ''; 
        }
    }
}

// Export the class
export default GesturesListDisplay;
