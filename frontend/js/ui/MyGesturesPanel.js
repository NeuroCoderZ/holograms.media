// Manages the 'My Gestures' button interaction, typically in a left panel or main UI.

// import EventBus from '../core/eventBus';

class MyGesturesPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.myGesturesButton = document.getElementById('myGesturesButton'); // Assume this ID

        if (!this.myGesturesButton) {
            console.warn("MyGesturesPanel: #myGesturesButton not found. Functionality disabled.");
            return;
        }
        if (!this.eventBus) {
            console.warn("MyGesturesPanel: EventBus not provided. Cannot signal mode change.");
            return;
        }

        this.setupEventListeners();
        console.log("MyGesturesPanel initialized.");
    }

    setupEventListeners() {
        this.myGesturesButton.addEventListener('click', this.handleShowMyGestures.bind(this));
    }

    handleShowMyGestures() {
        console.log("MyGesturesPanel: 'My Gestures' button clicked. Requesting 'gesturesList' mode for right panel.");
        // Signal RightPanelManager to change its mode to display the gestures list.
        // RightPanelManager needs to be updated to handle this new mode.
        this.eventBus.emit('requestRightPanelMode', { mode: 'gesturesList' });
    }

    destroy() {
        if (this.myGesturesButton) {
            this.myGesturesButton.removeEventListener('click', this.handleShowMyGestures.bind(this));
        }
        console.log("MyGesturesPanel destroyed.");
    }
}

// Export the class
export default MyGesturesPanel;
