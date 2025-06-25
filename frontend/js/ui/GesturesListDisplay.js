// Manages the display of saved gestures in the right panel.

import axios from 'axios'; // Added import
// import EventBus from '../core/eventBus';

class GesturesListDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.gesturesListContainer = document.getElementById('gesturesListContainer'); // Main container for this view

        if (!this.gesturesListContainer) {
            console.error("GesturesListDisplay: #gesturesListContainer not found. Cannot display gestures.");
            return;
        }

        // This module becomes active when RightPanelManager shows its container.
        // It might listen to an event like 'rightPanelModeChanged' to know when to load/show.
        // if (this.eventBus) {
        //     this.eventBus.on('rightPanelModeChanged', (mode) => {
        //         if (mode === 'gesturesList' && this.gesturesListContainer.style.display !== 'none') {
        //             this.loadAndRenderGestures();
        //         }
        //     });
        // }
        console.log("GesturesListDisplay initialized.");
    }

    async loadAndRenderGestures() {
        if (!this.gesturesListContainer) return;
        this.gesturesListContainer.innerHTML = '<p>Loading gestures...</p>'; // Loading indicator

        try {
            // Replace '/api/gestures' with your actual backend endpoint
            const response = await axios.get('/api/gestures');
            const gestures = response.data.gestures || response.data; // Adjust based on backend response structure

            if (!Array.isArray(gestures) || gestures.length === 0) {
                this.gesturesListContainer.innerHTML = '<p>No saved gestures found.</p>';
                return;
            }
            this.renderGestures(gestures);
        } catch (error) {
            console.error("Error loading gestures:", error);
            this.gesturesListContainer.innerHTML = '<p>Failed to load gestures. Please try again later.</p>';
        }
    }

    renderGestures(gestures) {
        if (!this.gesturesListContainer) return;
        this.gesturesListContainer.innerHTML = ''; // Clear loading message or previous list

        const ul = document.createElement('ul');
        ul.className = 'gestures-list';

        gestures.forEach((gesture, index) => {
            const li = document.createElement('li');
            li.className = 'gesture-list-item';
            li.dataset.gestureId = gesture.id || `gesture-${index}`;

            const title = document.createElement('h4');
            title.textContent = gesture.name || `Gesture ${gesture.id || index + 1}`;

            const miniatureContainer = document.createElement('div');
            miniatureContainer.className = 'gesture-miniature';
            // Placeholder for miniature:
            miniatureContainer.textContent = '[Miniature of gesture trails]';
            // Actual miniature rendering would involve drawing on a small canvas
            // based on gesture.trails data. This is a complex task.
            this.renderMiniature(miniatureContainer, gesture.trails);


            li.appendChild(title);
            li.appendChild(miniatureContainer);
            // Add more details if available (e.g., date, duration)
            // const details = document.createElement('p');
            // details.textContent = `Duration: ${(gesture.duration / 1000).toFixed(1)}s`;
            // li.appendChild(details);

            ul.appendChild(li);
        });
        this.gesturesListContainer.appendChild(ul);
    }

    renderMiniature(container, trails) {
        // Placeholder for actual miniature rendering.
        // This would involve creating a small canvas, scaling the trail coordinates,
        // and drawing the paths.
        const canvas = document.createElement('canvas');
        canvas.width = 100; // Example fixed size
        canvas.height = 50; // Example fixed size
        canvas.style.border = '1px solid #ccc';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (trails && Array.isArray(trails)) {
            ctx.strokeStyle = 'rgba(0, 200, 0, 0.7)';
            ctx.lineWidth = 1;

            // Find bounds of the gesture to scale it into the canvas
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            trails.forEach(trail => {
                if (Array.isArray(trail)) {
                    trail.forEach(point => {
                        if (point.x < minX) minX = point.x;
                        if (point.x > maxX) maxX = point.x;
                        if (point.y < minY) minY = point.y;
                        if (point.y > maxY) maxY = point.y;
                    });
                }
            });

            const gestureWidth = maxX - minX;
            const gestureHeight = maxY - minY;

            if (gestureWidth > 0 && gestureHeight > 0) {
                const scaleX = canvas.width / gestureWidth;
                const scaleY = canvas.height / gestureHeight;
                const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin

                trails.forEach(trail => {
                    if (Array.isArray(trail) && trail.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(
                            (trail[0].x - minX) * scale + (canvas.width - gestureWidth * scale) / 2,
                            (trail[0].y - minY) * scale + (canvas.height - gestureHeight * scale) / 2
                        );
                        for (let i = 1; i < trail.length; i++) {
                            ctx.lineTo(
                                (trail[i].x - minX) * scale + (canvas.width - gestureWidth * scale) / 2,
                                (trail[i].y - minY) * scale + (canvas.height - gestureHeight * scale) / 2
                            );
                        }
                        ctx.stroke();
                    }
                });
            } else {
                 ctx.font = "10px Arial";
                 ctx.textAlign = "center";
                 ctx.fillText("No trail data", canvas.width/2, canvas.height/2);
            }
        } else {
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Invalid trail data", canvas.width/2, canvas.height/2);
        }
        container.innerHTML = ''; // Clear placeholder text
        container.appendChild(canvas);
    }

    destroy() {
        // Remove event listeners if any
        // if (this.eventBus) { this.eventBus.off('rightPanelModeChanged', ...); }
        if (this.gesturesListContainer) {
            this.gesturesListContainer.innerHTML = ''; // Clear content
        }
        console.log("GesturesListDisplay destroyed.");
    }
}

// Export the class
export default GesturesListDisplay;
