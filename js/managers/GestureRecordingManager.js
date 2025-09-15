// Manages the logic and state of gesture recording,
// including red line animation, finger trail visualization, and data submission.

import axios from 'axios'; // Added import
// import EventBus from '../core/eventBus';
// import GestureUIManager from '../ui/GestureUIManager';
// import axios from 'axios'; // For sending data to backend

class GestureRecordingManager {
    constructor(state, gestureAreaElement, gestureUIManager, eventBus) { // Added state as first argument
        this.state = state; // Store the global state
        this.gestureAreaElement = gestureAreaElement;
        this.gestureUIManager = gestureUIManager;
        this.eventBus = eventBus;

        // It's good practice to check if state is provided, though not strictly necessary if main.js always passes it.
        if (!this.state) {
            console.warn("GestureRecordingManager: Global state object not provided to constructor.");
        }

        if (!this.gestureAreaElement) {
            console.error("GestureRecordingManager: gestureAreaElement is required.");
            return;
        }
        if (!this.gestureUIManager) {
            console.error("GestureRecordingManager: GestureUIManager instance is required.");
            return;
        }

        this.isRecording = false;
        this.recordingStartTime = 0;
        this.RECORDING_DURATION = 20000;
        this.animationFrameId = null;

        this.fingerTrailCanvases = {};
        this.recordedGestureData = {};

        this.redLine = this.gestureUIManager.redLineElement;

        this.setupEventListeners();
        console.log("GestureRecordingManager initialized.");
    }

    setupEventListeners() {
        this.gestureAreaElement.addEventListener('click', this.toggleRecording.bind(this));
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            if (this.gestureUIManager.fingerDots.length > 0) {
                this.startRecording();
            } else {
                console.log("GestureRecordingManager: Cannot start recording, no hands/dots detected.");
            }
        }
    }

    startRecording() {
        if (this.isRecording) return;
        this.isRecording = true;
        this.recordingStartTime = performance.now();
        this.recordedGestureData = {};
        console.log("GestureRecordingManager: Recording started.");

        if (this.redLine) {
            this.redLine.style.left = '0px';
            if (this.gestureUIManager.fingerDots.length > 0) {
                this.redLine.style.display = 'block';
            }
        }

        this.clearAllFingerTrailsVisuals();

        if (this.eventBus) {
            this.eventBus.emit('gestureRecordingStateChanged', true);
        }
        this.gestureAreaElement.classList.add('recording-active');
        this.animationFrameId = requestAnimationFrame(this.updateRecordingVisualization.bind(this));
    }

    async stopRecording() { // Made async for the await on axios.post
        if (!this.isRecording) return;

        this.isRecording = false;
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        console.log("GestureRecordingManager: Recording stopped.");

        if (this.redLine) {
            this.redLine.style.left = '0px';
        }

        this.clearAllFingerTrailsVisuals();

        console.log("Raw Recorded Gesture Data:", JSON.parse(JSON.stringify(this.recordedGestureData)));

        // Prepare data for backend: an array of finger trails.
        // Each finger trail is an array of {x, y, t} points.
        const formattedGestureData = {
            duration: Math.min(performance.now() - this.recordingStartTime, this.RECORDING_DURATION), // Actual duration
            trails: Object.values(this.recordedGestureData) // Convert map of trails to an array
        };

        // Send data to backend (Block 4)
        try {
            console.log("Sending gesture data to backend:", formattedGestureData);
            // Replace '/api/gestures' with your actual backend endpoint
            const response = await axios.post('/api/gestures', formattedGestureData);
            console.log("Gesture data sent successfully to backend:", response.data);
            if (this.eventBus) {
                this.eventBus.emit('gestureSaveSuccess', response.data);
            }
        } catch (error) {
            console.error("Error sending gesture data to backend:", error);
            if (this.eventBus) {
                this.eventBus.emit('gestureSaveError', error);
            }
            // Optionally, notify the user of the error
            // alert("Failed to save gesture. Please try again.");
        }

        // Reset recorded data after attempting to send
        this.recordedGestureData = {};

        if (this.eventBus) {
            this.eventBus.emit('gestureRecordingStateChanged', false);
        }
        this.gestureAreaElement.classList.remove('recording-active');
    }

    updateRecordingVisualization(timestamp) {
        if (!this.isRecording) return;
        const elapsedTime = timestamp - this.recordingStartTime;

        if (elapsedTime >= this.RECORDING_DURATION) {
            this.stopRecording(); // stopRecording is now async, but this call doesn't need to await it
            return;
        }

        const progress = elapsedTime / this.RECORDING_DURATION;
        const gestureAreaWidth = this.gestureAreaElement.clientWidth;
        const redLineXPosition = progress * gestureAreaWidth;

        if (this.redLine) {
            this.redLine.style.left = `${redLineXPosition}px`;
        }

        const currentTimeRelative = elapsedTime;

        this.gestureUIManager.fingerDots.forEach((dotElement, index) => {
            const fingerId = `finger${index}`;
            if (!this.recordedGestureData[fingerId]) {
                this.recordedGestureData[fingerId] = [];
            }
            const dotTopStyle = dotElement.style.top;
            const dotYPosition = parseFloat(dotTopStyle);

            if (!isNaN(dotYPosition)) {
                const currentPoint = { x: redLineXPosition, y: dotYPosition, t: currentTimeRelative };
                this.recordedGestureData[fingerId].push(currentPoint);
                this.drawFingerTrail(fingerId, this.recordedGestureData[fingerId]);
            }
        });
        this.animationFrameId = requestAnimationFrame(this.updateRecordingVisualization.bind(this));
    }

    drawFingerTrail(fingerId, trailPoints) {
        let trailCanvas = this.fingerTrailCanvases[fingerId];
        if (!trailCanvas) {
            trailCanvas = document.createElement('canvas');
            trailCanvas.className = 'gesture-finger-trail';
            trailCanvas.width = this.gestureAreaElement.clientWidth;
            trailCanvas.height = this.gestureAreaElement.clientHeight;
            Object.assign(trailCanvas.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '0'
            });
            this.gestureAreaElement.appendChild(trailCanvas);
            this.fingerTrailCanvases[fingerId] = trailCanvas;
        }
        const ctx = trailCanvas.getContext('2d');
        ctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        if (trailPoints.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 1; i < trailPoints.length; i++) {
            ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
        }
        ctx.stroke();
    }

    clearAllFingerTrailsVisuals() {
        for (const fingerId in this.fingerTrailCanvases) {
            const canvas = this.fingerTrailCanvases[fingerId];
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    destroy() {
        if (this.isRecording) {
            // No await needed here as destroy is synchronous
            this.stopRecording().catch(e => console.error("Error during stopRecording in destroy:", e));
        }
        this.gestureAreaElement.removeEventListener('click', this.toggleRecording.bind(this));
        this.clearAllFingerTrailsVisuals();
         for (const fingerId in this.fingerTrailCanvases) {
            this.fingerTrailCanvases[fingerId].remove();
        }
        this.fingerTrailCanvases = {};
        console.log("GestureRecordingManager destroyed.");
    }
}
export default GestureRecordingManager;
