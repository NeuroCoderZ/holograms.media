// Manages the UI aspects of the gesture area (#gesture-area),
// including its height, red line, and finger dot visualizations.

// Assuming an EventBus class/instance is available and imported
// import EventBus from '../core/eventBus';
// Using window.TWEEN as it's included via script tag and updated in rendering.js
// import * as TWEEN from '@tweenjs/tween.js';

class GestureUIManager {
    constructor(eventBus, state) { // appState changed to state
        this.gestureAreaElement = document.getElementById('gesture-area');
        this.eventBus = eventBus;
        this.state = state; // appState changed to state
        this.currentAnimation = null; // To manage ongoing animations

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
        this.initialize(); // Changed from subscribeToEvents
        this.drawVerticalRedLine(); // Draw the red line once at init
    }

    initialize() { // Renamed from subscribeToEvents and expanded
        if (!this.eventBus) {
            console.warn("GestureUIManager: EventBus not provided, cannot subscribe to hand tracking events.");
            return;
        }
        // Store bound versions of handlers for consistent subscription/unsubscription
        this.boundHandleHandsDetected = this.handleHandsDetected.bind(this);
        this.boundHandleHandsLost = this.handleHandsLost.bind(this);

        this.eventBus.on('handsDetected', this.boundHandleHandsDetected);
        this.eventBus.on('handsLost', this.boundHandleHandsLost);
        console.log("GestureUIManager subscribed to handsDetected and handsLost events via EventBus.on.");

        this.setHandsPresent(false); // Moved from constructor
    }

    handleHandsDetected(landmarksData) {
        this.handleHandsChange(true, landmarksData);
    }

    handleHandsLost() {
        this.handleHandsChange(false, null);
    }

    handleHandsChange(present, landmarksData = null) { // landmarksData can be null
        console.log(`GestureUIManager: Hands present state changed to ${present}.`);
        this.animateGestureArea(present); // Changed to call animation method

        if (this.state) { // Check if state object exists
            this.state.handsVisible = present;
            // Emit an event if other modules need to react to this change,
            // e.g., HologramManager might listen for this.
            if (this.eventBus) {
                this.eventBus.emit('stateChanged_handsVisible', present);
            }
        }

        // Pass landmarksData (which might be null if handsLost)
        // Ensure handTrackingResults is structured as expected by renderFingerDots
        if (present && landmarksData) {
            this.renderFingerDots({ multiHandLandmarks: landmarksData });
        } else {
            this.clearFingerDots();
        }
    }

