// Manages the UI aspects of the gesture area (#gesture-area),
// including its height, red line, and finger dot visualizations.

// Assuming an EventBus class/instance is available and imported
// import EventBus from '../core/eventBus';

class GestureUIManager {
    constructor(eventBus, appState) {
        this.gestureAreaElement = document.getElementById('gesture-area');
        this.eventBus = eventBus;
        this.appState = appState;

        if (!this.gestureAreaElement) {
            console.error("GestureUIManager: #gesture-area element not found!");
            return;
        }

        // Ensure #gesture-area can contain absolutely positioned children
        if (getComputedStyle(this.gestureAreaElement).position === 'static') {
            this.gestureAreaElement.style.position = 'relative';
            console.log("GestureUIManager: Set #gesture-area position to relative.");
        }

        this.redLineElement = null;
        this.fingerDots = []; // To keep track of dot elements

        console.log("GestureUIManager initialized for Block 3");
        this.subscribeToEvents();
        this.drawVerticalRedLine(); // Draw the red line once at init
        this.setHandsPresent(false);
    }

    subscribeToEvents() {
        if (!this.eventBus) {
            console.warn("GestureUIManager: EventBus not provided, cannot subscribe to hand tracking events.");
            return;
        }
        this.eventBus.on('handsDetected', (results) => this.handleHandsChange(true, results));
        this.eventBus.on('handsLost', () => this.handleHandsChange(false));
        console.log("GestureUIManager subscribed to handsDetected and handsLost events.");
    }

    handleHandsChange(present, results = null) {
        console.log(`GestureUIManager: Hands present state changed to ${present}.`);
        this.setHandsPresent(present);

        if (this.appState && typeof this.appState.setState === 'function') {
            this.appState.setState({ handsVisible: present });
        }

        if (present && results) {
            this.renderFingerDots(results);
        } else {
            this.clearFingerDots();
        }
    }

    setHandsPresent(present) {
        if (!this.gestureAreaElement) return;
        const targetHeight = present ? '25vh' : '4px';
        if (this.gestureAreaElement.style.height !== targetHeight) {
            this.gestureAreaElement.style.height = targetHeight;
            console.log(`GestureUIManager: #gesture-area height set to: ${targetHeight}`);
        }
        // Show/hide red line and dots based on hand presence
        if (this.redLineElement) {
            this.redLineElement.style.display = present ? 'block' : 'none';
        }
        if (!present) {
            this.clearFingerDots();
        }
    }

    drawVerticalRedLine() {
        if (!this.gestureAreaElement) return;
        if (this.redLineElement) this.redLineElement.remove(); // Remove if already exists

        this.redLineElement = document.createElement('div');
        this.redLineElement.id = 'gesture-red-line'; // For styling & potential animation
        Object.assign(this.redLineElement.style, {
            position: 'absolute',
            left: '0px', // At the left edge
            top: '0px',
            width: '2px', // Thickness from plan
            height: '100%', // Span full height of #gesture-area
            backgroundColor: 'red',
            zIndex: '1', // Above background, below dots
            display: 'none' // Initially hidden, shown when hands are present
        });
        this.gestureAreaElement.appendChild(this.redLineElement);
        console.log("GestureUIManager: Vertical red line drawn.");
    }

    renderFingerDots(handTrackingResults) {
        if (!this.gestureAreaElement || !this.redLineElement || this.redLineElement.style.display === 'none') {
            this.clearFingerDots();
            return;
        }

        this.clearFingerDots(); // Clear previous dots

        const gestureAreaHeight = this.gestureAreaElement.clientHeight;
        if (gestureAreaHeight <= 0) return; // Avoid division by zero if area is hidden or has no height

        if (handTrackingResults.multiHandLandmarks) {
            handTrackingResults.multiHandLandmarks.forEach(landmarks => {
                // Fingertip indices from MediaPipe Hands (Thumb, Index, Middle, Ring, Pinky)
                const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
                FINGER_TIP_INDICES.forEach(index => {
                    const tip = landmarks[index];
                    if (!tip) return;

                    const dot = document.createElement('div');
                    dot.className = 'gesture-finger-dot'; // For styling
                    Object.assign(dot.style, {
                        position: 'absolute',
                        // Dots are on the red line, so X is relative to red line's position or #gesture-area left edge
                        left: '1px', // Centered on the 2px red line (0px to 2px). Or adjust as needed.
                        // Vertical position based on tip.y (0.0 to 1.0, top to bottom)
                        top: `${tip.y * gestureAreaHeight - 2}px`, // -2px to center 4px dot
                        width: '4px', // Example size
                        height: '4px', // Example size
                        backgroundColor: 'green',
                        borderRadius: '50%',
                        zIndex: '2', // Above red line
                        transform: 'translateX(-50%)' // Center the dot on its 'left' coordinate
                    });
                    this.gestureAreaElement.appendChild(dot);
                    this.fingerDots.push(dot);
                });
            });
        }
    }

    clearFingerDots() {
        this.fingerDots.forEach(dot => dot.remove());
        this.fingerDots = [];
    }

    destroy() {
        if (this.eventBus) {
            this.eventBus.off('handsDetected', this.handleHandsChange);
            this.eventBus.off('handsLost', this.handleHandsChange);
            console.log("GestureUIManager events unsubscribed.");
        }
        if (this.redLineElement) this.redLineElement.remove();
        this.clearFingerDots();
    }
}

// Export the class
export default GestureUIManager;
