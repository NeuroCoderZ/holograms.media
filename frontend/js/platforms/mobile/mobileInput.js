// frontend/js/platforms/mobile/mobileInput.js
// import { state } from '../../core/init.js'; // No longer needed, state is passed in constructor
import { initializeMultimedia } from '../../core/mediaInitializer.js';
// import { someFunctionFromDomEvents } from '../../core/domEventHandlers.js' // If needed
// Add these if not already present from other logic
import { initializePrompts } from '../../ai/prompts.js';
import { initializeVersionManager } from '../../ui/versionManager.js'; // Assuming initializeVersionManager is exported
import { setupChat } from '../../ai/chat.js';
import { initializeSpeechInput } from '../../audio/speechInput.js';
import { initializeTria } from '../../ai/tria.js';
import { initializeResizeHandler } from '../../core/resizeHandler.js';
import { initializeHammerGestures } from '../../core/gestures.js';
import { initializeRightPanel } from '../../panels/rightPanelManager.js';
import { initializeFileEditor } from '../../ui/fileEditor.js';

export class MobileInput {
    constructor(globalState) { // Or use 'state' as parameter name
        // console.log('MobileInput constructor');
        this.state = globalState; // Store the state
        this.firstInteractionDone = false; // Retained from original user prompt
        console.log("MobileInput instantiated."); // Combined log
        if (!this.state) {
            console.warn("MobileInput: State object not provided to constructor.");
        }
    }

    initialize() {
        console.log("MobileInput initializing...");
        this.setupTouchListeners();
        this.setupFirstInteractionListener(); // For AudioContext and multimedia initialization

        // console.log("MobileInput: Initializing secondary managers..."); // Optional: for debugging

        if (typeof initializePrompts === 'function') {
            initializePrompts(this.state);
            // console.log("MobileInput: Prompts initialized.");
        } else {
            console.warn("MobileInput: initializePrompts function not found/imported correctly.");
        }

        if (typeof initializeVersionManager === 'function') {
            initializeVersionManager(this.state);
            // console.log("MobileInput: VersionManager initialized.");
        } else {
            console.warn("MobileInput: initializeVersionManager function not found/imported correctly.");
        }

        if (typeof setupChat === 'function') {
            setupChat(this.state);
            // console.log("MobileInput: Chat setup.");
        } else {
            console.warn("MobileInput: setupChat function not found/imported correctly.");
        }

        if (typeof initializeSpeechInput === 'function') {
            initializeSpeechInput(this.state);
            // console.log("MobileInput: SpeechInput initialized.");
        } else {
            console.warn("MobileInput: initializeSpeechInput function not found/imported correctly.");
        }

        if (typeof initializeTria === 'function') {
            initializeTria(this.state);
            // console.log("MobileInput: Tria initialized.");
        } else {
            console.warn("MobileInput: initializeTria function not found/imported correctly.");
        }

        if (typeof initializeResizeHandler === 'function') {
            initializeResizeHandler(this.state);
            // console.log("MobileInput: ResizeHandler initialized.");
        } else {
            console.warn("MobileInput: initializeResizeHandler function not found/imported correctly.");
        }

        if (typeof initializeHammerGestures === 'function') {
            initializeHammerGestures(this.state);
            // console.log("MobileInput: HammerGestures initialized.");
        } else {
            console.warn("MobileInput: initializeHammerGestures function not found/imported correctly.");
        }

        if (typeof initializeRightPanel === 'function') {
            initializeRightPanel(this.state);
            // console.log("MobileInput: RightPanelManager initialized.");
        } else {
            console.warn("MobileInput: initializeRightPanel function not found/imported correctly.");
        }

        if (typeof initializeFileEditor === 'function') {
            initializeFileEditor(this.state);
            // console.log("MobileInput: FileEditor initialized.");
        } else {
            console.warn("MobileInput: initializeFileEditor function not found/imported correctly.");
        }
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