    animateGestureArea(present) {
        if (!this.gestureAreaElement) return;

        if (this.currentAnimation) {
            this.currentAnimation.stop();
            window.TWEEN.remove(this.currentAnimation); // Clean up old tween
        }

        const initialHeightStyle = this.gestureAreaElement.style.height || getComputedStyle(this.gestureAreaElement).height;
        const targetVh = present ? 25 : 0.4; // Target height in vh (0.4vh is approx 4px)
        const targetHeightPx = (targetVh / 100) * window.innerHeight;

        let initialHeightPx;
        if (initialHeightStyle.endsWith('vh')) {
            initialHeightPx = (parseFloat(initialHeightStyle) / 100) * window.innerHeight;
        } else if (initialHeightStyle.endsWith('px')) {
            initialHeightPx = parseFloat(initialHeightStyle);
        } else {
            // Fallback if style is not set or in an unexpected unit (e.g. initially empty style)
            initialHeightPx = present ? 0 : (0.25 * window.innerHeight); // Start from 0 if appearing, or from 25vh if disappearing
            // A more robust way for initial state: query actual offsetHeight if style.height is empty
            if (this.gestureAreaElement.style.height === '') {
                initialHeightPx = this.gestureAreaElement.offsetHeight;
            }
        }

        // Ensure initialHeightPx is a number
        if (isNaN(initialHeightPx)) {
            console.warn("GestureUIManager: Could not determine initial height for animation. Defaulting.");
            initialHeightPx = present ? 4 : (0.25 * window.innerHeight) ; // Default to 4px or 25vh in px
        }

        const coords = { height: initialHeightPx };
        this.currentAnimation = new window.TWEEN.Tween(coords)
            .to({ height: targetHeightPx }, 300) // 300ms animation duration
            .easing(window.TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.gestureAreaElement.style.height = `${coords.height}px`;
            })
            .onComplete(() => {
                this.currentAnimation = null;
                // Set final state using vh for responsiveness, or px for the 'hidden' state
                this.gestureAreaElement.style.height = present ? `${targetVh}vh` : '4px';
                console.log(`GestureUIManager: #gesture-area animation complete. Target height set to: ${this.gestureAreaElement.style.height}`);

                if (this.redLineElement) {
                    this.redLineElement.style.display = present ? 'block' : 'none';
                }
                // Clearing dots on handsLost is already handled in handleHandsChange
            })
            .start();
    }

    // Original setHandsPresent removed as its height logic is now in animateGestureArea.
    // Red line and dot clearing logic is tied to animation completion or handleHandsChange.

    // Added setHandsPresent method, which was originally removed.
    // This is called in initialize() to set the initial state.
    setHandsPresent(present) {
        // This method might need to do more than just log,
        // but for now, it mirrors the call that was moved.
        // The actual UI changes are handled by animateGestureArea via handleHandsChange.
        console.log(`GestureUIManager: Initial hands present state set to ${present}.`);
        // If immediate UI changes are needed before first event, they would go here.
        // For now, animateGestureArea(present) is called by handleHandsChange,
        // which will be triggered by events or could be called here if needed.
        // Let's ensure the red line is hidden initially if hands are not present.
        if (this.redLineElement) {
            this.redLineElement.style.display = present ? 'block' : 'none';
        }
        // Ensure finger dots are cleared if hands are not present initially
        if (!present) {
            this.clearFingerDots();
        }
    }

    drawVerticalRedLine() {
        if (!this.gestureAreaElement) return;
        if (this.redLineElement) this.redLineElement.remove();

        this.redLineElement = document.createElement('div');
        this.redLineElement.id = 'gesture-red-line';
        Object.assign(this.redLineElement.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '2px',
            height: '100%',
            backgroundColor: 'red',
            zIndex: '1',
            display: 'none'
        });
        this.gestureAreaElement.appendChild(this.redLineElement);
        console.log("GestureUIManager: Vertical red line drawn.");
    }

    renderFingerDots(handTrackingResults) { // Expects { multiHandLandmarks: [...] }
        if (!this.gestureAreaElement) return; // Guard against no element
        // Only render dots if hands are meant to be present (red line is visible as a proxy)
        if (!this.redLineElement || this.redLineElement.style.display === 'none') {
             // This check might be too restrictive if redLineElement is shown only after animation.
             // Consider if dots should appear during animation or only after.
             // For now, if redLine is not visible (implying hands are not fully "present" UI-wise), clear dots.
            this.clearFingerDots();
            return;
        }

        this.clearFingerDots();

        const gestureAreaHeight = this.gestureAreaElement.clientHeight;
        if (gestureAreaHeight <= 0) return;

        if (handTrackingResults && handTrackingResults.multiHandLandmarks) { // Check handTrackingResults itself
            handTrackingResults.multiHandLandmarks.forEach(landmarks => {
                const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
                FINGER_TIP_INDICES.forEach(index => {
                    const tip = landmarks[index];
                    if (!tip) return;

                    const dot = document.createElement('div');
                    dot.className = 'gesture-finger-dot';
                    Object.assign(dot.style, {
                        position: 'absolute',
                        left: '1px',
                        top: `${tip.y * gestureAreaHeight - 2}px`,
                        width: '4px',
                        height: '4px',
                        backgroundColor: 'green',
                        borderRadius: '50%',
                        zIndex: '2',
                        transform: 'translateX(-50%)'
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
            // For robust unsubscription, it's better to store the bound method references
            // if they were created like: this.eventBus.on('event', this.handler.bind(this));
            // Assuming simple function references were used for on():
            // This might require specific function references passed to off() if they were bound.
            // For simplicity, if these are direct method references, this might work,
            // but often explicit removal of the exact listener function is needed.
            // A common pattern is to store the bound listener:
            // this.boundHandsDetectedHandler = (landmarksData) => this.handleHandsChange(true, landmarksData);
            // this.eventBus.on('handsDetected', this.boundHandsDetectedHandler);
            // ... and then ...
            // this.eventBus.off('handsDetected', this.boundHandsDetectedHandler);
            // For now, let's assume the simple off() might work or this is called at app end.
            // The provided code doesn't show how .on was called in its constructor,
            // but the new code uses arrow functions directly, so their references are distinct.
            // For now, this .off call is more of a placeholder.
            // Use stored bound handlers for unsubscription
            if (this.boundHandleHandsDetected) {
                this.eventBus.off('handsDetected', this.boundHandleHandsDetected);
            }
            if (this.boundHandleHandsLost) {
                this.eventBus.off('handsLost', this.boundHandleHandsLost);
            }
            console.log("GestureUIManager events unsubscribed.");
        }
        if (this.currentAnimation) {
            this.currentAnimation.stop();
            window.TWEEN.remove(this.currentAnimation);
        }
        if (this.redLineElement) this.redLineElement.remove();
        this.clearFingerDots();
        console.log("GestureUIManager destroyed.");
    }
}

// Export the class
export default GestureUIManager;
