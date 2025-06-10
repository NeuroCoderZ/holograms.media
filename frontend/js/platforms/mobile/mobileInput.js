// frontend/js/platforms/mobile/mobileInput.js
import { state } from '../../core/init.js'; // For AudioContext (still needed for state checks potentially)
import { initializeMultimedia } from '../../core/mediaInitializer.js';
// import { someFunctionFromDomEvents } from '../../core/domEventHandlers.js' // If needed

export class MobileInput {
    constructor() {
        console.log("MobileInput instantiated.");
    }

    initialize() {
        console.log("MobileInput initializing...");
        this.setupTouchListeners();
        this.setupFirstInteractionListener(); // For AudioContext and multimedia initialization
        console.log("MobileInput initialized.");
    }

    setupTouchListeners() {
        // Gesture Area Click Listener (moved from domEventHandlers.js)
        // Note: Original listener was 'click'. For mobile, 'touchstart' or 'touchend' might be more appropriate
        // depending on desired behavior (e.g., preventing scroll, immediate feedback).
        // Using 'click' for now to maintain original behavior directly.
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.addEventListener('click', () => {
                // The actual logic for what happens on gesture area click (e.g., starting/stopping gesture recording)
                // should be handled by a dedicated gesture recording module or manager.
                // This input class is just responsible for detecting the input event.
                console.log('MobileInput: Gesture area clicked/tapped. Actual gesture logic handled elsewhere.');
                // Example: Dispatch a custom event that a gesture module listens for
                // window.dispatchEvent(new CustomEvent('gestureAreaActivated'));
            });
            console.log("MobileInput: Gesture area click listener set up.");
        } else {
            console.warn("MobileInput: Gesture area element not found.");
        }

        // Add other mobile-specific touch listeners here (e.g., for UI elements, swipe gestures)
    }

    setupFirstInteractionListener() {
        const events = ['touchstart', 'mousedown', 'keydown'];
        let interactionHappened = false;

        const handleInteraction = async () => {
            if (interactionHappened) return;
            interactionHappened = true;

            console.log("First user interaction detected by MobileInput. Initializing multimedia...");
            try {
                await initializeMultimedia();
                console.log("Multimedia initialization attempt finished via MobileInput.");
            } catch (error) {
                console.error("Error during initializeMultimedia call from MobileInput:", error);
            }

            events.forEach(event => document.body.removeEventListener(event, handleInteraction));
            console.log("First interaction listeners removed by MobileInput.");
        };

        events.forEach(event => document.body.addEventListener(event, handleInteraction, { once: true, capture: true }));
        console.log('First interaction listener for multimedia set up by MobileInput.');
    }
}
